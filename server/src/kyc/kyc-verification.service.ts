import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import type { Env } from '../config/env.validation';
import { KYC_PROVIDER, type KycProvider } from './kyc-provider';

/**
 * Starts hosted identity-verification sessions via the KYC provider seam. Kept
 * separate from KycService so the (manual) document-review flow is untouched.
 */
@Injectable()
export class KycVerificationService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(KYC_PROVIDER) private readonly provider: KycProvider,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async startSession(userId: string): Promise<{ url: string | null; provider: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true, lastName: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const origin = (this.config.get('CLIENT_ORIGIN', { infer: true }).split(',')[0] || '').trim() || 'http://localhost:5173';
    const session = await this.provider.createVerificationSession({
      userId,
      email: user.email,
      fullName: `${user.firstName} ${user.lastName}`.trim(),
      returnUrl: `${origin}/portal/kyc?verify=done`,
    });

    // Correlate a hosted session back to this profile via its reference.
    if (session.reference) {
      await this.prisma.kycProfile.upsert({
        where: { userId },
        update: { providerRef: session.reference },
        create: { userId, providerRef: session.reference },
      });
    }
    return { url: session.url, provider: session.provider };
  }
}
