import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import type { Readable } from 'node:stream';
import { assertSafeKey, type StorageDriver, type StoredObject } from './storage.driver.js';

export interface S3DriverOptions {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
}

export class S3StorageDriver implements StorageDriver {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(options: S3DriverOptions) {
    this.bucket = options.bucket;
    this.client = new S3Client({
      endpoint: options.endpoint,
      region: options.region,
      forcePathStyle: options.forcePathStyle,
      credentials: {
        accessKeyId: options.accessKeyId,
        secretAccessKey: options.secretAccessKey,
      },
    });
  }

  async put(key: string, body: Buffer, contentType?: string): Promise<StoredObject> {
    assertSafeKey(key);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        IfNoneMatch: '*',
      }),
    );
    return { key, size: body.length, contentType };
  }

  async get(key: string): Promise<Readable> {
    assertSafeKey(key);
    const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    return res.Body as Readable;
  }

  async delete(key: string): Promise<void> {
    assertSafeKey(key);
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async exists(key: string): Promise<boolean> {
    assertSafeKey(key);
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch (err) {
      if ((err as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw err;
    }
  }

  async ping(): Promise<void> {
    await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
  }
}
