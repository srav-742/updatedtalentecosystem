import { spawn } from 'child_process';
import path from 'path';

const services = [
  { name: 'job-service', path: 'services/job-service' },
  { name: 'candidate-service', path: 'services/candidate-service' },
  { name: 'recruiter-service', path: 'services/recruiter-service' },
  { name: 'admin-service', path: 'services/admin-service' },
  { name: 'assessment-service', path: 'services/assessment-service' },
  { name: 'interview-service', path: 'services/interview-service' },
  { name: 'resume-service', path: 'services/resume-service' },
  { name: 'notification-service', path: 'services/notification-service' }
];

const children = [];

console.log('\x1b[36m%s\x1b[0m', 'Starting Hire1Percent Microservices...');

// Determine shell for running npm on Windows vs Unix
const shell = process.platform === 'win32' ? true : '/bin/sh';

services.forEach((service) => {
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
});

// Graceful shutdown handler
function shutdown() {
  console.log('\n\x1b[36m%s\x1b[0m', 'Shutting down all microservices...');
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
