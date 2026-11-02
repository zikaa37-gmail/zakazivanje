import { findApiPort } from './dev-ports.mjs';

const apiPort = await findApiPort();
console.log(`API proxy: /api -> http://127.0.0.1:${apiPort}`);

export default {
  '/api': {
    target: `http://127.0.0.1:${apiPort}`,
    secure: false,
    changeOrigin: true,
  },
};
