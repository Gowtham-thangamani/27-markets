import { Injectable, Logger, NotImplementedException, ServiceUnavailableException } from '@nestjs/common';
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

/** Above this score a match is treated as a confirmed HIT (block). */
export const AML_HIT_THRESHOLD = 0.85;
/** Between this and the HIT threshold, a match needs human review. */
export const AML_REVIEW_THRESHOLD = 0.6;
const AML_TIMEOUT_MS = 10_000;

/** One OpenSanctions match result (subset of the /match response we use). */
interface OsResult {
  score: number;
  caption?: string;
  datasets?: string[];
  properties?: { topics?: string[] };
}

/**
 * OpenSanctions adapter (hosted api.opensanctions.org, or a self-hosted yente).
 * Screens the subject against the consolidated sanctions/PEP/adverse-media
 * datasets via the /match API and maps the best score to CLEAR / REVIEW / HIT.
 * Fail-closed: a missing key or an unreachable provider raises rather than
 * silently clearing.
 */
@Injectable()
export class ExternalAmlProvider implements AmlProvider {
  readonly name = 'external';
  private readonly log = new Logger('ExternalAmlProvider');

  constructor(private readonly config: ConfigService<Env, true>) {}

  async screen(subject: AmlSubject): Promise<AmlScreenResult> {
    const apiKey = this.config.get('AML_PROVIDER_API_KEY', { infer: true });
    if (!apiKey) {
      throw new NotImplementedException(
        'AML screening is not configured (AML_PROVIDER_API_KEY missing). ' +
          'Set it before enabling AML_PROVIDER=external.',
      );
    }
    const baseUrl = this.config.get('AML_PROVIDER_BASE_URL', { infer: true }).replace(/\/$/, '');

    const properties: Record<string, string[]> = { name: [subject.fullName] };
    if (subject.dateOfBirth) properties.birthDate = [subject.dateOfBirth.toISOString().slice(0, 10)];
    if (subject.country) properties.country = [subject.country];

    let body: { responses?: Record<string, { results?: OsResult[] }> };
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), AML_TIMEOUT_MS);
      try {
        const res = await fetch(`${baseUrl}/match/default?algorithm=best`, {
          method: 'POST',
          signal: controller.signal,
          headers: { 'content-type': 'application/json', authorization: `ApiKey ${apiKey}` },
          // Threshold/limit keep the response small; we score client-side too.
          body: JSON.stringify({
            queries: { q: { schema: 'Person', properties } },
          }),
        });
        if (!res.ok) {
          const detail = await res.text().catch(() => '');
          this.log.error(`OpenSanctions error ${res.status}: ${detail.slice(0, 300)}`);
          throw new ServiceUnavailableException(`AML screening provider error (${res.status}).`);
        }
        body = (await res.json()) as typeof body;
      } finally {
        clearTimeout(timer);
      }
    } catch (e) {
      if (e instanceof ServiceUnavailableException) throw e;
      if ((e as Error).name === 'AbortError') throw new ServiceUnavailableException('AML screening timed out.');
      this.log.error(`OpenSanctions request failed: ${(e as Error).message}`);
      throw new ServiceUnavailableException('AML screening provider is unreachable.');
    }

    const results = body.responses?.q?.results ?? [];
    const hits: AmlHit[] = results
      .filter((r) => typeof r.score === 'number' && r.score >= AML_REVIEW_THRESHOLD)
      .map((r) => ({
        list: r.properties?.topics?.[0] ?? r.datasets?.[0] ?? 'opensanctions',
        name: r.caption ?? subject.fullName,
        score: r.score,
      }))
      .sort((a, b) => b.score - a.score);

    const top = hits[0]?.score ?? 0;
    const status: AmlScreenResult['status'] = top >= AML_HIT_THRESHOLD ? 'HIT' : top >= AML_REVIEW_THRESHOLD ? 'REVIEW' : 'CLEAR';
    return { status, provider: this.name, reference: `os_${subject.userId}`, hits };
  }
}
