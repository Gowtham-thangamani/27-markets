import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { Env } from '../config/env.validation';

/** DI token for the active document storage backend. */
export const STORAGE_PROVIDER = Symbol('STORAGE_PROVIDER');

export interface StoredObject {
  buffer: Buffer;
  mimeType: string;
}

/**
 * KYC document storage. Files live outside the database and are never web-served
 * directly — only the guarded staff endpoint streams them. LocalStorageProvider
 * (disk) for dev; S3StorageProvider (encrypted at rest) for production. Swap via
 * STORAGE_PROVIDER — KycService never changes.
 */
export interface StorageProvider {
  readonly name: string;
  save(userId: string, originalName: string, buffer: Buffer, mimeType: string): Promise<string>;
  read(key: string, mimeType: string): Promise<StoredObject>;
}

function buildKey(userId: string, originalName: string): string {
  const safe = originalName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
  return `${userId}/${randomUUID()}-${safe}`;
}

@Injectable()
export class LocalStorageProvider implements StorageProvider {
  readonly name = 'local';
  private readonly baseDir = resolve(process.cwd(), 'storage', 'kyc');

  async save(userId: string, originalName: string, buffer: Buffer, _mimeType?: string): Promise<string> {
    const key = buildKey(userId, originalName);
    const full = join(this.baseDir, key);
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, buffer);
    return key;
  }

  async read(key: string, mimeType: string): Promise<StoredObject> {
    const full = resolve(this.baseDir, key);
    if (!full.startsWith(this.baseDir)) throw new Error('Invalid storage key');
    return { buffer: await readFile(full), mimeType };
  }
}

@Injectable()
export class S3StorageProvider implements StorageProvider {
  readonly name = 's3';
  private readonly log = new Logger('S3StorageProvider');
  private readonly client?: S3Client;
  private readonly bucket?: string;
  private readonly prefix: string;

  constructor(config: ConfigService<Env, true>) {
    this.bucket = config.get('S3_BUCKET', { infer: true });
    this.prefix = config.get('S3_PREFIX', { infer: true }) ?? 'kyc';
    if (this.bucket) {
      const region = config.get('S3_REGION', { infer: true });
      const endpoint = config.get('S3_ENDPOINT', { infer: true });
      this.client = new S3Client({ region, ...(endpoint ? { endpoint, forcePathStyle: true } : {}) });
    } else {
      this.log.warn('S3_BUCKET not set — S3 storage provider is inactive.');
    }
  }

  private assert(): { client: S3Client; bucket: string } {
    if (!this.client || !this.bucket) {
      throw new ServiceUnavailableException('S3 storage is not configured (S3_BUCKET).');
    }
    return { client: this.client, bucket: this.bucket };
  }

  async save(userId: string, originalName: string, buffer: Buffer, mimeType: string): Promise<string> {
    const { client, bucket } = this.assert();
    const key = `${this.prefix}/${buildKey(userId, originalName)}`;
    await client.send(
      new PutObjectCommand({ Bucket: bucket, Key: key, Body: buffer, ContentType: mimeType, ServerSideEncryption: 'AES256' }),
    );
    return key;
  }

  async read(key: string, mimeType: string): Promise<StoredObject> {
    const { client, bucket } = this.assert();
    const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const bytes = await res.Body!.transformToByteArray();
    return { buffer: Buffer.from(bytes), mimeType: res.ContentType ?? mimeType };
  }
}
