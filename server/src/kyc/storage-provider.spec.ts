import { LocalStorageProvider, S3StorageProvider } from './storage-provider';

describe('LocalStorageProvider', () => {
  const provider = new LocalStorageProvider();

  it('round-trips a file by key (and sanitizes the name)', async () => {
    const key = await provider.save('test-user', 'passport photo!.png', Buffer.from('hello'), 'image/png');
    expect(key).toMatch(/^test-user\//);
    expect(key).not.toContain(' ');
    const { buffer } = await provider.read(key, 'image/png');
    expect(buffer.toString()).toBe('hello');
  });

  it('rejects path-traversal keys', async () => {
    await expect(provider.read('../../etc/passwd', 'text/plain')).rejects.toThrow('Invalid storage key');
  });
});

const cfg = (vals: Record<string, string>) => ({ get: (k: string) => vals[k] }) as any;

describe('S3StorageProvider', () => {
  it('refuses when no bucket is configured', async () => {
    const p = new S3StorageProvider(cfg({}));
    await expect(p.save('u', 'f.png', Buffer.from('x'), 'image/png')).rejects.toThrow('not configured');
    await expect(p.read('k', 'image/png')).rejects.toThrow('not configured');
  });

  it('puts with server-side encryption and reads back via the client', async () => {
    const p = new S3StorageProvider(cfg({ S3_BUCKET: 'b', S3_REGION: 'us-east-1', S3_PREFIX: 'kyc' }));
    const send = jest
      .fn()
      .mockResolvedValueOnce({}) // PutObject
      .mockResolvedValueOnce({ ContentType: 'image/png', Body: { transformToByteArray: async () => new Uint8Array([1, 2, 3]) } });
    (p as any).client = { send };

    const key = await p.save('u', 'doc.png', Buffer.from('x'), 'image/png');
    expect(key).toMatch(/^kyc\/u\//);
    expect(send.mock.calls[0][0].input).toMatchObject({ Bucket: 'b', ServerSideEncryption: 'AES256', ContentType: 'image/png' });

    const { buffer, mimeType } = await p.read(key, 'application/octet-stream');
    expect(Array.from(buffer)).toEqual([1, 2, 3]);
    expect(mimeType).toBe('image/png');
  });
});
