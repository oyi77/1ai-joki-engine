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
  await page.goto('https://x.com/', { waitUntil: 'domcontentloaded', timeout: 15000 })
  await page.waitForTimeout(2000)

  console.log('Home URL:', page.url())
  const loggedIn = !(page.url().includes('/i/flow/login') || page.url().includes('/login'))
  console.log('Logged in:', loggedIn)
  if (!loggedIn) { await browser.close(); return }

  const tweetId = process.env.TEST_TWEET_ID ?? '2047748406978769132'
  await page.goto(`https://x.com/RoundtableSpace/status/${tweetId}`, { waitUntil: 'domcontentloaded', timeout: 15000 })
  await page.waitForTimeout(2000)

  const replyBtn = page.locator('[data-testid="reply"]').first()
  const replyCount = await replyBtn.count()
  console.log('Reply button:', replyCount)
  if (replyCount === 0) { await browser.close(); return }

  await replyBtn.click()
  await page.waitForTimeout(3000)
  console.log('URL after click:', page.url())

  if (page.url().includes('/compose/post')) {
    const textareas = await page.locator('[data-testid="tweetTextarea_0"]').count()
    console.log('tweetTextarea_0 count:', textareas)

    if (textareas === 0) {
      const shortHTML = await page.evaluate(() => document.body?.innerHTML?.substring(0, 2000))
      console.log('DOM:', shortHTML)
      await browser.close()
      return
    }

    const replyText = process.env.REPLY_TEXT ?? 'Hello from Joki blast engine! 🚀'
    await page.locator('[data-testid="tweetTextarea_0"]').first().click()
    await page.waitForTimeout(500)

    await page.evaluate((text) => {
      const el = document.querySelector('[data-testid="tweetTextarea_0"]')
      el?.dispatchEvent(new Event('input', { bubbles: true }))
      el?.dispatchEvent(new Event('paste', { bubbles: true }))
    }, replyText)
    await page.keyboard.type(replyText, { delay: 50 })
    await page.waitForTimeout(500)

    const textareaContent = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="tweetTextarea_0"]')
      return { text: el?.textContent, html: el?.innerHTML?.substring(0, 200) }
    })
    console.log('Textarea content after type:', JSON.stringify(textareaContent))

    const sendBtn = page.locator('[data-testid="tweetButton"]').first()
    const sendCount = await sendBtn.count()
    console.log('Tweet button:', sendCount)
    if (sendCount > 0) {
      const btnDisabled = await sendBtn.isDisabled()
      console.log('Tweet button disabled:', btnDisabled)

      console.log('Trying mouse.click on button center...')
      const box = await sendBtn.boundingBox()
      if (box) {
        console.log('Button bounding box:', JSON.stringify(box))
        const cx = box.x + box.width / 2
        const cy = box.y + box.height / 2
        await page.mouse.click(cx, cy)
        await page.waitForTimeout(3000)
        console.log('URL after mouse.click:', page.url())
      }

      if (page.url().includes('/compose/post')) {
        console.log('Trying mouse.click on textarea then Enter...')
        const taBox = await page.locator('[data-testid="tweetTextarea_0"]').first().boundingBox()
        if (taBox) {
          await page.mouse.click(taBox.x + taBox.width / 2, taBox.y + taBox.height / 2)
          await page.waitForTimeout(200)
          await page.keyboard.press('Enter')
          await page.waitForTimeout(3000)
          console.log('URL after textarea click + Enter:', page.url())
        }
      }

      if (page.url().includes('/compose/post')) {
        const box2 = await sendBtn.boundingBox()
        if (box2) {
          await page.mouse.dblclick(box2.x + box2.width / 2, box2.y + box2.height / 2)
          await page.waitForTimeout(3000)
          console.log('URL after dblclick:', page.url())
        }
      }

      const finalUrl = page.url()
      console.log('Final URL:', finalUrl)

      if (!finalUrl.includes('/compose/post')) {
        console.log('✅ Reply sent! Navigating back to tweet to verify...')
        await page.waitForTimeout(2000)
        const repliesSection = await page.evaluate(() => {
          const articles = document.querySelectorAll('article')
          const results: any[] = []
          for (const a of articles) {
            const text = a.textContent?.trim() || ''
            if (text.includes('Joki blast engine')) {
              results.push(text.substring(0, 100))
            }
          }
          return results
        })
        console.log('Replies containing "Joki blast engine":', repliesSection.length)
        if (repliesSection.length > 0) {
          console.log('✅✅ Reply verified on tweet page!')
        } else {
          console.log('Reply not visible yet (may need refresh)')
        }
      } else {
        console.log('ERROR: Still on compose page - reply not sent')
      }

      await page.goto(`https://x.com/RoundtableSpace/status/${tweetId}`, { waitUntil: 'domcontentloaded', timeout: 15000 })
      await page.waitForTimeout(2000)
      console.log('Back on tweet page:', page.url())
    }
    await browser.close()
    return
  }

  const replyEls = await page.evaluate(() => {
    const results: any[] = []
    document.querySelectorAll('div,button,textarea').forEach(el => {
      const text = el.textContent?.trim() || ''
      const aria = el.getAttribute('aria-label') || ''
      if (text.toLowerCase().includes('reply') || aria.toLowerCase().includes('reply')) {
        results.push({ tag: el.tagName, testid: el.getAttribute('data-testid'), ariaLabel: aria })
      }
    })
    return results
  })
  console.log('Reply elements:', JSON.stringify(replyEls, null, 2))
  await browser.close()
}

main().catch(e => { console.error(e.message); process.exit(1) })
