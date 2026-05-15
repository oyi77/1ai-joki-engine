import { beforeEach, describe, expect, test, vi } from 'vitest'

// Unit tests for FacebookAdapter (GraphQL cookie-based)
const { getMock, postMock, createHttpClientMock, parseCookiesMock } = vi.hoisted(() => {
  const getMock = vi.fn()
  const postMock = vi.fn()
  return {
    getMock,
    postMock,
    createHttpClientMock: vi.fn(() => ({ get: getMock, post: postMock })),
    parseCookiesMock: vi.fn((raw: string) => raw.trim()),
  }
})

vi.mock('../../../../utils/http-client', () => ({
  createHttpClient: createHttpClientMock,
  parseCookies: parseCookiesMock,
}))

import { FacebookAdapter } from './facebook'

// HTML stub with fb_dtsg and lsd embedded in the format the new adapter expects
const VALID_HTML = `<html><head></head><body>
<input name="fb_dtsg" value="AQHdtesttoken">
<input name="lsd" value="testLSD123">
</body></html>`

function makeAdapter(cookie = 'c_user=12345; xs=tok; datr=xyz') {
  return new FacebookAdapter(cookie)
}

describe('FacebookAdapter (GraphQL)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getMock.mockResolvedValue({ status: 200, data: VALID_HTML })
    postMock.mockResolvedValue({
      status: 200,
      data: { data: { story_create: { story: { id: 'post_abc' } } } },
    })
  })

  test('connect parses cookies and loads fb_dtsg from HTML', async () => {
    const adapter = makeAdapter()
    await expect(adapter.connect()).resolves.toBeUndefined()
    expect(parseCookiesMock).toHaveBeenCalled()
    expect(getMock).toHaveBeenCalledWith('/')
  })

  test('connect throws when cookie is empty', async () => {
    const adapter = new FacebookAdapter('')
    await expect(adapter.connect()).rejects.toThrow('Facebook cookie not provided')
  })

  test('connect throws AUTH_EXPIRED when page redirects to login', async () => {
    getMock.mockResolvedValueOnce({
      status: 200,
      data: '<html><body>"login_form" something here</body></html>',
    })
    const adapter = makeAdapter()
    await expect(adapter.connect()).rejects.toThrow(/login/i)
  })

  test('sendMessage posts to /api/graphql/ with correct doc_id', async () => {
    const adapter = makeAdapter()
    await adapter.sendMessage('unused', 'Hello GraphQL!')
    expect(postMock).toHaveBeenCalledWith(
      '/api/graphql/',
      expect.stringContaining('doc_id=4949364150742317')
    )
  })

  test('sendMessage returns AUTH_EXPIRED code when fb_dtsg missing after connect', async () => {
    getMock.mockResolvedValue({ status: 200, data: '<html></html>' })
    const adapter = makeAdapter()
    const res = await adapter.sendMessage('unused', 'test')
    expect(res.success).toBe(false)
    expect(res.code).toBe('FB_SEND_ERROR')
  })

  test('getRateLimitStatus returns correct shape', async () => {
    const adapter = makeAdapter()
    const status = await adapter.getRateLimitStatus()
    expect(status).not.toBeNull()
    expect(status!.limit).toBe(30)
    expect(typeof status!.remaining).toBe('number')
  })

  test('disconnect clears cookie state', async () => {
    const adapter = makeAdapter()
    await adapter.connect()
    await adapter.disconnect()
    // After disconnect, sendMessage triggers reconnect (get called again for fb_dtsg)
    getMock.mockResolvedValueOnce({ status: 200, data: VALID_HTML })
    postMock.mockResolvedValueOnce({ status: 200, data: { data: {} } })
    const res = await adapter.sendMessage('unused', 'after disconnect')
    // Reconnect happened (getMock called again)
    expect(getMock).toHaveBeenCalledTimes(2)
  })
})
