import { spawn } from 'child_process';
import path from 'path';

const services = [
  { name: 'backend', path: 'backend', env: { PORT: '5000' } },
  { name: 'frontend', path: 'frontend' }
];

const children = [];

console.log('\x1b[36m%s\x1b[0m', 'Starting Talent Ecosystem (Backend + Frontend)...');

// Determine shell for running npm on Windows vs Unix
const shell = process.platform === 'win32' ? true : '/bin/sh';

const startService = (service) => {
  console.log('\x1b[32m%s\x1b[0m', `[Launcher] Starting ${service.name}...`);
  
  const child = spawn('npm', ['run', 'dev'], {
    cwd: path.resolve(service.path),
    shell: shell,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, ...(service.env || {}) }
  });

  child.stdout.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach(line => {
      if (line.trim()) {
        console.log(`[\x1b[35m${service.name}\x1b[0m] ${line}`);
      }
    });
  });

  child.stderr.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach(line => {
      if (line.trim()) {
        console.error(`[\x1b[31m${service.name}-ERR\x1b[0m] ${line}`);
      }
    });
  });

  child.on('close', (code) => {
    console.log(`[\x1b[33m${service.name}\x1b[0m] Process exited with code ${code}`);
  });

  children.push(child);
  return child;
};

// Start both backend and frontend
services.forEach((service) => {
  startService(service);
});

// Graceful shutdown handler
function shutdown() {
  console.log('\n\x1b[36m%s\x1b[0m', 'Shutting down Talent Ecosystem services...');
  children.forEach((child) => {
    if (child.pid) {
      child.kill('SIGINT');
    }
  });
  setTimeout(() => {
    process.exit(0);
  }, 1000);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
