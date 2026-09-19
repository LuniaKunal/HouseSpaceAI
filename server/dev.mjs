import { spawn } from 'node:child_process';
const children = [
  spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '-H', '127.0.0.1', '-p', '4173'], { stdio: 'inherit' }),
  spawn(process.execPath, ['--env-file-if-exists=.env.local', 'server/photo-design.mjs'], { stdio: 'inherit' }),
];
let stopping = false;
function stop(code = 0) { if (stopping) return; stopping = true; process.exitCode = code; for (const child of children) child.kill(); }
for (const child of children) { child.on('error', () => stop(1)); child.on('exit', code => stop(code || 0)); }
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => stop());
