// Multi-Tier Code Execution Engine
// Tier 1: High-performance local subprocess execution (Windows & POSIX)
// Tier 2: Piston API cloud sandbox (reliable, free, purpose-built for code execution)

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export type JudgeStatus =
  | "Accepted"
  | "Wrong Answer"
  | "Compilation Error"
  | "Runtime Error"
  | "Time Limit Exceeded"
  | "Memory Limit Exceeded"
  | "Internal Error";

export interface ExecutionResult {
  status: JudgeStatus;
  passed: boolean;
  stdout: string;
  stderr: string;
  execTimeMs: number;
  message?: string;
}

const RUN_TMP_BASE = join(tmpdir(), "wcc-judge-runs");
try {
  if (!existsSync(RUN_TMP_BASE)) mkdirSync(RUN_TMP_BASE, { recursive: true });
} catch {}

export function normalizeLineEndings(s: string): string {
  return (s || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

export function stripTrailingWhitespace(s: string): string {
  return normalizeLineEndings(s)
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trimEnd();
}

export function checkAnswer(actual: string, expected: string): boolean {
  const normActual = stripTrailingWhitespace(actual);
  const normExpected = stripTrailingWhitespace(expected);
  return normActual === normExpected;
}

interface RunOpts {
  cwd: string;
  stdin: string;
  timeLimitMs: number;
}

// ---------------------------------------------------------------------------
// Core subprocess runner with accurate binary detection
// ---------------------------------------------------------------------------
function runSubprocess(
  cmd: string,
  args: string[],
  opts: RunOpts
): Promise<{ stdout: string; stderr: string; exitCode: number | null; timedOut: boolean; execTimeMs: number; error?: string; commandNotFound?: boolean }> {
  return new Promise((resolve) => {
    const start = Date.now();
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let finished = false;

    let proc: any;
    try {
      proc = spawn(cmd, args, {
        cwd: opts.cwd,
        shell: false,
        stdio: ["pipe", "pipe", "pipe"],
        env: {
          ...process.env,
          PYTHONDONTWRITEBYTECODE: "1",
          PYTHONUNBUFFERED: "1",
        },
      });
    } catch (err: any) {
      return resolve({
        stdout: "",
        stderr: err?.message || "Failed to spawn process",
        exitCode: -1,
        timedOut: false,
        execTimeMs: 0,
        error: err?.message,
        commandNotFound: true,
      });
    }

    const timer = setTimeout(() => {
      timedOut = true;
      try {
        proc.kill("SIGKILL");
      } catch {}
    }, opts.timeLimitMs + 1000);

    proc.stdout?.on("data", (chunk: Buffer) => {
      if (stdout.length < 100000) stdout += chunk.toString();
    });

    proc.stderr?.on("data", (chunk: Buffer) => {
      if (stderr.length < 100000) stderr += chunk.toString();
    });

    proc.on("error", (err: any) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      const isNotFound = /ENOENT|not found/i.test(err.message) || (err as any).code === "ENOENT";
      resolve({
        stdout,
        stderr: stderr || err.message,
        exitCode: -1,
        timedOut: false,
        execTimeMs: Date.now() - start,
        error: err.message,
        commandNotFound: isNotFound,
      });
    });

    proc.on("close", (code: number | null) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      const execTimeMs = Date.now() - start;
      const notFoundPattern = /is not recognized as an internal or external command|cannot find the (file|path)|not found|The system cannot find the file specified/i;
      const isCommandNotFound = notFoundPattern.test(stderr) && (code === 1 || code === 9009 || code === -4058);
      resolve({
        stdout,
        stderr,
        exitCode: code,
        timedOut: timedOut || execTimeMs > opts.timeLimitMs,
        execTimeMs,
        commandNotFound: isCommandNotFound,
      });
    });

    if (opts.stdin) {
      try {
        proc.stdin?.write(opts.stdin);
      } catch {}
    }
    try {
      proc.stdin?.end();
    } catch {}
  });
}

