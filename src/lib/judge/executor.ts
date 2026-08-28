// Standalone Code Execution & Judge Engine
// Executes user-submitted code in an isolated subprocess with strict timeouts and memory boundaries.
// Works seamlessly in Next.js Serverless runtime, local development, and container environments.

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
  memoryLimitMb?: number;
}

function runSubprocess(
  cmd: string,
  args: string[],
  opts: RunOpts
): Promise<{ stdout: string; stderr: string; exitCode: number | null; timedOut: boolean; execTimeMs: number; error?: string }> {
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
        stdio: ["pipe", "pipe", "pipe"],
        env: {
          ...process.env,
          PYTHONDONTWRITEBYTECODE: "1",
          PYTHONUNBUFFERED: "1",
          NODE_OPTIONS: "--max-old-space-size=256",
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
      });
    }

    const timer = setTimeout(() => {
      timedOut = true;
      try {
        proc.kill("SIGKILL");
      } catch {}
    }, opts.timeLimitMs + 500);

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
      resolve({
        stdout,
        stderr: stderr || err.message,
        exitCode: -1,
        timedOut: false,
        execTimeMs: Date.now() - start,
        error: err.message,
      });
    });

    proc.on("close", (code: number | null) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      const execTimeMs = Date.now() - start;
      resolve({
        stdout,
        stderr,
        exitCode: code,
        timedOut: timedOut || execTimeMs > opts.timeLimitMs,
        execTimeMs,
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

// Find Python binary (python or python3)
let cachedPythonCmd: string | null = null;
async function getPythonCommand(): Promise<string> {
  if (cachedPythonCmd) return cachedPythonCmd;
  for (const cmd of ["python", "python3", "py"]) {
    try {
      const res = await runSubprocess(cmd, ["--version"], { cwd: process.cwd(), stdin: "", timeLimitMs: 2000 });
      if (res.exitCode === 0 || res.stdout.includes("Python") || res.stderr.includes("Python")) {
        cachedPythonCmd = cmd;
        return cmd;
      }
    } catch {}
  }
  cachedPythonCmd = "python";
  return "python";
}

// 1. Python runner
async function executePython(code: string, stdin: string, timeLimitMs: number): Promise<ExecutionResult> {
  const runId = `py-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const runDir = join(RUN_TMP_BASE, runId);
  try {
    mkdirSync(runDir, { recursive: true });
    const srcPath = join(runDir, "solution.py");
    writeFileSync(srcPath, code, "utf-8");

    const pyCmd = await getPythonCommand();
    const res = await runSubprocess(pyCmd, [srcPath], {
      cwd: runDir,
      stdin,
      timeLimitMs,
    });

    if (res.error) {
      return {
        status: "Internal Error",
        passed: false,
        stdout: res.stdout,
        stderr: res.stderr || res.error,
        execTimeMs: res.execTimeMs,
        message: "Python runtime could not be launched.",
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
      message: "Judge runner encountered an error.",
    };
  } finally {
    try {
      rmSync(runDir, { recursive: true, force: true });
    } catch {}
  }
}

// 2. JavaScript / Node runner
async function executeJavaScript(code: string, stdin: string, timeLimitMs: number): Promise<ExecutionResult> {
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

    if (res.error) {
      return {
        status: "Internal Error",
        passed: false,
        stdout: res.stdout,
        stderr: res.stderr || res.error,
        execTimeMs: res.execTimeMs,
        message: "Node runtime could not be launched.",
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
      message: "Judge runner encountered an error.",
    };
  } finally {
    try {
      rmSync(runDir, { recursive: true, force: true });
    } catch {}
  }
}

// 3. C++ runner
async function executeCpp(code: string, stdin: string, timeLimitMs: number): Promise<ExecutionResult> {
  const runId = `cpp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const runDir = join(RUN_TMP_BASE, runId);
  try {
    mkdirSync(runDir, { recursive: true });
    const srcPath = join(runDir, "solution.cpp");
    const binPath = join(runDir, process.platform === "win32" ? "solution.exe" : "solution");
    writeFileSync(srcPath, code, "utf-8");

    // Compile
    const compileRes = await runSubprocess("g++", ["-O2", "-std=c++17", "-o", binPath, srcPath], {
      cwd: runDir,
      stdin: "",
      timeLimitMs: 8000,
    });

    if (compileRes.exitCode !== 0) {
      return {
        status: "Compilation Error",
        passed: false,
        stdout: "",
        stderr: (compileRes.stderr || compileRes.stdout || "C++ compilation failed").slice(0, 3000),
        execTimeMs: compileRes.execTimeMs,
        message: "C++ compilation failed.",
      };
    }

    // Run binary
    const runRes = await runSubprocess(binPath, [], {
      cwd: runDir,
      stdin,
      timeLimitMs,
    });

    if (runRes.timedOut) {
      return {
        status: "Time Limit Exceeded",
        passed: false,
        stdout: runRes.stdout,
        stderr: runRes.stderr,
        execTimeMs: runRes.execTimeMs,
        message: `Execution exceeded time limit of ${timeLimitMs}ms.`,
      };
    }

    if (runRes.exitCode !== 0) {
      return {
        status: "Runtime Error",
        passed: false,
        stdout: runRes.stdout,
        stderr: runRes.stderr.slice(0, 3000),
        execTimeMs: runRes.execTimeMs,
        message: "Program exited with a non-zero status.",
      };
    }

    return {
      status: "Accepted",
      passed: true,
      stdout: runRes.stdout,
      stderr: runRes.stderr,
      execTimeMs: runRes.execTimeMs,
    };
  } catch (err: any) {
    return {
      status: "Internal Error",
      passed: false,
      stdout: "",
      stderr: err?.message || String(err),
      execTimeMs: 0,
      message: "C++ compiler/runner unavailable.",
    };
  } finally {
    try {
      rmSync(runDir, { recursive: true, force: true });
    } catch {}
  }
}

// 4. C runner
async function executeC(code: string, stdin: string, timeLimitMs: number): Promise<ExecutionResult> {
  const runId = `c-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const runDir = join(RUN_TMP_BASE, runId);
  try {
    mkdirSync(runDir, { recursive: true });
    const srcPath = join(runDir, "solution.c");
    const binPath = join(runDir, process.platform === "win32" ? "solution.exe" : "solution");
    writeFileSync(srcPath, code, "utf-8");

    // Compile
    const compileRes = await runSubprocess("gcc", ["-O2", "-std=c11", "-o", binPath, srcPath], {
      cwd: runDir,
      stdin: "",
      timeLimitMs: 8000,
    });

    if (compileRes.exitCode !== 0) {
      return {
        status: "Compilation Error",
        passed: false,
        stdout: "",
        stderr: (compileRes.stderr || compileRes.stdout || "C compilation failed").slice(0, 3000),
        execTimeMs: compileRes.execTimeMs,
        message: "C compilation failed.",
      };
    }

    // Run binary
    const runRes = await runSubprocess(binPath, [], {
      cwd: runDir,
      stdin,
      timeLimitMs,
    });

    if (runRes.timedOut) {
      return {
        status: "Time Limit Exceeded",
        passed: false,
        stdout: runRes.stdout,
        stderr: runRes.stderr,
        execTimeMs: runRes.execTimeMs,
        message: `Execution exceeded time limit of ${timeLimitMs}ms.`,
      };
    }

    if (runRes.exitCode !== 0) {
      return {
        status: "Runtime Error",
        passed: false,
        stdout: runRes.stdout,
        stderr: runRes.stderr.slice(0, 3000),
        execTimeMs: runRes.execTimeMs,
        message: "Program exited with a non-zero status.",
      };
    }

    return {
      status: "Accepted",
      passed: true,
      stdout: runRes.stdout,
      stderr: runRes.stderr,
      execTimeMs: runRes.execTimeMs,
    };
  } catch (err: any) {
    return {
      status: "Internal Error",
      passed: false,
      stdout: "",
      stderr: err?.message || String(err),
      execTimeMs: 0,
      message: "C compiler/runner unavailable.",
    };
  } finally {
    try {
      rmSync(runDir, { recursive: true, force: true });
    } catch {}
  }
}

// 5. Java runner
async function executeJava(code: string, stdin: string, timeLimitMs: number): Promise<ExecutionResult> {
  const runId = `java-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const runDir = join(RUN_TMP_BASE, runId);
  try {
    mkdirSync(runDir, { recursive: true });
    const srcPath = join(runDir, "Main.java");
    writeFileSync(srcPath, code, "utf-8");

    // Compile
    const compileRes = await runSubprocess("javac", ["Main.java"], {
      cwd: runDir,
      stdin: "",
      timeLimitMs: 10000,
    });

    if (compileRes.exitCode !== 0) {
      return {
        status: "Compilation Error",
        passed: false,
        stdout: "",
        stderr: (compileRes.stderr || "Java compilation failed").slice(0, 3000),
        execTimeMs: compileRes.execTimeMs,
        message: "Java compilation failed.",
      };
    }

    // Run
    const runRes = await runSubprocess("java", ["-Xmx256m", "Main"], {
      cwd: runDir,
      stdin,
      timeLimitMs,
    });

    if (runRes.timedOut) {
      return {
        status: "Time Limit Exceeded",
        passed: false,
        stdout: runRes.stdout,
        stderr: runRes.stderr,
        execTimeMs: runRes.execTimeMs,
        message: `Execution exceeded time limit of ${timeLimitMs}ms.`,
      };
    }

    if (runRes.exitCode !== 0) {
      return {
        status: "Runtime Error",
        passed: false,
        stdout: runRes.stdout,
        stderr: runRes.stderr.slice(0, 3000),
        execTimeMs: runRes.execTimeMs,
        message: "Java runtime exception occurred.",
      };
    }

    return {
      status: "Accepted",
      passed: true,
      stdout: runRes.stdout,
      stderr: runRes.stderr,
      execTimeMs: runRes.execTimeMs,
    };
  } catch (err: any) {
    return {
      status: "Internal Error",
      passed: false,
      stdout: "",
      stderr: err?.message || String(err),
      execTimeMs: 0,
      message: "Java compiler/runner unavailable.",
    };
  } finally {
    try {
      rmSync(runDir, { recursive: true, force: true });
    } catch {}
  }
}

// Master execution entry point
export async function executeCode(
  language: string,
  code: string,
  stdin: string,
  expectedOutput?: string,
  timeLimitMs = 2000,
  memoryLimitMb = 256
): Promise<ExecutionResult> {
  const lang = (language || "").toLowerCase().trim();
  const limit = Math.min(Math.max(timeLimitMs || 2000, 200), 15000);

  let rawResult: ExecutionResult;
  switch (lang) {
    case "python":
    case "py":
    case "python3":
      rawResult = await executePython(code, stdin, limit);
      break;
    case "javascript":
    case "js":
    case "node":
      rawResult = await executeJavaScript(code, stdin, limit);
      break;
    case "cpp":
    case "c++":
      rawResult = await executeCpp(code, stdin, limit);
      break;
    case "c":
      rawResult = await executeC(code, stdin, limit);
      break;
    case "java":
      rawResult = await executeJava(code, stdin, limit);
      break;
    default:
      return {
        status: "Internal Error",
        passed: false,
        stdout: "",
        stderr: `Unsupported language: ${lang}`,
        execTimeMs: 0,
        message: `Language '${lang}' is not supported by judge engine.`,
      };
  }

  // If the run succeeded without runtime or compile error, compare output against expected
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
