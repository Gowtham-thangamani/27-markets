import * as nodemailer from 'nodemailer';
import { ConsoleEmailProvider, SmtpEmailProvider } from './email-provider';

jest.mock('nodemailer');

const cfg = (values: Record<string, unknown>) =>
  ({ get: (k: string) => values[k] }) as any;

describe('ConsoleEmailProvider', () => {
  it('resolves without throwing (logs the message)', async () => {
    const provider = new ConsoleEmailProvider();
    await expect(provider.send({ to: 'a@x.com', subject: 'Hi', text: 'body' })).resolves.toBeUndefined();
  });
});

describe('SmtpEmailProvider', () => {
  it('sends via nodemailer with the configured from/host', async () => {
    const sendMail = jest.fn().mockResolvedValue({});
    (nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail });

    const provider = new SmtpEmailProvider(
      cfg({ SMTP_HOST: 'smtp.example.com', SMTP_PORT: 587, SMTP_SECURE: false, SMTP_USER: 'u', SMTP_PASS: 'p', EMAIL_FROM: 'no-reply@27markets.com' }),
    );
    await provider.send({ to: 'client@x.com', subject: 'Verify', text: 'link' });

    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ host: 'smtp.example.com', port: 587, secure: false, auth: { user: 'u', pass: 'p' } }),
    );
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ from: 'no-reply@27markets.com', to: 'client@x.com', subject: 'Verify', text: 'link' }),
    );
  });

  it('throws a clear error when SMTP_HOST is missing', async () => {
    const provider = new SmtpEmailProvider(cfg({ EMAIL_FROM: 'no-reply@27markets.com' }));
    await expect(provider.send({ to: 'a@x.com', subject: 'x', text: 'y' })).rejects.toThrow('SMTP_HOST is not configured');
  });
});
