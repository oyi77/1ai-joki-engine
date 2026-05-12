import { describe, test, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { TwitterCookieAdapter } from './twitter-cookie';
import { createHttpClient } from '../../../utils/http-client';

vi.mock('../../../utils/http-client', () => ({
  createHttpClient: vi.fn(() => ({
    post: vi.fn(),
    get: vi.fn(),
  })),
  parseCookies: vi.fn((s) => s),
  default: { create: vi.fn() },
}));

const TWEET_RESPONSE = {
  data: {
    data: { create_tweet: { tweet_results: { result: { rest_id: '1234567890' } } } },
  },
};

function makeAdapter(cookie = 'auth_token=abc; ct0=csrf_tok') {
  return new TwitterCookieAdapter(cookie);
}

describe('TwitterCookieAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createHttpClient).mockReturnValue({
      post: vi.fn(),
      get: vi.fn(),
    } as any)
  })

  test('connect parses cookies and extracts ct0 csrf token', async () => {
    const adapter = makeAdapter();
    await expect(adapter.connect()).resolves.toBeUndefined();
  });

  test('connect throws when cookie is empty', async () => {
    const adapter = new TwitterCookieAdapter('');
    await expect(adapter.connect()).rejects.toThrow('Twitter cookie not provided');
  });

  test('sendMessage posts tweet and returns success', async () => {
    const mockPost = vi.fn().mockResolvedValue(TWEET_RESPONSE);
    vi.mocked(createHttpClient).mockReturnValue({ post: mockPost, get: vi.fn() } as any);
    const adapter = makeAdapter();
    const res = await adapter.sendMessage('unused', 'Hello Twitter!');
    expect(res.success).toBe(true);
    const [url, body] = mockPost.mock.calls[0];
    expect(url).toContain('CreateTweet');
    expect(body.variables.tweet_text).toBe('Hello Twitter!');
  });

  test('sendMessage returns failure on HTTP error', async () => {
    vi.mocked(createHttpClient).mockReturnValue({
      post: vi.fn().mockRejectedValue(new Error('Timeout')),
      get: vi.fn(),
    } as any);
    const adapter = makeAdapter();
    const res = await adapter.sendMessage('unused', 'fail');
    expect(res.success).toBe(false);
    expect(res.code).toBe('TWITTER_COOKIE_POST_ERROR');
  });

  test('replyToMessage includes reply object with in_reply_to_tweet_id', async () => {
    const mockPost = vi.fn().mockResolvedValue(TWEET_RESPONSE);
    vi.mocked(createHttpClient).mockReturnValue({ post: mockPost, get: vi.fn() } as any);
    const adapter = makeAdapter();
    const res = await adapter.replyToMessage('tweet_999', 'Nice tweet!');
    expect(res.success).toBe(true);
    const [, body] = mockPost.mock.calls[0];
    expect(body.variables.reply.in_reply_to_tweet_id).toBe('tweet_999');
  });

  test('replyToMessage returns failure on HTTP error', async () => {
    vi.mocked(createHttpClient).mockReturnValue({
      post: vi.fn().mockRejectedValue(new Error('Network Error')),
      get: vi.fn(),
    } as any);
    const adapter = makeAdapter();
    const res = await adapter.replyToMessage('tweet_999', 'fail');
    expect(res.success).toBe(false);
    expect(res.code).toBe('TWITTER_COOKIE_REPLY_ERROR');
  });

  test('getRateLimitStatus returns expected shape', async () => {
    const adapter = makeAdapter();
    const status = await adapter.getRateLimitStatus();
    expect(status).not.toBeNull();
    expect(status!.limit).toBe(50);
    expect(typeof status!.remaining).toBe('number');
  });

  test('disconnect clears cookie', async () => {
    const adapter = makeAdapter();
    await adapter.connect();
    await adapter.disconnect();
    const mockPost = vi.fn().mockResolvedValue(TWEET_RESPONSE);
    vi.mocked(createHttpClient).mockReturnValue({ post: mockPost, get: vi.fn() } as any);
    const res = await adapter.sendMessage('unused', 're-connect test');
    expect(res.success).toBe(true);
  });

  test('sendMessage validation — empty message', async () => {
    const adapter = new TwitterCookieAdapter('auth_token=abc; ct0=tok');
    const res = await adapter.sendMessage('unused', '');
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/not provided/i);
  });
});
