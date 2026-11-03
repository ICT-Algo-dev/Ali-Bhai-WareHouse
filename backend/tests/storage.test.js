import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { mkdtemp, mkdir, rm, writeFile, utimes, access } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { LocalStorageProvider } from '../src/storage/LocalStorageProvider.js';
import { detectFileType } from '../src/services/intake-files.service.js';
import { removeStaleTempFiles } from '../src/services/intake-cleanup.service.js';
import { IntakeFile } from '../src/models/IntakeFile.js';

let root;
beforeEach(async () => { root = await mkdtemp(path.join(os.tmpdir(), 'warehouse-upload-test-')); });
afterEach(async () => { await rm(root, { recursive: true, force: true }); });

describe('local intake storage', () => {
  test('stores relative keys and prevents traversal, including Windows paths', async () => {
    const provider = new LocalStorageProvider(root);
    await expect(provider.save(Readable.from([Buffer.from('private')]), 'intakes/INT-2026-000001/file.pdf')).resolves.toBeUndefined();
    await expect(provider.exists('intakes/INT-2026-000001/file.pdf')).resolves.toBe(true);
    expect(() => provider.resolveKey('../outside.txt')).toThrow();
    expect(() => provider.resolveKey('intakes/..\\..\\outside')).toThrow();
    expect(() => provider.resolveKey('C:/private/outside')).toThrow();
    await provider.deletePrefix('intakes/INT-2026-000001');
    await expect(provider.exists('intakes/INT-2026-000001/file.pdf')).resolves.toBe(false);
  });

  test('detects PDF/JPEG/PNG by magic bytes and rejects renamed executable data', async () => {
    const cases = [
      ['%PDF-1.7 body', 'application/pdf'],
      [Buffer.from([0xff, 0xd8, 0xff, 0x00]), 'image/jpeg'],
      [Buffer.from([0x89, 0x50, 0x4e, 0x47]), 'image/png'],
      [Buffer.from('MZ executable renamed.pdf'), null]
    ];
    for (const [value, expected] of cases) {
      const filePath = path.join(root, `${Math.random()}.bin`);
      await writeFile(filePath, value);
      expect((await detectFileType(filePath))?.mimeType || null).toBe(expected);
    }
  });

  test('removes temporary uploads older than one hour', async () => {
    const temp = path.join(root, 'tmp');
    await mkdir(temp);
    const stale = path.join(temp, 'stale.upload');
    const recent = path.join(temp, 'recent.upload');
    await writeFile(stale, 'stale'); await writeFile(recent, 'recent');
    const old = new Date(Date.now() - 2 * 60 * 60 * 1000);
    await utimes(stale, old, old);
    expect(await removeStaleTempFiles(new Date(), temp)).toBe(1);
    await expect(access(stale)).rejects.toThrow();
    await expect(access(recent)).resolves.toBeUndefined();
  });

  test('defines file lookup indexes and hides storage keys by default', () => {
    const indexes = IntakeFile.schema.indexes();
    expect(indexes.some(([keys]) => keys.intakeId === 1)).toBe(true);
    expect(indexes.some(([keys]) => keys.reference === 1)).toBe(true);
    expect(indexes.some(([keys]) => keys.intakeId === 1 && keys.sku === 1 && keys.kind === 1)).toBe(true);
    expect(IntakeFile.schema.path('storageKey').options.select).toBe(false);
  });
});
