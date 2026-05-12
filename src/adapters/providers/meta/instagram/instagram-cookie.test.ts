import { describe, test, expect, vi, beforeEach } from 'vitest';
import { InstagramCookieAdapter } from './instagram-cookie';
import { createHttpClient } from '../../../../utils/http-client';

vi.mock('../../../../utils/http-client', () => ({
  createHttpClient: vi.fn(() => ({
    post: vi.fn().mockResolvedValue({ status: 200, data: { status: 'ok' } }),
    get: vi.fn(),
  })),
  parseCookies: vi.fn((s: string) => s),
  default: { create: vi.fn() },
}));

describe('InstagramCookieAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('connect parses cookies', async () => {
    const adapter = new InstagramCookieAdapter('sessionid=abc; csrftoken=tok');
    await expect(adapter.connect()).resolves.toBeUndefined();
  });

  test('connect throws when cookie is empty', async () => {
    const adapter = new InstagramCookieAdapter('');
    await expect(adapter.connect()).rejects.toThrow('Instagram cookie not provided');
  });

  test('sendMessage calls internal configure endpoint and returns success', async () => {
    const mockPost = vi.fn().mockResolvedValue({ status: 200, data: { status: 'ok' } });
    vi.mocked(createHttpClient).mockReturnValue({ post: mockPost, get: vi.fn() } as any);
    const adapter = new InstagramCookieAdapter('sessionid=abc; csrftoken=tok');
    const res = await adapter.sendMessage('unused', 'Hello IG!');
    expect(res.success).toBe(true);
    expect(mockPost).toHaveBeenCalledWith('/api/v1/media/configure/', expect.any(String));
  });

  test('sendMessage returns failure on HTTP error', async () => {
    vi.mocked(createHttpClient).mockReturnValue({
      post: vi.fn().mockRejectedValue(new Error('Network Error')),
      get: vi.fn(),
    } as any);
    const adapter = new InstagramCookieAdapter('sessionid=abc; csrftoken=tok');
    const res = await adapter.sendMessage('unused', 'fail');
    expect(res.success).toBe(false);
    expect(res.code).toBe('IG_COOKIE_POST_ERROR');
  });

  test('replyToMessage calls comment endpoint', async () => {
    const mockPost = vi.fn().mockResolvedValue({ status: 200, data: { status: 'ok' } });
    vi.mocked(createHttpClient).mockReturnValue({ post: mockPost, get: vi.fn() } as any);
    const adapter = new InstagramCookieAdapter('sessionid=abc; csrftoken=tok');
    const res = await adapter.replyToMessage('media_123', 'Nice post!');
    expect(res.success).toBe(true);
    expect(mockPost).toHaveBeenCalledWith('/api/v1/media/media_123/comment/', expect.any(String));
  });

  test('getRateLimitStatus returns expected shape', async () => {
    const adapter = new InstagramCookieAdapter('sessionid=abc; csrftoken=tok');
    const status = await adapter.getRateLimitStatus();
    expect(status).not.toBeNull();
    expect(status!.limit).toBe(30);
    expect(typeof status!.remaining).toBe('number');
  });

  test('disconnect clears cookie', async () => {
    const mockPost = vi.fn().mockResolvedValue({ status: 200, data: { status: 'ok' } });
    vi.mocked(createHttpClient).mockReturnValue({ post: mockPost, get: vi.fn() } as any);
    const adapter = new InstagramCookieAdapter('sessionid=abc; csrftoken=tok');
    await adapter.connect();
    await adapter.disconnect();
    const res = await adapter.sendMessage('unused', 're-connect test');
    expect(res.success).toBe(true);
  });
});
