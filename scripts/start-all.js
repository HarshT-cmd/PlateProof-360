import { spawn } from 'child_process';
import process from 'process';

console.log('\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════════');
console.log('\x1b[32m%s\x1b[0m', ' 🌿 PlateProof 360 — Unified Dev Server Launcher');
console.log('\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════════');

const isWin = process.platform === 'win32';
const npxCmd = isWin ? 'npx.cmd' : 'npx';

const backend = spawn(npxCmd, ['tsx', 'server/server.ts'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, PORT: '3001' },
});

const frontend = spawn(npxCmd, ['vite'], {
  stdio: 'inherit',
  shell: true,
});

function cleanup() {
  console.log('\n\x1b[33m%s\x1b[0m', 'Shutting down PlateProof 360 servers...');
  try {
    if (backend && !backend.killed) backend.kill();
    if (frontend && !frontend.killed) frontend.kill();
  } catch {
    // ignore
  }
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

backend.on('exit', (code) => {
  if (code && code !== 0) {
    console.error(`Backend process exited with code ${code}`);
  }
});

frontend.on('exit', (code) => {
  if (code && code !== 0) {
    console.error(`Frontend process exited with code ${code}`);
  }
});
