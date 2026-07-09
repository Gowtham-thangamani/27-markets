import { TokensService } from './tokens.service';

describe('TokensService — JWT algorithm pinning (L3)', () => {
  const make = () => {
    const jwt = { verifyAsync: jest.fn().mockResolvedValue({}), signAsync: jest.fn().mockResolvedValue('t') } as any;
    const config = { get: jest.fn().mockReturnValue('a-secret') } as any;
    return { tokens: new TokensService(jwt, config), jwt };
  };

  it('pins HS256 when verifying an access token', async () => {
    const { tokens, jwt } = make();
    await tokens.verifyAccess('token');
    expect(jwt.verifyAsync.mock.calls[0][1]).toEqual(expect.objectContaining({ algorithms: ['HS256'] }));
  });

  it('pins HS256 when verifying a refresh token', async () => {
    const { tokens, jwt } = make();
    await tokens.verifyRefresh('token');
    expect(jwt.verifyAsync.mock.calls[0][1]).toEqual(expect.objectContaining({ algorithms: ['HS256'] }));
  });
});
