import { createReadStream } from 'node:fs';
import { access, mkdir, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type { Readable } from 'node:stream';
import { assertSafeKey, type StorageDriver, type StoredObject } from './storage.driver.js';

export class LocalStorageDriver implements StorageDriver {
  private readonly root: string;

  constructor(rootDir: string) {
    this.root = resolve(rootDir);
  }

  private path(key: string): string {
    assertSafeKey(key);
    const full = resolve(this.root, key);
    if (!full.startsWith(this.root + '/')) throw new Error(`Invalid storage key: ${key}`);
    return full;
  }

  async put(key: string, body: Buffer, contentType?: string): Promise<StoredObject> {
    const full = this.path(key);
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, body, { flag: 'wx' }); // never overwrite an existing file
    return { key, size: body.length, contentType };
  }

  async get(key: string): Promise<Readable> {
    const full = this.path(key);
    await access(full);
    return createReadStream(full);
  }

  async delete(key: string): Promise<void> {
    await rm(this.path(key), { force: true });
  }

  async exists(key: string): Promise<boolean> {
    try {
      await stat(this.path(key));
      return true;
    } catch {
      return false;
    }
  }

  async ping(): Promise<void> {
    await mkdir(this.root, { recursive: true });
    await access(this.root);
  }
}
