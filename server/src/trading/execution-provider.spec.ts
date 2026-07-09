import { chooseExecutionProvider } from './execution-provider';

describe('chooseExecutionProvider — MT5 fail-closed behind the live rail (H-3)', () => {
  const sim = { name: 'simulation' } as any;
  const mt5 = { name: 'mt5' } as any;

  it('uses the MT5 venue only when requested AND the live rail is on', () => {
    expect(chooseExecutionProvider({ executionProvider: 'mt5', liveRailOn: true }, sim, mt5)).toEqual({
      provider: mt5,
      fellBack: false,
    });
  });

  it('falls back to simulation when MT5 is requested but the live rail is off', () => {
    expect(chooseExecutionProvider({ executionProvider: 'mt5', liveRailOn: false }, sim, mt5)).toEqual({
      provider: sim,
      fellBack: true,
    });
  });

  it('uses simulation when simulation is requested (no fallback flag)', () => {
    expect(chooseExecutionProvider({ executionProvider: 'simulation', liveRailOn: true }, sim, mt5)).toEqual({
      provider: sim,
      fellBack: false,
    });
  });
});
