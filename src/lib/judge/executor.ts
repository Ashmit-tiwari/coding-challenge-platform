// Multi-Tier Standalone & Cloud Code Execution Engine
// Tier 1: High-performance local subprocess execution (Windows & POSIX)
// Tier 2: Cloud sandbox runner (Wandbox API) for serverless environments (Vercel) where local compilers are absent

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
        shell: process.platform === "win32",
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

// Wandbox cloud runner for serverless environments
const WANDBOX_COMPILERS: Record<string, string> = {
  python: "cpython-3.12.7",
  py: "cpython-3.12.7",
  python3: "cpython-3.12.7",
  javascript: "nodejs-20.17.0",
  js: "nodejs-20.17.0",
  cpp: "gcc-13.2.0",
  "c++": "gcc-13.2.0",
  c: "gcc-13.2.0",
};

async function executeViaCloudSandbox(
  language: string,
  code: string,
  stdin: string,
  timeLimitMs: number
): Promise<ExecutionResult> {
  const compiler = WANDBOX_COMPILERS[language.toLowerCase()];
  if (!compiler) {
    return {
      status: "Internal Error",
      passed: false,
      stdout: "",
      stderr: `Unsupported cloud compiler for language ${language}`,
      execTimeMs: 0,
      message: `Unsupported language ${language}`,
    };
  }

  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeLimitMs + 8000);

    const res = await fetch("https://wandbox.org/api/compile.json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        compiler,
        code,
        stdin,
      }),
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return {
        status: "Internal Error",
        passed: false,
        stdout: "",
        stderr: `Cloud runner HTTP ${res.status}`,
        execTimeMs: Date.now() - start,
        message: "Cloud execution service temporarily unavailable.",
      };
    }

    const data = await res.json();
    const execTimeMs = Date.now() - start;
    const stdout = data.program_output || data.program_message || "";
    const stderr = data.compiler_error || data.program_error || data.compiler_message || "";
    const statusVal = String(data.status || "0");

    if (data.compiler_error || (data.compiler_message && statusVal !== "0")) {
      return {
        status: "Compilation Error",
        passed: false,
        stdout,
        stderr: stderr.slice(0, 3000),
        execTimeMs,
        message: "Compilation error.",
      };
    }

    if (statusVal !== "0") {
      const isSyntaxErr = /SyntaxError|IndentationError|Unexpected token/.test(stderr);
      return {
        status: isSyntaxErr ? "Compilation Error" : "Runtime Error",
        passed: false,
        stdout,
        stderr: stderr.slice(0, 3000),
        execTimeMs,
        message: isSyntaxErr ? "Syntax error." : "Program exited with non-zero exit code.",
      };
    }

    return {
      status: "Accepted",
      passed: true,
      stdout,
      stderr,
      execTimeMs,
    };
  } catch (err: any) {
    return {
      status: "Internal Error",
      passed: false,
      stdout: "",
      stderr: err?.message || String(err),
      execTimeMs: Date.now() - start,
      message: "Execution timed out or cloud service unreachable.",
    };
  }
}

// Local Python Execution
async function executeLocalPython(code: string, stdin: string, timeLimitMs: number): Promise<ExecutionResult> {
  const runId = `py-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const runDir = join(RUN_TMP_BASE, runId);
  try {
    mkdirSync(runDir, { recursive: true });
    const srcPath = join(runDir, "solution.py");
    writeFileSync(srcPath, code, "utf-8");

    // Try common python command invocations
    let res: any = null;
    const pyCmds = process.platform === "win32"
      ? ["py -3", "py", "python", "python3", "C:\\Users\\Acer\\AppData\\Local\\Programs\\Python\\Python314\\python.exe"]
      : ["python3", "python"];

    for (const cmd of pyCmds) {
      const [bin, ...args] = cmd.split(" ");
      res = await runSubprocess(bin, [...args, srcPath], {
        cwd: runDir,
        stdin,
        timeLimitMs,
      });
      if (!res.error && res.exitCode !== -1) break;
    }

    if (!res || res.error) {
      return {
        status: "Internal Error",
        passed: false,
        stdout: "",
        stderr: res?.error || "Local Python binary not found",
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

// Local JavaScript Execution
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

    if (res.error) {
      return {
        status: "Internal Error",
        passed: false,
        stdout: "",
        stderr: res.error,
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

// Master execution entry point: Local with automated Cloud fallback
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

  // 1. Try local execution first for ultra-fast response (<50ms)
  if (["python", "py", "python3"].includes(lang)) {
    rawResult = await executeLocalPython(code, stdin, limit);
  } else if (["javascript", "js", "node"].includes(lang)) {
    rawResult = await executeLocalJavaScript(code, stdin, limit);
  } else {
    // C++, C, Java or others: fallback to cloud sandbox
    rawResult = await executeViaCloudSandbox(lang, code, stdin, limit);
  }

  // 2. If local execution encountered Internal Error (e.g. missing compiler in environment/Vercel), fallback to Cloud Sandbox
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
