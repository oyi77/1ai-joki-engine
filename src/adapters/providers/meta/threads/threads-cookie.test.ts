import { describe, test, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { ThreadsCookieAdapter } from './threads-cookie';
import { createHttpClient } from '../../../../utils/http-client';

vi.mock('../../../../utils/http-client', () => ({
  createHttpClient: vi.fn(() => ({
    post: vi.fn(),
    get: vi.fn(),
  })),
  parseCookies: vi.fn((s: string) => s),
  default: { create: vi.fn() },
}));

function makeAdapter(cookie = 'sessionid=abc; csrftoken=ctoken') {
  return new ThreadsCookieAdapter(cookie);
}

describe('ThreadsCookieAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createHttpClient).mockReturnValue({
      post: vi.fn().mockResolvedValue({ status: 200, data: { status: 'ok' } }),
      get: vi.fn(),
    } as any)
  });

  test('connect parses cookies', async () => {
    const adapter = makeAdapter();
    await expect(adapter.connect()).resolves.toBeUndefined();
  });

  test('connect throws when cookie is empty', async () => {
    const adapter = new ThreadsCookieAdapter('');
    await expect(adapter.connect()).rejects.toThrow('Threads cookie not provided');
  });

  test('sendMessage calls configure_text_post_app_feed endpoint', async () => {
    const mockPost = vi.fn().mockResolvedValue({ status: 200, data: { status: 'ok' } });
    vi.mocked(createHttpClient).mockReturnValue({ post: mockPost, get: vi.fn() } as any);
    const adapter = makeAdapter();
    const res = await adapter.sendMessage('unused', 'Hello Threads!');
    expect(res.success).toBe(true);
    expect(mockPost).toHaveBeenCalledWith(
      '/api/v1/media/configure_text_post_app_feed/',
      expect.any(String),
    );
  });

  test('sendMessage returns failure on HTTP error', async () => {
    vi.mocked(createHttpClient).mockReturnValue({
      post: vi.fn().mockRejectedValue(new Error('Network Error')),
      get: vi.fn(),
    } as any)
    const adapter = makeAdapter();
    const res = await adapter.sendMessage('unused', 'fail');
    expect(res.success).toBe(false);
    expect(res.code).toBe('THREADS_COOKIE_POST_ERROR');
  });

  test('replyToMessage includes replied_to_id in text_post_app_info', async () => {
    const mockPost = vi.fn().mockResolvedValue({ status: 200, data: { status: 'ok' } });
    vi.mocked(createHttpClient).mockReturnValue({ post: mockPost, get: vi.fn() } as any);
    const adapter = makeAdapter();
    const res = await adapter.replyToMessage('post_456', 'Replying!');
    expect(res.success).toBe(true);
    const body: string = mockPost.mock.calls[0][1];
    const params = new URLSearchParams(body);
    const appInfo = JSON.parse(params.get('text_post_app_info') ?? '{}');
    expect(appInfo.replied_to_id).toBe('post_456');
  });

  test('replyToMessage returns failure on HTTP error', async () => {
    vi.mocked(createHttpClient).mockReturnValue({
      post: vi.fn().mockRejectedValue(new Error('Timeout')),
      get: vi.fn(),
    } as any)
    const adapter = makeAdapter();
    const res = await adapter.replyToMessage('post_789', 'fail');
    expect(res.success).toBe(false);
    expect(res.code).toBe('THREADS_COOKIE_REPLY_ERROR');
  });

test('getRateLimitStatus returns expected shape', async () => {
    const adapter = makeAdapter();
    const status = await adapter.getRateLimitStatus();
    expect(status).not.toBeNull();
    expect(status!.limit).toBe(30);
    expect(typeof status!.remaining).toBe('number');
  });

  test('sendMessage validation — empty message', async () => {
    const adapter = makeAdapter();
    const res = await adapter.sendMessage('unused', '');
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/not provided/i);
  });

  test('sendMessage detects rate limit / challenge required via 401', async () => {
    const mockPost = vi.fn().mockResolvedValue({ status: 401, data: { status: 'fail', message: 'Please wait' } });
    vi.mocked(createHttpClient).mockReturnValue({ post: mockPost, get: vi.fn() } as any);
    const adapter = makeAdapter();
    const res = await adapter.sendMessage('unused', 'test');
    expect(res.success).toBe(false);
    expect(res.code).toBe('IG_BLOCKED');
    expect(res.error).toContain('Rate limited');
  });

  test('replyToMessage detects anti-automation block (4415001)', async () => {
    const mockPost = vi.fn().mockResolvedValue({ status: 400, data: { status: 'fail', content: { error_code: 4415001 } } });
    vi.mocked(createHttpClient).mockReturnValue({ post: mockPost, get: vi.fn() } as any);
    const adapter = makeAdapter();
    const res = await adapter.replyToMessage('post_123', 'test');
    expect(res.success).toBe(false);
    expect(res.code).toBe('IG_BLOCKED');
  });
});
