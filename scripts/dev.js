import { spawn } from 'child_process';

const isWindows = process.platform === 'win32';
const npmExecutable = process.env.npm_execpath;

if (!npmExecutable) {
  throw new Error('Unable to locate the npm CLI. Start this script with "npm run dev".');
}

const processes = [
  {
    name: 'backend',
    command: process.execPath,
    args: [npmExecutable, 'run', 'dev:server']
  },
  {
    name: 'frontend',
    command: process.execPath,
    args: [npmExecutable, 'run', 'dev:client']
  }
];

const children = [];
let shuttingDown = false;

function stopAll(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of children) {
    if (!child.killed) {
      child.kill(isWindows ? undefined : 'SIGTERM');
    }
  }

  process.exit(exitCode);
}

for (const item of processes) {
  const child = spawn(item.command, item.args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
    shell: false
  });

  children.push(child);

  child.on('exit', (code, signal) => {
    if (shuttingDown) return;

    if (code && code !== 0) {
      console.error(`[${item.name}] exited with code ${code}.`);
      stopAll(code);
      return;
    }

    if (signal) {
      console.error(`[${item.name}] stopped with signal ${signal}.`);
      stopAll(1);
    }
  });

  child.on('error', (error) => {
    console.error(`[${item.name}] failed to start: ${error.message}`);
    stopAll(1);
  });
}

process.on('SIGINT', () => stopAll(0));
process.on('SIGTERM', () => stopAll(0));