// ---------------------------------------------------------------------------
// Cloud Sandbox Runner (Judge0 CE public API with automated fallback)
// ---------------------------------------------------------------------------
const JUDGE0_LANGUAGES: Record<string, number> = {
  python:     71, // Python (3.8.1)
  py:         71,
  python3:    71,
  javascript: 63, // JavaScript (Node.js 12.14.0)
  js:         63,
  node:       63,
  cpp:        54, // C++ (GCC 9.2.0)
  "c++":      54,
  c:          50, // C (GCC 9.2.0)
  java:       62, // Java (OpenJDK 13.0.1)
};

async function executeViaCloudSandbox(
  language: string,
  code: string,
  stdin: string,
  timeLimitMs: number
): Promise<ExecutionResult> {
  const langKey = language.toLowerCase();
  const langId = JUDGE0_LANGUAGES[langKey];
  if (!langId) {
    return {
      status: "Internal Error",
      passed: false,
      stdout: "",
      stderr: `Language "${language}" is not supported by the runner.`,
      execTimeMs: 0,
      message: `Language "${language}" is not supported.`,
    };
  }

  // Adjust Java class name if submitted as public class other than Main
  let sourceCode = code;
  if (langKey === "java") {
    sourceCode = sourceCode.replace(/public\s+class\s+\w+/, "public class Main");
  }

  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Math.max(timeLimitMs + 10000, 15000));

    const res = await fetch("https://ce.judge0.com/submissions?wait=true", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        source_code: sourceCode,
        language_id: langId,
        stdin: stdin || "",
        cpu_time_limit: Math.max(Math.round(timeLimitMs / 1000), 1),
      }),
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      return {
        status: "Internal Error",
        passed: false,
        stdout: "",
        stderr: `Cloud runner HTTP ${res.status}: ${errBody.slice(0, 500)}`,
        execTimeMs: Date.now() - start,
        message: "Cloud execution service temporarily unavailable. Please try again.",
      };
    }

    const data = await res.json();
    const execTimeMs = Date.now() - start;
    const statusId = data.status?.id;

    // Status IDs in Judge0:
    // 3 = Accepted
    // 4 = Wrong Answer
    // 5 = Time Limit Exceeded
    // 6 = Compilation Error
    // 7-12 = Runtime Error
    // 13 = Internal Error
    // 14 = Exec Format Error

    if (statusId === 6) {
      return {
        status: "Compilation Error",
        passed: false,
        stdout: data.stdout || "",
        stderr: (data.compile_output || data.stderr || "").slice(0, 3000),
        execTimeMs,
        message: "Compilation failed.",
      };
    }

    if (statusId === 5) {
      return {
        status: "Time Limit Exceeded",
        passed: false,
        stdout: data.stdout || "",
        stderr: data.stderr || "",
        execTimeMs,
        message: `Execution exceeded time limit of ${timeLimitMs}ms.`,
      };
    }

    if (statusId && statusId >= 7 && statusId <= 12) {
      return {
        status: "Runtime Error",
        passed: false,
        stdout: data.stdout || "",
        stderr: (data.stderr || data.message || "").slice(0, 3000),
        execTimeMs,
        message: "Program exited with runtime error.",
      };
    }

    return {
      status: "Accepted",
      passed: true,
      stdout: data.stdout || "",
      stderr: data.stderr || "",
      execTimeMs,
    };
  } catch (err: any) {
    const isAbort = err?.name === "AbortError";
    return {
      status: isAbort ? "Time Limit Exceeded" : "Internal Error",
      passed: false,
      stdout: "",
      stderr: err?.message || String(err),
      execTimeMs: Date.now() - start,
      message: isAbort
        ? `Execution exceeded time limit of ${timeLimitMs}ms.`
        : "Execution timed out or runner service unreachable. Please try again.",
    };
  }
}

function getFilename(lang: string): string {
  const l = lang.toLowerCase();
  if (["python", "py", "python3"].includes(l)) return "solution.py";
  if (["javascript", "js", "node"].includes(l)) return "solution.js";
  if (["cpp", "c++"].includes(l)) return "solution.cpp";
  if (l === "c") return "solution.c";
  if (l === "java") return "Solution.java";
  return "solution.txt";
}

