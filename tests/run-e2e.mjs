import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const host = '127.0.0.1';
const port = '34671';
const baseUrl = `http://${host}:${port}`;

function spawnNode(argumentsList) {
  return spawn(process.execPath, argumentsList, {
    cwd: process.cwd(),
    env: process.env,
    stdio: ['ignore', 'inherit', 'inherit'],
  });
}

async function waitForServer(server, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`Next.js server exited before becoming ready (${server.exitCode}).`);
    }
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {
      await delay(100);
    }
  }
  throw new Error(`Next.js server did not become ready within ${timeoutMs}ms.`);
}

function waitForExit(child) {
  return new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => resolve({ code, signal }));
  });
}

const server = spawnNode([
  'node_modules/next/dist/bin/next',
  'start',
  '-H',
  host,
  '-p',
  port,
]);

let exitCode = 1;
try {
  await waitForServer(server);
  const playwright = spawnNode(['node_modules/@playwright/test/cli.js', 'test']);
  const result = await waitForExit(playwright);
  exitCode = result.code ?? 1;
} finally {
  if (server.exitCode === null) server.kill('SIGTERM');
}

process.exitCode = exitCode;

