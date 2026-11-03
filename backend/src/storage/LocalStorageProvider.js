import { createReadStream, createWriteStream } from 'node:fs';
import { chmod, mkdir, rename, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { env } from '../config/env.js';
import { StorageProvider } from './StorageProvider.js';

export class LocalStorageProvider extends StorageProvider {
  constructor(root = env.UPLOADS_DIR) { super(); this.root = path.resolve(root); }
  resolveKey(key) {
    if (typeof key !== 'string' || !key || path.isAbsolute(key) || path.win32.isAbsolute(key) || key.includes('\\') || key.split('/').some((part) => !/^[a-zA-Z0-9._-]+$/.test(part) || part === '.' || part === '..')) throw new Error('Invalid storage key');
    const resolved = path.resolve(this.root, ...key.split('/'));
    const relative = path.relative(this.root, resolved);
    if (!relative || relative.startsWith(`..${path.sep}`) || relative === '..' || path.isAbsolute(relative)) throw new Error('Storage key escapes uploads directory');
    return resolved;
  }
  async save(streamOrTempPath, key) {
    const destination = this.resolveKey(key);
    await mkdir(path.dirname(destination), { recursive: true, mode: 0o700 });
    if (typeof streamOrTempPath === 'string') {
      try { await rename(streamOrTempPath, destination); }
      catch (error) {
        if (error.code !== 'EXDEV') throw error;
        await pipeline(createReadStream(streamOrTempPath), createWriteStream(destination, { flags: 'wx', mode: 0o600 }));
        await rm(streamOrTempPath, { force: true });
      }
      await chmod(destination, 0o600);
      return;
    }
    await pipeline(streamOrTempPath, createWriteStream(destination, { flags: 'wx', mode: 0o600 }));
  }
  openReadStream(key) { return createReadStream(this.resolveKey(key)); }
  async delete(key) { await rm(this.resolveKey(key), { force: true }); }
  async deletePrefix(prefix) {
    const target = this.resolveKey(`${prefix}/.prefix-marker`);
    await rm(path.dirname(target), { recursive: true, force: true });
  }
  async exists(key) { try { await stat(this.resolveKey(key)); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; } }
}

export const storageProvider = new LocalStorageProvider();