// ---------------------------------------------------------------------------
// Local Python Execution (fixed command detection)
// ---------------------------------------------------------------------------
async function executeLocalPython(code: string, stdin: string, timeLimitMs: number): Promise<ExecutionResult> {
  const runId = `py-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const runDir = join(RUN_TMP_BASE, runId);
  try {
    mkdirSync(runDir, { recursive: true });
    const srcPath = join(runDir, "solution.py");
    writeFileSync(srcPath, code, "utf-8");

    const pyCmds = process.platform === "win32"
      ? [
          "python",
          "C:\\Users\\Acer\\AppData\\Local\\Programs\\Python\\Python314\\python.exe",
          "py",
          "python3",
        ]
      : ["python3", "python"];

    let res: any = null;
    for (const cmd of pyCmds) {
      const [bin, ...args] = cmd.split(" ");
      res = await runSubprocess(bin, [...args, srcPath], {
        cwd: runDir,
        stdin,
        timeLimitMs,
      });
      // Only break if the command was actually found and executed
      if (!res.commandNotFound && !res.error) break;
    }

    if (!res || res.commandNotFound || res.error) {
      return {
        status: "Internal Error",
        passed: false,
        stdout: "",
        stderr: res?.stderr || res?.error || "Local Python binary not found",
        execTimeMs: res?.execTimeMs || 0,
      };
    }

    if (res.timedOut) {
      return {
        status: "Time Limit Exceeded",
        passed: false,
        stdout: res.stdout,
        stderr: res.stderr,
        execTimeMs: res.execTimeMs,
        message: `Execution exceeded time limit of ${timeLimitMs}ms.`,
      };
    }

    if (res.exitCode !== 0) {
      const isSyntaxErr = /SyntaxError|IndentationError|TabError/.test(res.stderr);
      return {
        status: isSyntaxErr ? "Compilation Error" : "Runtime Error",
        passed: false,
        stdout: res.stdout,
        stderr: res.stderr.slice(0, 3000),
        execTimeMs: res.execTimeMs,
        message: isSyntaxErr ? "Syntax/Indentation Error in Python code." : "Program exited with non-zero exit code.",
      };
    }

    return {
      status: "Accepted",
      passed: true,
      stdout: res.stdout,
      stderr: res.stderr,
      execTimeMs: res.execTimeMs,
    };
  } catch (err: any) {
    return {
      status: "Internal Error",
      passed: false,
      stdout: "",
      stderr: err?.message || String(err),
      execTimeMs: 0,
    };
  } finally {
    try {
      rmSync(runDir, { recursive: true, force: true });
    } catch {}
  }
}

// ---------------------------------------------------------------------------
// Local JavaScript Execution
// ---------------------------------------------------------------------------
async function executeLocalJavaScript(code: string, stdin: string, timeLimitMs: number): Promise<ExecutionResult> {
  const runId = `js-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const runDir = join(RUN_TMP_BASE, runId);
  try {
    mkdirSync(runDir, { recursive: true });
    const srcPath = join(runDir, "solution.js");
    writeFileSync(srcPath, code, "utf-8");

    const res = await runSubprocess("node", [srcPath], {
      cwd: runDir,
      stdin,
      timeLimitMs,
    });

    if (res.commandNotFound || res.error) {
      return {
        status: "Internal Error",
        passed: false,
        stdout: "",
        stderr: res.error || "Node.js binary not found",
        execTimeMs: res.execTimeMs,
      };
    }

    if (res.timedOut) {
      return {
        status: "Time Limit Exceeded",
        passed: false,
        stdout: res.stdout,
        stderr: res.stderr,
        execTimeMs: res.execTimeMs,
        message: `Execution exceeded time limit of ${timeLimitMs}ms.`,
      };
    }

    if (res.exitCode !== 0) {
      const isSyntaxErr = /SyntaxError|Unexpected token|Unexpected end/.test(res.stderr);
      return {
        status: isSyntaxErr ? "Compilation Error" : "Runtime Error",
        passed: false,
        stdout: res.stdout,
        stderr: res.stderr.slice(0, 3000),
        execTimeMs: res.execTimeMs,
        message: isSyntaxErr ? "Syntax Error in JavaScript code." : "Runtime Error.",
      };
    }

    return {
      status: "Accepted",
      passed: true,
      stdout: res.stdout,
      stderr: res.stderr,
      execTimeMs: res.execTimeMs,
    };
  } catch (err: any) {
    return {
      status: "Internal Error",
      passed: false,
      stdout: "",
      stderr: err?.message || String(err),
      execTimeMs: 0,
    };
  } finally {
    try {
      rmSync(runDir, { recursive: true, force: true });
    } catch {}
  }
}

