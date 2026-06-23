import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { Injectable } from '@nestjs/common';

export interface StoredObject {
  buffer: Buffer;
  mimeType: string;
}

/**
 * Document storage for KYC files. Local-disk implementation for dev — the
 * interface (save/read by opaque `key`) maps cleanly onto S3/GCS later:
 * `save` → putObject / signed upload URL, `read` → getObject / signed URL.
 *
 * Files live OUTSIDE the database and are never web-served directly; only the
 * guarded staff endpoint streams them.
 */
@Injectable()
export class KycStorageService {
  private readonly baseDir = resolve(process.cwd(), 'storage', 'kyc');

  /** Persist a file and return its opaque storage key. */
  async save(userId: string, originalName: string, buffer: Buffer): Promise<string> {
    const safe = originalName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
    const key = `${userId}/${randomUUID()}-${safe}`;
    const full = join(this.baseDir, key);
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, buffer);
    return key;
  }

  /** Read a file by key. Rejects path traversal. */
  async read(key: string, mimeType: string): Promise<StoredObject> {
    const full = resolve(this.baseDir, key);
    if (!full.startsWith(this.baseDir)) {
      throw new Error('Invalid storage key');
    }
    const buffer = await readFile(full);
    return { buffer, mimeType };
  }
}
