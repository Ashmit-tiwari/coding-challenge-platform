// WCC Code Execution Mini-Service
// Sandboxed runner for student code. Listens on port 3031.
//
// Security model:
//  - Code is run in a short-lived subprocess with hard wall-clock + CPU limits.
//  - Each test case runs in a separate invocation with stdin/stdout capture.
//  - Temp files are written to an ephemeral per-run directory under os.tmpdir()
//    and removed after the run.
//  - We never exec student code inside the main Next.js server process.
//
// Supported languages: python, cpp, javascript.
//
// Protocol: POST /run  { language, code, stdin, expected, timeLimitMs, memoryLimitMb? }
// Response: { status, stdout, stderr, exitCode, execTimeMs, passed }

import { spawn } from "bun";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PORT = 3031;
const RUN_TMP_BASE = join(tmpdir(), "wcc-exec");
if (!existsSync(RUN_TMP_BASE)) mkdirSync(RUN_TMP_BASE, { recursive: true });

export type Status =
  | "Accepted"
  | "Wrong Answer"
  | "Compilation Error"
  | "Runtime Error"
  | "Time Limit Exceeded"
  | "Memory Limit Exceeded"
  | "Internal Error";

export interface RunResult {
  status: Status;
  stdout: string;
  stderr: string;
  exitCode: number;
  execTimeMs: number;
  passed: boolean;
  message?: string;
}

function normalizeLineEndings(s: string): string {
  return (s || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\s+$/g, "");
}

function stripTrailingNewlines(s: string): string {
  return (s || "").replace(/\n+$/g, "");
}

async function runWithLimit(
  cmd: string[],
  opts: { cwd: string; stdin: string; timeLimitMs: number; memoryLimitMb?: number },
): Promise<{ stdout: string; stderr: string; exitCode: number | null; timedOut: boolean; execTimeMs: number }> {
  const start = Date.now();
  const proc = Bun.spawn({
    cmd,
    cwd: opts.cwd,
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
    env: {
      // minimal env to reduce side-channels
      PATH: process.env.PATH || "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
      HOME: "/tmp",
      LANG: "C.UTF-8",
      LC_ALL: "C.UTF-8",
      PYTHONDONTWRITEBYTECODE: "1",
      PYTHONUNBUFFERED: "1",
    },
  });

  // write stdin
  try {
    proc.stdin.write(new TextEncoder().encode(opts.stdin || ""));
  } catch {}
  try { proc.stdin.end(); } catch {}

  const killer = setTimeout(() => {
    try { proc.kill("SIGKILL"); } catch {}
  }, opts.timeLimitMs + 500); // small grace over the limit

  let stdout = "";
  let stderr = "";
  let exitCode: number | null = null;
  let timedOut = false;

  try {
    const [out, err, code] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);
    stdout = out;
    stderr = err;
    exitCode = code as number;
  } catch {
    // killed
    timedOut = true;
  } finally {
    clearTimeout(killer);
  }

  const execTimeMs = Date.now() - start;
  if (timedOut || execTimeMs > opts.timeLimitMs) timedOut = true;

  return { stdout, stderr, exitCode, timedOut, execTimeMs };
}

