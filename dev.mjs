import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const frontendDir = join(root, 'frontend');
const backendDir = join(root, 'backend');

const project = Object.values(JSON.parse(readFileSync(join(frontendDir, 'angular.json'), 'utf8')).projects)[0];
const frontendPort = project.architect.serve.options.port;
const backendPort = backendDir && new URL(JSON.parse(readFileSync(join(frontendDir, 'proxy.conf.json'), 'utf8'))['/api'].target).port;

const children = [];

function run(name, color, command, args, cwd) {
  const child = spawn([command, ...args].join(' '), { cwd, shell: true, stdio: ['inherit', 'pipe', 'pipe'] });
  const prefix = `\x1b[${color}m[${name}]\x1b[0m `;
  const print = (stream) => (chunk) => stream.write(chunk.toString().replace(/^(?=.)/gm, prefix));
  child.stdout.on('data', print(process.stdout));
  child.stderr.on('data', print(process.stderr));
  child.on('exit', (code) => {
    console.log(`${prefix}ugašen (${code ?? 'signal'})`);
    stop();
  });
  children.push(child);
}

function stop() {
  for (const child of children) {
    if (child.exitCode === null) spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' });
  }
  setTimeout(() => process.exit(0), 300);
}

process.on('SIGINT', stop);
process.on('SIGTERM', stop);

if (backendDir) run('api', '35', 'php', ['artisan', 'serve', '--host=127.0.0.1', `--port=${backendPort}`, '--no-reload'], backendDir);
run('web', '36', 'npx', ['ng', 'serve', '--host', '0.0.0.0'], frontendDir);

const lan = Object.values(networkInterfaces()).flat().find((i) => i?.family === 'IPv4' && !i.internal)?.address;
console.log(`\nFrontend: http://localhost:${frontendPort}${lan ? `  (telefon: http://${lan}:${frontendPort})` : ''}`);
if (backendDir) console.log(`Backend:  http://127.0.0.1:${backendPort}/api  (frontend ga zove preko /api proxy-ja)`);
console.log('Ctrl+C gasi oba.\n');
