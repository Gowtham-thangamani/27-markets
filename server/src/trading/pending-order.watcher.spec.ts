import { PendingOrderWatcher } from './pending-order.watcher';

const flush = () => new Promise((r) => setImmediate(r));

describe('PendingOrderWatcher — per-symbol serialization (H-5)', () => {
  it('never processes the same symbol concurrently and coalesces to the latest price', async () => {
    let releaseFirst!: () => void;
    const firstGate = new Promise<void>((r) => (releaseFirst = r));
    const calls: Array<[string, number]> = [];
    let active = 0;
    let maxActive = 0;
    const trading = {
      processTick: jest.fn().mockImplementation(async (s: string, p: number) => {
        active++;
        maxActive = Math.max(maxActive, active);
        calls.push([s, p]);
        if (calls.length === 1) await firstGate; // hold the first pass open
        active--;
      }),
    } as any;
    const watcher = new PendingOrderWatcher({} as any, trading);

    watcher.handleTick('X', 100); // starts processing, blocks on the gate
    watcher.handleTick('X', 101); // coalesced while running
    watcher.handleTick('X', 102); // coalesced → newest wins
    releaseFirst();
    await flush();
    await flush();

    expect(maxActive).toBe(1); // never concurrent for one symbol
    expect(calls).toEqual([['X', 100], ['X', 102]]); // 101 coalesced away
    expect(trading.processTick).toHaveBeenCalledTimes(2);
  });

  it('processes different symbols independently', async () => {
    const seen: string[] = [];
    const trading = {
      processTick: jest.fn().mockImplementation(async (s: string) => {
        seen.push(s);
      }),
    } as any;
    const watcher = new PendingOrderWatcher({} as any, trading);

    watcher.handleTick('X', 1);
    watcher.handleTick('Y', 2);
    await flush();

    expect(seen.sort()).toEqual(['X', 'Y']);
  });
});
