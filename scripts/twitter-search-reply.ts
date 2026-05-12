import { chromium } from 'playwright-extra'
import stealth from 'puppeteer-extra-plugin-stealth'
import { readFileSync } from 'fs'

async function main() {
  const COOKIE_JSON = process.env.TWITTER_COOKIE_JSON ?? '/tmp/twitter_cookies.json'
  const raw = readFileSync(COOKIE_JSON, 'utf8')
  const exported = JSON.parse(raw)

  const normalizeSameSite = (v: string | null | undefined) => {
    if (!v) return 'Lax'
    const upper = v.toLowerCase()
    if (upper === 'nostrict') return 'None'
    if (upper === 'strict') return 'Strict'
    if (upper === 'lax') return 'Lax'
    if (upper === 'none') return 'None'
    return 'Lax'
  }

  const parsedCookies = exported.map((c: any) => ({
    name: c.name,
    value: c.value,
    domain: c.hostOnly ? 'x.com' : (c.domain ?? '.x.com'),
    path: c.path ?? '/',
    secure: c.secure ?? false,
    httpOnly: c.httpOnly ?? false,
    sameSite: normalizeSameSite(c.sameSite),
    expires: c.session ? -1 : c.expirationDate,
  }))

  const browser = await chromium.use(stealth()).launch({ headless: true })
  const ctx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
  })
  await ctx.addCookies(parsedCookies)
  const page = await ctx.newPage()

  const query = process.env.SEARCH_QUERY ?? 'interesting'
  console.log(`Searching for: "${query}"`)
  await page.goto(`https://x.com/search?q=${encodeURIComponent(query)}&src=typed_query`, { waitUntil: 'domcontentloaded', timeout: 15000 })
  await page.waitForSelector('article', { timeout: 15000 })
  await page.waitForTimeout(3000)

  console.log('URL:', page.url())
  console.log('Title:', await page.title())

  const loggedIn = !(page.url().includes('/i/flow/login'))
  if (!loggedIn) { console.log('ERROR: Not logged in'); await browser.close(); return }

  const articleCount = await page.locator('article').count()
  console.log('Article count:', articleCount)

  if (articleCount === 0) {
    console.log('No articles yet - waiting more...')
    await page.waitForTimeout(5000)
    const retryCount = await page.locator('article').count()
    console.log('After wait - article count:', retryCount)
    if (retryCount === 0) { console.log('Still no tweets'); await browser.close(); return }
  }

  const tweetLinks = await page.evaluate(() => {
    const results: string[] = []
    for (const a of document.querySelectorAll('article')) {
      const link = a.querySelector('a[href*="/status/"]')
      if (link) results.push(link.getAttribute('href') ?? '')
    }
    return results.slice(0, 5)
  })
  console.log('Tweet links:', tweetLinks)

  if (tweetLinks.length === 0) { console.log('No tweet links found'); await browser.close(); return }

  const firstTweetPath = tweetLinks[0]
  const tweetId = firstTweetPath.match(/\/status\/(\d+)/)?.[1]
  console.log('First tweet ID:', tweetId)

  await page.goto(`https://x.com${firstTweetPath}`, { waitUntil: 'domcontentloaded', timeout: 15000 })
  await page.waitForSelector('[data-testid="tweet"]', { timeout: 15000 })
  await page.waitForTimeout(2000)
  console.log('Tweet URL:', page.url())

  const replyBtn = page.locator('[data-testid="reply"]').first()
  const replyCount = await replyBtn.count()
  console.log('Reply button:', replyCount)
  if (replyCount === 0) { console.log('No reply button'); await browser.close(); return }

  await replyBtn.click()
  await page.waitForTimeout(3000)
  console.log('URL after reply click:', page.url())

  if (!page.url().includes('/compose/post')) { console.log('Not on compose page'); await browser.close(); return }

  const textareas = await page.locator('[data-testid="tweetTextarea_0"]').count()
  console.log('tweetTextarea_0 count:', textareas)
  if (textareas === 0) { console.log('No textarea found'); await browser.close(); return }

  const replyText = process.env.REPLY_TEXT ?? 'Hello from Joki blast engine! 🚀'
  await page.locator('[data-testid="tweetTextarea_0"]').first().click()
  await page.waitForTimeout(500)
  await page.keyboard.type(replyText, { delay: 50 })
  await page.waitForTimeout(500)

  const sendBtn = page.locator('[data-testid="tweetButton"]').first()
  const sendCount = await sendBtn.count()
  console.log('Tweet button:', sendCount)
  if (sendCount === 0) { console.log('No tweet button'); await browser.close(); return }

  const box = await sendBtn.boundingBox()
  if (!box) { console.log('Button not visible'); await browser.close(); return }
  await page.mouse.dblclick(box.x + box.width / 2, box.y + box.height / 2)
  await page.waitForTimeout(3000)

  if (page.url().includes('/compose/post')) {
    console.log('ERROR: Still on compose page after send attempt')
    await browser.close()
    return
  }

  console.log('✅ Reply sent! Verifying...')
  await page.waitForTimeout(2000)
  const replies = await page.evaluate((text) => {
    const results: string[] = []
    for (const a of document.querySelectorAll('article')) {
      const t = a.textContent?.trim() || ''
      if (t.includes(text.substring(0, 20))) results.push(t.substring(0, 100))
    }
    return results
  }, replyText)
  console.log('Matching replies found:', replies.length)
  if (replies.length > 0) console.log('✅✅ Reply verified on tweet page!')
  else console.log('Reply not visible yet')

  await browser.close()
  console.log('Done.')
}

main().catch(e => { console.error(e.message); process.exit(1) })
