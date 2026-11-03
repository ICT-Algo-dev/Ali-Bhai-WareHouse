import { access, chmod, mkdir, open, rm } from 'node:fs/promises';
import path from 'node:path';
import { constants as fsConstants } from 'node:fs';
import { env } from '../config/env.js';

export async function initializeStorage() {
  const root = path.resolve(env.UPLOADS_DIR);
  for (const publicDirectory of [path.resolve(process.cwd(), 'public'), path.resolve(process.cwd(), 'static')]) {
    const relative = path.relative(publicDirectory, root);
    if (relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative))) throw new Error(`UPLOADS_DIR must not be inside a public/static directory: ${publicDirectory}`);
  }
  try {
    await mkdir(root, { recursive: true, mode: 0o700 });
    await chmod(root, 0o700);
    await access(root, fsConstants.W_OK);
    const probePath = path.join(root, `.write-check-${process.pid}`);
    const handle = await open(probePath, 'wx', 0o600);
    await handle.close();
    await rm(probePath, { force: true });
    await mkdir(path.join(root, 'tmp'), { recursive: true, mode: 0o700 });
    await chmod(path.join(root, 'tmp'), 0o700);
  } catch (error) {
    throw new Error(`UPLOADS_DIR is not writable (${root}): ${error.message}`);
  }
}
