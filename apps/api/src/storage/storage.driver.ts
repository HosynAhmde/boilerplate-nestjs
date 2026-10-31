import type { Readable } from 'node:stream';

export interface StoredObject {
  key: string;
  size: number;
  contentType?: string;
}

/**
 * File storage behind one interface. `local` (default) writes to a disk
 * folder/Docker volume; `s3` talks to any S3-compatible service.
 * Keys are relative paths like `receipts/2026/10/<uuid>.jpg`.
 */
export interface StorageDriver {
  put(key: string, body: Buffer, contentType?: string): Promise<StoredObject>;
  get(key: string): Promise<Readable>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  /** Cheap reachability check for /health. */
  ping(): Promise<void>;
}

export const STORAGE_DRIVER = Symbol('STORAGE_DRIVER');

export function assertSafeKey(key: string): void {
  if (!key || key.startsWith('/') || key.split(/[\\/]/).some((p) => p === '..' || p === '')) {
    throw new Error(`Invalid storage key: ${key}`);
  }
}
