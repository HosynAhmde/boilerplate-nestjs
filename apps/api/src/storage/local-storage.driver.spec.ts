import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalStorageDriver } from './local-storage.driver.js';

describe('LocalStorageDriver', () => {
  let dir: string;
  let driver: LocalStorageDriver;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'pasha-storage-'));
    driver = new LocalStorageDriver(dir);
  });
  afterEach(() => rm(dir, { recursive: true, force: true }));

  it('stores, reads and deletes a file', async () => {
    await driver.put('receipts/2026/a.txt', Buffer.from('hello'));
    expect(await driver.exists('receipts/2026/a.txt')).toBe(true);
    const chunks: Buffer[] = [];
    for await (const c of await driver.get('receipts/2026/a.txt')) chunks.push(c as Buffer);
    expect(Buffer.concat(chunks).toString()).toBe('hello');
    await driver.delete('receipts/2026/a.txt');
    expect(await driver.exists('receipts/2026/a.txt')).toBe(false);
  });

  it('never overwrites an existing file', async () => {
    await driver.put('a.txt', Buffer.from('1'));
    await expect(driver.put('a.txt', Buffer.from('2'))).rejects.toThrow();
  });

  it.each(['../x', '/etc/passwd', 'a/../../x', ''])('rejects unsafe key %s', async (key) => {
    await expect(driver.put(key, Buffer.from('x'))).rejects.toThrow(/Invalid storage key/);
  });
});
