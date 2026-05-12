import { describe, test, expect, vi, beforeEach } from 'vitest'
import { ThreadsPlaywrightAdapter } from './threads-playwright'

vi.mock('playwright-extra', () => ({
  chromium: {
    use: vi.fn(() => ({
      launch: vi.fn().mockResolvedValue({
        newContext: vi.fn().mockResolvedValue({
          newPage: vi.fn().mockResolvedValue({
            goto: vi.fn().mockResolvedValue(null),
            waitForTimeout: vi.fn().mockResolvedValue(undefined),
            waitForSelector: vi.fn().mockResolvedValue({
              fill: vi.fn(),
              press: vi.fn(),
              click: vi.fn(),
            }),
            $: vi.fn().mockResolvedValue(null),
          }),
          addCookies: vi.fn(),
          setExtraHTTPHeaders: vi.fn(),
        }),
        close: vi.fn().mockResolvedValue(undefined),
      }),
    })),
  },
}))

vi.mock('puppeteer-extra-plugin-stealth', () => ({
  default: vi.fn(),
}))

function makeMockPage(overrides?: Record<string, any>) {
  return {
    goto: vi.fn().mockResolvedValue(null),
    waitForTimeout: vi.fn().mockResolvedValue(undefined),
    waitForSelector: vi.fn().mockResolvedValue({
      fill: vi.fn(),
      press: vi.fn(),
      click: vi.fn(),
    }),
    $: vi.fn().mockResolvedValue(null),
    ...overrides,
  }
}

function makeMockContext(mockPage: any) {
  return {
    newPage: vi.fn().mockResolvedValue(mockPage),
    addCookies: vi.fn(),
    setExtraHTTPHeaders: vi.fn(),
  }
}

function makeMockBrowser(mockContext: any) {
  return {
    newContext: vi.fn().mockResolvedValue(mockContext),
    close: vi.fn().mockResolvedValue(undefined),
  }
}

describe('ThreadsPlaywrightAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('constructor stores cookie string', () => {
    const adapter = new ThreadsPlaywrightAdapter('sessionid=abc', { headless: true })
    expect(adapter).toBeDefined()
    expect(adapter.page).toBeNull()
  })

  test('connect sets up browser with cookies for both domains', async () => {
    const { chromium } = await import('playwright-extra')
    const mockPage = makeMockPage()
    const mockContext = makeMockContext(mockPage)
    const mockBrowser = makeMockBrowser(mockContext)
    ;(chromium.use as any).mockReturnValue({ launch: vi.fn().mockResolvedValue(mockBrowser) })

    const adapter = new ThreadsPlaywrightAdapter(
      JSON.stringify([{ name: 'sessionid', value: 'abc123', domain: '.threads.net', path: '/', secure: true }]),
      { headless: true }
    )
    await adapter.connect()
    expect(adapter.page).not.toBeNull()
    // Called twice: once for threads.net, once for instagram.com (shared auth)
    expect(mockContext.addCookies).toHaveBeenCalledTimes(2)
  })

  test('connect handles raw cookie string format', async () => {
    const { chromium } = await import('playwright-extra')
    const mockPage = makeMockPage()
    const mockContext = makeMockContext(mockPage)
    const mockBrowser = makeMockBrowser(mockContext)
    ;(chromium.use as any).mockReturnValue({ launch: vi.fn().mockResolvedValue(mockBrowser) })

    const adapter = new ThreadsPlaywrightAdapter(
      'sessionid=abc123; csrftoken=tok456',
      { headless: true }
    )
    await adapter.connect()
    expect(mockContext.addCookies).toHaveBeenCalled()
  })

  test('disconnect cleans up', async () => {
    const { chromium } = await import('playwright-extra')
    const mockPage = makeMockPage()
    const mockContext = makeMockContext(mockPage)
    const mockBrowser = makeMockBrowser(mockContext)
    ;(chromium.use as any).mockReturnValue({ launch: vi.fn().mockResolvedValue(mockBrowser) })

    const adapter = new ThreadsPlaywrightAdapter('sessionid=abc')
    await adapter.connect()
    await adapter.disconnect()
    expect(adapter.page).toBeNull()
  })

  test('commentOnPost throws when browser not connected', async () => {
    const adapter = new ThreadsPlaywrightAdapter('sessionid=abc')
    await expect(adapter.commentOnPost('https://threads.net/post/abc', 'test')).rejects.toThrow('Browser not connected')
  })

  test('sendMessage throws when browser not connected', async () => {
    const adapter = new ThreadsPlaywrightAdapter('sessionid=abc')
    await expect(adapter.sendMessage('test', 'hello')).rejects.toThrow('Browser not connected')
  })

  test('sendMessage rejects empty message', async () => {
    const adapter = new ThreadsPlaywrightAdapter('sessionid=abc')
    const result = await adapter.sendMessage('user', '')
    expect(result.success).toBe(false)
    expect(result.code).toBe('INVALID_INPUT')
  })

  test('getRateLimitStatus returns expected shape', async () => {
    const adapter = new ThreadsPlaywrightAdapter('sessionid=abc')
    const status = await adapter.getRateLimitStatus()
    expect(status).not.toBeNull()
    expect(status!.limit).toBe(200)
    expect(typeof status!.remaining).toBe('number')
  })
})