import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfigService } from '../config/config.module.js';
import { LocalStorageDriver } from './local-storage.driver.js';
import { S3StorageDriver } from './s3-storage.driver.js';
import { STORAGE_DRIVER, type StorageDriver } from './storage.driver.js';

@Global()
@Module({
  providers: [
    {
      provide: STORAGE_DRIVER,
      inject: [ConfigService],
      useFactory: (config: AppConfigService): StorageDriver => {
        if (config.get('STORAGE_DRIVER', { infer: true }) === 's3') {
          return new S3StorageDriver({
            endpoint: config.get('S3_ENDPOINT', { infer: true })!,
            region: config.get('S3_REGION', { infer: true }),
            bucket: config.get('S3_BUCKET', { infer: true })!,
            accessKeyId: config.get('S3_ACCESS_KEY_ID', { infer: true })!,
            secretAccessKey: config.get('S3_SECRET_ACCESS_KEY', { infer: true })!,
            forcePathStyle: config.get('S3_FORCE_PATH_STYLE', { infer: true }),
          });
        }
        return new LocalStorageDriver(config.get('STORAGE_LOCAL_DIR', { infer: true }));
      },
    },
  ],
  exports: [STORAGE_DRIVER],
})
export class StorageModule {}
