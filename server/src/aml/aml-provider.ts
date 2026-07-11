import { Injectable, NotImplementedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.validation';

/** DI token for the active AML screening provider. */
export const AML_PROVIDER = Symbol('AML_PROVIDER');

export interface AmlSubject {
  userId: string;
  fullName: string;
  country?: string | null;
  dateOfBirth?: Date | null;
}

export interface AmlHit {
  list: string; // e.g. "OFAC SDN", "EU Consolidated", "PEP"
  name: string;
  score: number; // 0..1 match confidence
}

export interface AmlScreenResult {
  status: 'CLEAR' | 'REVIEW' | 'HIT';
  provider: string;
  reference?: string | null;
  hits: AmlHit[];
}

/**
 * The boundary between compliance logic and a sanctions/PEP/adverse-media
 * screening service. SIMULATION is the default; an external provider adapter
 * plugs in behind this same interface at go-live.
 */
export interface AmlProvider {
  readonly name: string;
  screen(subject: AmlSubject): Promise<AmlScreenResult>;
}

/**
 * Default: SIMULATION. Returns CLEAR for everyone, except names on
 * AML_SIM_DENYLIST (comma-separated) which return a HIT — so the whole gating
 * path can be exercised end-to-end in tests / staging without a real vendor.
 */
@Injectable()
export class SimulationAmlProvider implements AmlProvider {
  readonly name = 'simulation';
  private readonly denylist: string[];

  constructor(config: ConfigService<Env, true>) {
    this.denylist = (config.get('AML_SIM_DENYLIST', { infer: true }) ?? '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
  }

  async screen(subject: AmlSubject): Promise<AmlScreenResult> {
    const name = subject.fullName.trim().toLowerCase();
    if (name && this.denylist.includes(name)) {
      return {
        status: 'HIT',
        provider: this.name,
        reference: `sim_${subject.userId}`,
        hits: [{ list: 'SIM_DENYLIST', name: subject.fullName, score: 1 }],
      };
    }
    return { status: 'CLEAR', provider: this.name, reference: `sim_${subject.userId}`, hits: [] };
  }
}

/**
 * LIVE skeleton: refuses until a real AML provider is integrated + keyed. Keeps
 * the compliance gate fail-closed rather than silently passing everyone.
 */
@Injectable()
export class ExternalAmlProvider implements AmlProvider {
  readonly name = 'external';
  constructor(private readonly config: ConfigService<Env, true>) {}

  async screen(_subject: AmlSubject): Promise<AmlScreenResult> {
    if (!this.config.get('AML_PROVIDER_API_KEY', { infer: true })) {
      throw new NotImplementedException(
        'AML screening is not configured (AML_PROVIDER_API_KEY missing). ' +
          'Integrate a sanctions/PEP provider before enabling AML_PROVIDER=external.',
      );
    }
    // Integration point: call the provider's screening API, map its verdict to
    // AmlScreenResult, and return it. Left unimplemented until a vendor is chosen.
    throw new NotImplementedException('External AML provider adapter is not implemented yet.');
  }
}
