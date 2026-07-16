import { extractTokens, substituteTokens } from './tokens';

describe('tokens', () => {
  it('extracts distinct token names in first-seen order', () => {
    expect(extractTokens('Hi {{clientName}}, balance {{balance}}, bye {{clientName}}')).toEqual([
      'clientName',
      'balance',
    ]);
  });

  it('returns an empty array when there are no tokens', () => {
    expect(extractTokens('no placeholders here')).toEqual([]);
  });

  it('substitutes known tokens', () => {
    expect(substituteTokens('Hi {{name}}', { name: 'Ada' })).toBe('Hi Ada');
  });

  it('renders unknown tokens as an empty string', () => {
    expect(substituteTokens('Hi {{name}} {{missing}}', { name: 'Ada' })).toBe('Hi Ada ');
  });

  it('is not confused by repeated calls (no shared regex state)', () => {
    const body = '{{a}} {{b}}';
    expect(extractTokens(body)).toEqual(['a', 'b']);
    expect(extractTokens(body)).toEqual(['a', 'b']);
  });
});
