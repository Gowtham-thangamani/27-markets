import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import type { Env } from '../config/env.validation';

/**
 * Encrypts sensitive fields at rest (AES-256-GCM). Without ENCRYPTION_KEY it is a
 * no-op (dev only) and logs a warning. Ciphertext format: `v1.<iv>.<tag>.<data>`
 * (base64). decrypt() passes through legacy plaintext so enabling encryption does
 * not break existing rows — they re-encrypt on next write.
 */
@Injectable()
export class CryptoService {
  private readonly log = new Logger('CryptoService');
  private readonly key?: Buffer;

  constructor(config: ConfigService<Env, true>) {
    const raw = config.get('ENCRYPTION_KEY', { infer: true });
    if (raw) {
      this.key = createHash('sha256').update(raw).digest(); // 32-byte key
    } else {
      this.log.warn('ENCRYPTION_KEY not set — sensitive fields are stored UNENCRYPTED (dev only).');
    }
  }

  get enabled(): boolean {
    return !!this.key;
  }

  encrypt(plaintext: string): string {
    if (!this.key) return plaintext;
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `v1.${iv.toString('base64')}.${tag.toString('base64')}.${enc.toString('base64')}`;
  }

  decrypt(value: string): string {
    if (!this.key || !value.startsWith('v1.')) return value; // plaintext / legacy
    const [, ivB, tagB, dataB] = value.split('.');
    const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(ivB, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(dataB, 'base64')), decipher.final()]).toString('utf8');
  }
}
