import { describe, test, expect, vi, beforeEach } from 'vitest'
import { InstagramPlaywrightAdapter } from './instagram-playwright'

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

describe('InstagramPlaywrightAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('constructor stores cookie string', () => {
    const adapter = new InstagramPlaywrightAdapter('sessionid=abc', { headless: true })
    expect(adapter).toBeDefined()
    expect(adapter.page).toBeNull()
  })

  test('connect sets up browser with cookies', async () => {
    const { chromium } = await import('playwright-extra')
    const mockPage = makeMockPage()
    const mockContext = makeMockContext(mockPage)
    const mockBrowser = makeMockBrowser(mockContext)
    ;(chromium.use as any).mockReturnValue({ launch: vi.fn().mockResolvedValue(mockBrowser) })

    const adapter = new InstagramPlaywrightAdapter(
      JSON.stringify([{ name: 'sessionid', value: 'abc123', domain: '.instagram.com', path: '/', secure: true }]),
      { headless: true }
    )
    await adapter.connect()
    expect(adapter.page).not.toBeNull()
  })

  test('connect handles raw cookie string format', async () => {
    const { chromium } = await import('playwright-extra')
    const mockPage = makeMockPage()
    const mockContext = makeMockContext(mockPage)
    const mockBrowser = makeMockBrowser(mockContext)
    ;(chromium.use as any).mockReturnValue({ launch: vi.fn().mockResolvedValue(mockBrowser) })

    const adapter = new InstagramPlaywrightAdapter(
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

    const adapter = new InstagramPlaywrightAdapter('sessionid=abc')
    await adapter.connect()
    await adapter.disconnect()
    expect(adapter.page).toBeNull()
  })

  test('commentOnPost throws when browser not connected', async () => {
    const adapter = new InstagramPlaywrightAdapter('sessionid=abc')
    await expect(adapter.commentOnPost('https://ig.com/p/abc', 'test')).rejects.toThrow('Browser not connected')
  })

  test('sendMessage throws when browser not connected', async () => {
    const adapter = new InstagramPlaywrightAdapter('sessionid=abc')
    await expect(adapter.sendMessage('userId', 'test')).rejects.toThrow('Browser not connected')
  })

  test('getRateLimitStatus returns expected shape', async () => {
    const adapter = new InstagramPlaywrightAdapter('sessionid=abc')
    const status = await adapter.getRateLimitStatus()
    expect(status).not.toBeNull()
    expect(status!.limit).toBe(200)
    expect(typeof status!.remaining).toBe('number')
  })
})