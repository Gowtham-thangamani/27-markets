import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import WebSocket from 'ws';
import { Subject } from 'rxjs';

export interface Quote {
  symbol: string;
  price: number;
  prevClose?: number;
  changePct?: number;
  asOf: number; // epoch ms
  stale: boolean; // true when served from cache (not a fresh tick)
}

/**
 * Single upstream Finnhub WebSocket → Redis + in-memory last-good cache →
 * RxJS stream for SSE fan-out. One provider connection serves all clients.
 * Degrades gracefully: no API key = disabled, WS down = REST fallback + cache.
 */
@Injectable()
export class MarketService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(MarketService.name);
  private redis?: Redis;
  private ws?: WebSocket;
  private symbols: string[] = [];
  private apiKey?: string;
  private readonly mem = new Map<string, Quote>();
  // Rolling raw-tick buffer per symbol, aggregated on demand into OHLC candles.
  private readonly history = new Map<string, Array<{ t: number; p: number }>>();
  private readonly HISTORY_CAP = 5000;
  private readonly binanceMap = new Map<string, string>(); // BTCUSDT -> BINANCE:BTCUSDT
  private provider: 'finnhub' | 'binance' | 'none' = 'none';
  private readonly updates$ = new Subject<Quote>();
  private reconnectAttempts = 0;
  private reconnectTimer?: NodeJS.Timeout;
  private pollTimer?: NodeJS.Timeout;
  private closed = false;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    this.apiKey = this.config.get<string>('FINNHUB_API_KEY');
    this.symbols = (this.config.get<string>('MARKET_SYMBOLS') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const redisUrl = this.config.get<string>('REDIS_URL');
    if (redisUrl) {
      this.redis = new Redis(redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 2,
        enableOfflineQueue: false,
      });
      this.redis.on('error', (e) => this.log.warn(`Redis error: ${e.message}`));
      this.redis.connect().catch((e) =>
        this.log.warn(`Redis connect failed (cache disabled): ${(e as Error).message}`),
      );
    }

    if (!this.apiKey) {
      // No Finnhub key → stream crypto from Binance's free public WS (no key).
      this.log.warn('FINNHUB_API_KEY not set — using Binance public stream (crypto only, no key).');
      this.provider = 'binance';
      this.connectBinance();
      return;
    }

    this.provider = 'finnhub';
    void this.seedFromRest();
    this.connectWs();
    // Fallback refresh: REST snapshot periodically in case the WS is quiet/down.
    // Kept at 60s so a large symbol set stays within Finnhub's 60 calls/min free tier
    // (live updates come from the WebSocket, not this poll).
    this.pollTimer = setInterval(() => void this.seedFromRest(), 60_000);
  }

  onModuleDestroy(): void {
    this.closed = true;
    this.ws?.close();
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.updates$.complete();
    this.redis?.disconnect();
  }

  /** Live tick stream for the SSE endpoint. */
  get stream() {
    return this.updates$.asObservable();
  }

  async getQuotes(symbols: string[]): Promise<Quote[]> {
    const out: Quote[] = [];
    for (const s of symbols) {
      const q = await this.read(s);
      if (q) out.push(q);
    }
    return out;
  }

  getOverview(): Promise<Quote[]> {
    return this.getQuotes(this.symbols);
  }

  health() {
    return {
      provider: this.provider,
      configured: this.provider !== 'none',
      wsConnected: this.ws?.readyState === WebSocket.OPEN,
      symbols: this.symbols,
      cached: this.mem.size,
    };
  }

  // ───────────── internals ─────────────

  private key(s: string): string {
    return `mkt:q:${s}`;
  }

  private async read(symbol: string): Promise<Quote | null> {
    const fresh = this.mem.get(symbol);
    if (fresh) return fresh;
    if (this.redis && this.redis.status === 'ready') {
      try {
        const raw = await this.redis.get(this.key(symbol));
        if (raw) {
          const q = JSON.parse(raw) as Quote;
          q.stale = true; // came from cache, not a live tick
          return q;
        }
      } catch {
        /* cache miss/unavailable — ignore */
      }
    }
    return null;
  }

  /** Append a raw tick to the rolling per-symbol buffer (capped). */
  private pushHistory(symbol: string, t: number, p: number): void {
    let arr = this.history.get(symbol);
    if (!arr) {
      arr = [];
      this.history.set(symbol, arr);
    }
    arr.push({ t, p });
    if (arr.length > this.HISTORY_CAP) arr.splice(0, arr.length - this.HISTORY_CAP);
  }

  /** Aggregate buffered ticks into OHLC candles (bucketSec-wide), newest `limit`. */
  getCandles(
    symbol: string,
    bucketSec = 60,
    limit = 120,
  ): Array<{ time: number; open: number; high: number; low: number; close: number }> {
    const arr = this.history.get(symbol) ?? [];
    const bucketMs = Math.max(1, bucketSec) * 1000;
    const buckets = new Map<number, { o: number; h: number; l: number; c: number }>();
    for (const { t, p } of arr) {
      const bt = Math.floor(t / bucketMs) * bucketMs;
      const e = buckets.get(bt);
      if (!e) buckets.set(bt, { o: p, h: p, l: p, c: p });
      else {
        e.h = Math.max(e.h, p);
        e.l = Math.min(e.l, p);
        e.c = p;
      }
    }
    return [...buckets.entries()]
      .sort((a, b) => a[0] - b[0])
      .slice(-limit)
      .map(([bt, e]) => ({ time: Math.floor(bt / 1000), open: e.o, high: e.h, low: e.l, close: e.c }));
  }

  private async store(q: Quote): Promise<void> {
    this.mem.set(q.symbol, q);
    this.pushHistory(q.symbol, q.asOf, q.price);
    this.updates$.next(q);
    if (this.redis && this.redis.status === 'ready') {
      try {
        await this.redis.set(this.key(q.symbol), JSON.stringify(q), 'EX', 86_400);
      } catch {
        /* best-effort cache write */
      }
    }
  }

  /** Initial + fallback snapshot via Finnhub REST /quote. */
  private async seedFromRest(): Promise<void> {
    if (!this.apiKey) return;
    await Promise.all(
      this.symbols.map(async (symbol) => {
        try {
          const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${this.apiKey}`;
          const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
          if (!res.ok) return;
          const d = (await res.json()) as { c?: number; pc?: number };
          if (typeof d.c === 'number' && d.c > 0) {
            const prevClose = typeof d.pc === 'number' ? d.pc : undefined;
            await this.store({
              symbol,
              price: d.c,
              prevClose,
              changePct: prevClose ? ((d.c - prevClose) / prevClose) * 100 : undefined,
              asOf: Date.now(),
              stale: false,
            });
          }
        } catch {
          /* per-symbol failure shouldn't break the batch */
        }
      }),
    );
  }

  private connectWs(): void {
    if (this.closed || !this.apiKey) return;
    const ws = new WebSocket(`wss://ws.finnhub.io?token=${this.apiKey}`);
    this.ws = ws;

    ws.on('open', () => {
      this.reconnectAttempts = 0;
      this.log.log('Finnhub WS connected');
      for (const s of this.symbols) {
        ws.send(JSON.stringify({ type: 'subscribe', symbol: s }));
      }
    });

    ws.on('message', (raw: WebSocket.RawData) => {
      try {
        const msg = JSON.parse(raw.toString()) as {
          type?: string;
          data?: { s: string; p: number; t: number }[];
        };
        if (msg.type !== 'trade' || !Array.isArray(msg.data)) return;
        // collapse the batch to the latest price per symbol
        const latest = new Map<string, { p: number; t: number }>();
        for (const t of msg.data) latest.set(t.s, { p: t.p, t: t.t });
        for (const [symbol, { p, t }] of latest) {
          const prev = this.mem.get(symbol);
          void this.store({
            symbol,
            price: p,
            prevClose: prev?.prevClose,
            changePct: prev?.prevClose ? ((p - prev.prevClose) / prev.prevClose) * 100 : prev?.changePct,
            asOf: t || Date.now(),
            stale: false,
          });
        }
      } catch {
        /* ignore malformed frames */
      }
    });

    ws.on('error', (e) => this.log.warn(`Finnhub WS error: ${(e as Error).message}`));

    ws.on('close', () => {
      if (this.closed) return;
      this.reconnectAttempts += 1;
      const delay = Math.min(30_000, 1000 * 2 ** this.reconnectAttempts);
      this.log.warn(`Finnhub WS closed — reconnecting in ${delay}ms`);
      this.reconnectTimer = setTimeout(() => this.connectWs(), delay);
    });
  }

  /** No-key fallback: stream crypto from Binance's free public WebSocket. */
  private connectBinance(): void {
    if (this.closed) return;
    const syms = this.symbols
      .filter((s) => s.startsWith('BINANCE:'))
      .map((s) => s.slice('BINANCE:'.length));
    if (syms.length === 0) {
      this.log.warn('No BINANCE:* symbols configured — live market disabled without a Finnhub key.');
      return;
    }
    for (const s of syms) this.binanceMap.set(s.toUpperCase(), `BINANCE:${s}`);

    const streams = syms.map((s) => `${s.toLowerCase()}@ticker`).join('/');
    const ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`);
    this.ws = ws;

    ws.on('open', () => {
      this.reconnectAttempts = 0;
      this.log.log(`Binance WS connected (${syms.length} symbols, no key)`);
    });

    ws.on('message', (raw: WebSocket.RawData) => {
      try {
        // 24hr ticker payload: { data: { s: 'BTCUSDT', c: lastPrice, P: changePct } }
        const msg = JSON.parse(raw.toString()) as { data?: { s: string; c: string; P: string } };
        const d = msg.data;
        if (!d?.s) return;
        const symbol = this.binanceMap.get(d.s);
        if (!symbol) return;
        const price = parseFloat(d.c);
        const changePct = parseFloat(d.P);
        if (Number.isFinite(price)) {
          void this.store({
            symbol,
            price,
            changePct: Number.isFinite(changePct) ? changePct : undefined,
            asOf: Date.now(),
            stale: false,
          });
        }
      } catch {
        /* ignore malformed frames */
      }
    });

    ws.on('error', (e) => this.log.warn(`Binance WS error: ${(e as Error).message}`));

    ws.on('close', () => {
      if (this.closed) return;
      this.reconnectAttempts += 1;
      const delay = Math.min(30_000, 1000 * 2 ** this.reconnectAttempts);
      this.log.warn(`Binance WS closed — reconnecting in ${delay}ms`);
      this.reconnectTimer = setTimeout(() => this.connectBinance(), delay);
    });
  }
}
