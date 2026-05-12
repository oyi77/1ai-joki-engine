import { chromium } from 'playwright-extra'
import stealth from 'puppeteer-extra-plugin-stealth'

async function main() {
  const COOKIE = process.env.TWITTER_COOKIE ?? ''
  const cookies = COOKIE.split(';').map(pair => {
    const eq = pair.indexOf('=')
    if (eq < 0) return null
    return {
      name: pair.slice(0, eq).trim(),
      value: pair.slice(eq + 1).trim(),
      domain: '.x.com',
      path: '/',
    }
  }).filter(Boolean) as any[]

  const browser = await chromium.use(stealth()).launch({ headless: true })
  const ctx = await browser.newContext({
    cookies,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  })
  const page = await ctx.newPage()

  // Try user's own profile
  await page.goto('https://x.com/this_is_paijo', { waitUntil: 'domcontentloaded', timeout: 15000 })
  await page.waitForTimeout(3000)

  console.log('URL:', page.url())
  console.log('Title:', await page.title())
  const bodyText = await page.evaluate(() => document.body?.innerText?.substring(0, 400))
  console.log('Body (400):', bodyText)

  await browser.close()
}

main().catch(e => { console.error(e.message); process.exit(1) })