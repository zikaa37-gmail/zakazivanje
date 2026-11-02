import { spawn } from 'node:child_process';
import { WEB_PORTS, pickPort } from './dev-ports.mjs';

const args = process.argv.slice(2);
if (!args.includes('--port')) args.push('--port', String(await pickPort(WEB_PORTS)));

const child = spawn(['npx', 'ng', 'serve', '--configuration', 'development', '--no-hmr', ...args].join(' '), {
  shell: true,
  stdio: 'inherit',
});
child.on('exit', (code) => process.exit(code ?? 0));