// ---------------------------------------------------------------------------
// Local C++ Execution (compile + run)
// ---------------------------------------------------------------------------
async function executeLocalCpp(code: string, stdin: string, timeLimitMs: number): Promise<ExecutionResult> {
  const runId = `cpp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const runDir = join(RUN_TMP_BASE, runId);
  try {
    mkdirSync(runDir, { recursive: true });
    const srcPath = join(runDir, "solution.cpp");
    const outPath = join(runDir, process.platform === "win32" ? "solution.exe" : "solution");
    writeFileSync(srcPath, code, "utf-8");

    // Compile
    const compilers = process.platform === "win32" ? ["g++", "cl"] : ["g++", "clang++"];
    let compileRes: any = null;
    for (const compiler of compilers) {
      const args = compiler === "cl"
        ? ["/EHsc", "/Fe:" + outPath, srcPath]
        : ["-o", outPath, srcPath, "-std=c++17"];
      compileRes = await runSubprocess(compiler, args, { cwd: runDir, stdin: "", timeLimitMs: 10000 });
      if (!compileRes.commandNotFound && !compileRes.error) break;
    }

    if (!compileRes || compileRes.commandNotFound || compileRes.error) {
      // No local C++ compiler — fall through to Piston
      return {
        status: "Internal Error",
        passed: false,
        stdout: "",
        stderr: "Local C++ compiler not found",
        execTimeMs: 0,
      };
    }

    if (compileRes.exitCode !== 0) {
      return {
        status: "Compilation Error",
        passed: false,
        stdout: "",
        stderr: (compileRes.stderr || compileRes.stdout || "").slice(0, 3000),
        execTimeMs: compileRes.execTimeMs,
        message: "Compilation failed.",
      };
    }

    // Run
    const res = await runSubprocess(outPath, [], { cwd: runDir, stdin, timeLimitMs });

    if (res.timedOut) {
      return {
        status: "Time Limit Exceeded",
        passed: false,
        stdout: res.stdout,
        stderr: res.stderr,
        execTimeMs: res.execTimeMs,
        message: `Execution exceeded time limit of ${timeLimitMs}ms.`,
      };
    }

    if (res.exitCode !== 0) {
      return {
        status: "Runtime Error",
        passed: false,
        stdout: res.stdout,
        stderr: res.stderr.slice(0, 3000),
        execTimeMs: res.execTimeMs,
        message: "Program exited with non-zero exit code.",
      };
    }

    return {
      status: "Accepted",
      passed: true,
      stdout: res.stdout,
      stderr: res.stderr,
      execTimeMs: compileRes.execTimeMs + res.execTimeMs,
    };
  } catch (err: any) {
    return {
      status: "Internal Error",
      passed: false,
      stdout: "",
      stderr: err?.message || String(err),
      execTimeMs: 0,
    };
  } finally {
    try {
      rmSync(runDir, { recursive: true, force: true });
    } catch {}
  }
}

// ---------------------------------------------------------------------------
// Local Java Execution (compile + run)
// ---------------------------------------------------------------------------
async function executeLocalJava(code: string, stdin: string, timeLimitMs: number): Promise<ExecutionResult> {
  const runId = `java-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const runDir = join(RUN_TMP_BASE, runId);
  try {
    mkdirSync(runDir, { recursive: true });
    // Extract class name from code or default to Solution
    const classMatch = code.match(/public\s+class\s+(\w+)/);
    const className = classMatch ? classMatch[1] : "Solution";
    const srcPath = join(runDir, `${className}.java`);
    writeFileSync(srcPath, code, "utf-8");

    // Compile
    const compileRes = await runSubprocess("javac", [srcPath], { cwd: runDir, stdin: "", timeLimitMs: 15000 });

    if (compileRes.commandNotFound || compileRes.error) {
      return {
        status: "Internal Error",
        passed: false,
        stdout: "",
        stderr: "Local Java compiler (javac) not found",
        execTimeMs: 0,
      };
    }

    if (compileRes.exitCode !== 0) {
      return {
        status: "Compilation Error",
        passed: false,
        stdout: "",
        stderr: (compileRes.stderr || compileRes.stdout || "").slice(0, 3000),
        execTimeMs: compileRes.execTimeMs,
        message: "Compilation failed.",
      };
    }

    // Run
    const res = await runSubprocess("java", ["-cp", runDir, className], { cwd: runDir, stdin, timeLimitMs });

    if (res.commandNotFound || res.error) {
      return {
        status: "Internal Error",
        passed: false,
        stdout: "",
        stderr: "Local Java runtime (java) not found",
        execTimeMs: 0,
      };
    }

    if (res.timedOut) {
      return {
        status: "Time Limit Exceeded",
        passed: false,
        stdout: res.stdout,
        stderr: res.stderr,
        execTimeMs: res.execTimeMs,
        message: `Execution exceeded time limit of ${timeLimitMs}ms.`,
      };
    }

    if (res.exitCode !== 0) {
      return {
        status: "Runtime Error",
        passed: false,
        stdout: res.stdout,
        stderr: res.stderr.slice(0, 3000),
        execTimeMs: res.execTimeMs,
        message: "Program exited with non-zero exit code.",
      };
    }

    return {
      status: "Accepted",
      passed: true,
      stdout: res.stdout,
      stderr: res.stderr,
      execTimeMs: compileRes.execTimeMs + res.execTimeMs,
    };
  } catch (err: any) {
    return {
      status: "Internal Error",
      passed: false,
      stdout: "",
      stderr: err?.message || String(err),
      execTimeMs: 0,
    };
  } finally {
    try {
      rmSync(runDir, { recursive: true, force: true });
    } catch {}
  }
}

