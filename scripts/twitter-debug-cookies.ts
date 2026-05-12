import { chromium } from 'playwright-extra'
import stealth from 'puppeteer-extra-plugin-stealth'

async function main() {
  const COOKIE = process.env.TWITTER_COOKIE ?? ''

  const parsedCookies = COOKIE.split(';').map(pair => {
    const eq = pair.indexOf('=')
    if (eq < 0) return null
    const name = pair.slice(0, eq).trim()
    const value = pair.slice(eq + 1).trim()
    let domain = '.x.com'
    let actualDomain = 'x.com'
    if (name === 'lang') {
      domain = 'x.com'
      actualDomain = 'x.com'
    }
    return {
      name,
      value,
      domain,
      path: '/',
      secure: true,
      httpOnly: name === 'auth_token' || name === '_twitter_sess' || name === 'ct0',
    }
  }).filter(Boolean) as any[]

  console.log('Parsed cookies:')
  for (const c of parsedCookies) {
    console.log(`  ${c.name} = ${c.value.substring(0, 20)}... (domain=${c.domain}, httpOnly=${c.httpOnly})`)
  }

  const browser = await chromium.use(stealth()).launch({ headless: true })
  const ctx = await browser.newContext()

  await ctx.addCookies(parsedCookies)

  console.log('\nCookies after adding:')
  const actualCookies = await ctx.cookies('https://x.com')
  for (const c of actualCookies) {
    console.log(`  ${c.name} = ${c.value.substring(0, 20)}... (domain=${c.domain})`)
  }

  const page = await ctx.newPage()
  await page.goto('https://x.com/', { waitUntil: 'domcontentloaded', timeout: 15000 })
  await page.waitForTimeout(2000)

  console.log('\nHome URL:', page.url())
  console.log('Home Title:', await page.title())

  await browser.close()
}

main().catch(e => { console.error(e.message); process.exit(1) })