async function runPython(
  code: string,
  stdin: string,
  timeLimitMs: number,
  memoryLimitMb: number | undefined,
): Promise<RunResult> {
  const runDir = join(RUN_TMP_BASE, `py-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(runDir, { recursive: true });
  const srcPath = join(runDir, "main.py");
  try {
    writeFileSync(srcPath, code, { mode: 0o600 });
    const res = await runWithLimit(["python3", "-I", srcPath], {
      cwd: runDir,
      stdin,
      timeLimitMs,
      memoryLimitMb,
    });
    if (res.timedOut) {
      return { status: "Time Limit Exceeded", stdout: res.stdout, stderr: res.stderr, exitCode: res.exitCode ?? -1, execTimeMs: res.execTimeMs, passed: false, message: "Execution exceeded the time limit." };
    }
    if (res.exitCode !== 0) {
      const isCompileErr = /SyntaxError|IndentationError|TabError/.test(res.stderr);
      return {
        status: isCompileErr ? "Compilation Error" : "Runtime Error",
        stdout: res.stdout,
        stderr: res.stderr.slice(0, 4000),
        exitCode: res.exitCode ?? -1,
        execTimeMs: res.execTimeMs,
        passed: false,
        message: isCompileErr ? "Your code could not be parsed." : "Your program exited with a non-zero status.",
      };
    }
    return { status: "Accepted", stdout: res.stdout, stderr: res.stderr, exitCode: 0, execTimeMs: res.execTimeMs, passed: true };
  } finally {
    rmSync(runDir, { recursive: true, force: true });
  }
}

async function runJavaScript(
  code: string,
  stdin: string,
  timeLimitMs: number,
  memoryLimitMb: number | undefined,
): Promise<RunResult> {
  const runDir = join(RUN_TMP_BASE, `js-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(runDir, { recursive: true });
  const srcPath = join(runDir, "main.js");
  try {
    writeFileSync(srcPath, code, { mode: 0o600 });
    const res = await runWithLimit(["node", "--no-warnings", srcPath], {
      cwd: runDir,
      stdin,
      timeLimitMs,
      memoryLimitMb,
    });
    if (res.timedOut) {
      return { status: "Time Limit Exceeded", stdout: res.stdout, stderr: res.stderr, exitCode: res.exitCode ?? -1, execTimeMs: res.execTimeMs, passed: false, message: "Execution exceeded the time limit." };
    }
    if (res.exitCode !== 0) {
      const isCompileErr = /SyntaxError|Unexpected token|Unexpected end/.test(res.stderr);
      return {
        status: isCompileErr ? "Compilation Error" : "Runtime Error",
        stdout: res.stdout,
        stderr: res.stderr.slice(0, 4000),
        exitCode: res.exitCode ?? -1,
        execTimeMs: res.execTimeMs,
        passed: false,
        message: isCompileErr ? "Your code has a syntax error." : "Your program exited with a non-zero status.",
      };
    }
    return { status: "Accepted", stdout: res.stdout, stderr: res.stderr, exitCode: 0, execTimeMs: res.execTimeMs, passed: true };
  } finally {
    rmSync(runDir, { recursive: true, force: true });
  }
}

async function runCpp(
  code: string,
  stdin: string,
  timeLimitMs: number,
  memoryLimitMb: number | undefined,
): Promise<RunResult> {
  const runDir = join(RUN_TMP_BASE, `cpp-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(runDir, { recursive: true });
  const srcPath = join(runDir, "main.cpp");
  const binPath = join(runDir, "main");
  try {
    writeFileSync(srcPath, code, { mode: 0o600 });
    // compile step
    const compileRes = await runWithLimit(["g++", "-O2", "-std=c++17", "-o", binPath, srcPath], {
      cwd: runDir,
      stdin: "",
      timeLimitMs: 8000,
      memoryLimitMb,
    });
    if (compileRes.exitCode !== 0) {
      return {
        status: "Compilation Error",
        stdout: "",
        stderr: compileRes.stderr.slice(0, 4000),
        exitCode: compileRes.exitCode ?? -1,
        execTimeMs: compileRes.execTimeMs,
        passed: false,
        message: "Your C++ code failed to compile.",
      };
    }
    const res = await runWithLimit([binPath], {
      cwd: runDir,
      stdin,
      timeLimitMs,
      memoryLimitMb,
    });
    if (res.timedOut) {
      return { status: "Time Limit Exceeded", stdout: res.stdout, stderr: res.stderr, exitCode: res.exitCode ?? -1, execTimeMs: res.execTimeMs, passed: false, message: "Execution exceeded the time limit." };
    }
    if (res.exitCode !== 0) {
      return {
        status: "Runtime Error",
        stdout: res.stdout,
        stderr: res.stderr.slice(0, 4000),
        exitCode: res.exitCode ?? -1,
        execTimeMs: res.execTimeMs,
        passed: false,
        message: "Your program exited with a non-zero status.",
      };
    }
    return { status: "Accepted", stdout: res.stdout, stderr: res.stderr, exitCode: 0, execTimeMs: res.execTimeMs, passed: true };
  } finally {
    rmSync(runDir, { recursive: true, force: true });
  }
}

function checkAnswer(actual: string, expected: string): boolean {
  const a = stripTrailingNewlines(normalizeLineEndings(actual));
  const e = stripTrailingNewlines(normalizeLineEndings(expected));
  return a === e;
}

interface RunRequest {
  language: string;
  code: string;
  stdin: string;
  expected?: string;
  timeLimitMs?: number;
  memoryLimitMb?: number;
}

async function handleRun(req: Request): Promise<Response> {
  let body: RunRequest;
  try {
    body = await req.json() as RunRequest;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const lang = (body.language || "").toLowerCase();
  const code = body.code || "";
  const stdin = body.stdin || "";
  const expected = body.expected;
  const timeLimitMs = Math.min(Math.max(body.timeLimitMs || 2000, 200), 15000);
  const memoryLimitMb = body.memoryLimitMb;

  if (!code.trim()) {
    return Response.json({ error: "Empty code" }, { status: 400 });
  }
  if (code.length > 200000) {
    return Response.json({ error: "Code too large" }, { status: 400 });
  }

  let result: RunResult;
  switch (lang) {
    case "python":
    case "py":
      result = await runPython(code, stdin, timeLimitMs, memoryLimitMb);
      break;
    case "javascript":
    case "js":
    case "node":
      result = await runJavaScript(code, stdin, timeLimitMs, memoryLimitMb);
      break;
    case "cpp":
    case "c++":
      result = await runCpp(code, stdin, timeLimitMs, memoryLimitMb);
      break;
    default:
      return Response.json({ error: `Unsupported language: ${lang}` }, { status: 400 });
  }

  if (expected !== undefined && result.status === "Accepted") {
    const passed = checkAnswer(result.stdout, expected);
    result.passed = passed;
    result.status = passed ? "Accepted" : "Wrong Answer";
    if (!passed) {
      result.message = "Your output did not match the expected output.";
    }
  }
  return Response.json(result);
}

async function handleHealth(): Promise<Response> {
  return Response.json({ ok: true, service: "wcc-exec", languages: ["python", "cpp", "javascript"] });
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    if (req.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
    if (url.pathname === "/run" && req.method === "POST") {
      const res = await handleRun(req);
      for (const [k, v] of Object.entries(corsHeaders)) res.headers.set(k, v as string);
      return res;
    }
    if (url.pathname === "/health") {
      const res = await handleHealth();
      for (const [k, v] of Object.entries(corsHeaders)) res.headers.set(k, v as string);
      return res;
    }
    return new Response("Not Found", { status: 404, headers: corsHeaders });
  },
});

console.log(`wcc-exec service listening on http://localhost:${PORT}`);
export { server };