// ---------------------------------------------------------------------------
// Master execution entry point: Local first, Piston cloud fallback
// ---------------------------------------------------------------------------
export async function executeCode(
  language: string,
  code: string,
  stdin: string,
  expectedOutput?: string,
  timeLimitMs = 2500,
  memoryLimitMb = 256
): Promise<ExecutionResult> {
  const lang = (language || "").toLowerCase().trim();
  const limit = Math.min(Math.max(timeLimitMs || 2500, 200), 15000);

  let rawResult: ExecutionResult;

  // 1. Try local execution first for ultra-fast response
  if (["python", "py", "python3"].includes(lang)) {
    rawResult = await executeLocalPython(code, stdin, limit);
  } else if (["javascript", "js", "node"].includes(lang)) {
    rawResult = await executeLocalJavaScript(code, stdin, limit);
  } else if (["cpp", "c++"].includes(lang)) {
    rawResult = await executeLocalCpp(code, stdin, limit);
  } else if (lang === "c") {
    rawResult = await executeLocalCpp(code, stdin, limit); // C uses same flow as C++
  } else if (lang === "java") {
    rawResult = await executeLocalJava(code, stdin, limit);
  } else {
    // Unknown language: try Cloud sandbox directly
    rawResult = await executeViaCloudSandbox(lang, code, stdin, limit);
  }

  // 2. If local execution encountered Internal Error (missing compiler/runtime), fallback to Cloud sandbox
  if (rawResult.status === "Internal Error") {
    rawResult = await executeViaCloudSandbox(lang, code, stdin, limit);
  }

  // 3. If executed successfully, compare output against expected
  if (rawResult.status === "Accepted" && expectedOutput !== undefined) {
    const isMatch = checkAnswer(rawResult.stdout, expectedOutput);
    if (!isMatch) {
      return {
        ...rawResult,
        status: "Wrong Answer",
        passed: false,
        message: "Your output did not match the expected output.",
      };
    }
  }

  return rawResult;
}
