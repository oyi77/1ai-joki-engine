import { chromium } from 'playwright'

async function main() {
  const COOKIE = process.env.TEST_FACEBOOK_COOKIE ?? ''
  const cookies = COOKIE.split(';').map(pair => {
    const [name, ...valueParts] = pair.trim().split('=')
    return { name: name.trim(), value: valueParts.join('='), domain: '.facebook.com', path: '/' }
  })

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
  const ctx = await browser.newContext({
    cookies,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  })
  const page = await ctx.newPage()

  await page.goto('https://www.facebook.com/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(3000)

  console.log('URL:', page.url())
  console.log('Title:', await page.title())

  const bodyText = await page.evaluate(() => document.body?.innerText ?? '')
  console.log('Body (300):', bodyText.substring(0, 300))

  const stats = await page.evaluate(() => ({
    links: document.querySelectorAll('a').length,
    divs: document.querySelectorAll('div').length,
  }))
  console.log('Stats:', stats)

  await browser.close()
}

main().catch(e => { console.error(e); process.exit(1) })