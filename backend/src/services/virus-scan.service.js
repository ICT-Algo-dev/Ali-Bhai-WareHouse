import net from 'node:net';
import { createReadStream } from 'node:fs';
import { env } from '../config/env.js';
import { SCAN_STATUSES } from '../constants/intake.js';

export async function scanFile(filePath) {
  if (!env.CLAMAV_HOST) return SCAN_STATUSES[0];
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: env.CLAMAV_HOST, port: env.CLAMAV_PORT });
    let response = ''; let settled = false;
    const fail = (error) => { if (settled) return; settled = true; socket.destroy(); reject(error); };
    socket.setTimeout(30000, () => fail(new Error('ClamAV scan timed out')));
    socket.on('error', fail);
    socket.on('data', (chunk) => {
      response += chunk.toString('utf8');
      if (response.includes('\0') || response.endsWith('\n')) {
        settled = true; socket.end();
        if (response.includes(' FOUND')) resolve(SCAN_STATUSES[2]);
        else if (response.includes(' OK')) resolve(SCAN_STATUSES[1]);
        else reject(new Error('ClamAV returned an unexpected response'));
      }
    });
    socket.on('connect', () => {
      socket.write('zINSTREAM\0');
      const stream = createReadStream(filePath);
      stream.on('data', (chunk) => {
        const size = Buffer.alloc(4); size.writeUInt32BE(chunk.length);
        if (!socket.write(size) || !socket.write(chunk)) stream.pause();
      });
      socket.on('drain', () => stream.resume());
      stream.on('error', fail);
      stream.on('end', () => { const end = Buffer.alloc(4); end.writeUInt32BE(0); socket.write(end); });
    });
  });
}
