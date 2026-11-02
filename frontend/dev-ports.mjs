import { connect } from 'node:net';

export const WEB_PORTS = [4200, 5110];
export const API_PORTS = [8000, 8110];

function listening(host, port) {
  return new Promise((resolve) => {
    const socket = connect({ host, port });
    const done = (result) => {
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(300, () => done(false));
    socket.once('connect', () => done(true));
    socket.once('error', () => done(false));
  });
}

export async function portInUse(port) {
  const results = await Promise.all([listening('127.0.0.1', port), listening('::1', port)]);
  return results.includes(true);
}

export async function isOurApi(port) {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/public/business`, { signal: AbortSignal.timeout(1500) });
    const body = await response.json();
    return 'theme_primary' in body && 'slot_interval_minutes' in body;
  } catch {
    return false;
  }
}

export async function pickPort([preferred, fallback]) {
  return (await portInUse(preferred)) ? fallback : preferred;
}

export async function findApiPort() {
  if (process.env.API_PORT) return Number(process.env.API_PORT);
  for (const port of API_PORTS) {
    if (await isOurApi(port)) return port;
  }
  return pickPort(API_PORTS);
}
