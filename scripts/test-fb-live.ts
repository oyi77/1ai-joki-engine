/**
 * Live Facebook integration test — runs from inside the project
 * Usage: npx ts-node --transpile-only scripts/test-fb-live.ts
 */
import * as fs from 'fs'

async function main() {
  console.log('\n═══════════════════════════════════════')
  console.log('  LIVE FACEBOOK BLAST INTEGRATION TEST ')
  console.log('═══════════════════════════════════════\n')

  const cookieJson = fs.readFileSync(
    '/Users/paijo/.gemini/antigravity/brain/4e09742e-feec-4582-9249-166f2747d267/scratch/facebook_cookies.json',
    'utf8'
  )

  // ─── STEP 1: HTTP GraphQL comment ──────────────────────────────────
  console.log('STEP 1: HTTP GraphQL comment (no browser)...')
  const { postComment } = await import('../src/adapters/providers/meta/facebook/comment')
  const testPostId = '2673056416179903'
  const commentResult = await postComment(testPostId, 'Test dari Joki Engine 🚀', cookieJson)
  if (commentResult.success) {
    console.log(`  ✓ COMMENT SUCCESS — ID: ${commentResult.commentId}`)
  } else {
    console.log(`  ✗ COMMENT FAILED: ${commentResult.error}`)
  }

  // ─── STEP 2: Facebook target finder ────────────────────────────────
  console.log('\nSTEP 2: Facebook target finder...')
  const { findFacebookTargets } = await import('../src/adapters/providers/meta/facebook/facebook-finder')
  try {
    const res = await findFacebookTargets('jual beli online', cookieJson, 3)
    console.log(`  ✓ post IDs (${res.postIds.length}):`, res.postIds)
    console.log(`  ✓ user IDs (${res.userIds.length}):`, res.userIds)
  } catch (e: any) {
    console.log('  ✗ Finder error:', e.message)
  }

  // ─── STEP 3: Playwright headless browser auth check ─────────────────
  console.log('\nSTEP 3: Playwright headless browser auth check...')
  const { FacebookPlaywrightAdapter } = await import('../src/adapters/providers/meta/facebook/facebook-playwright')
  const adapter = new FacebookPlaywrightAdapter(cookieJson, {
    headless: true,
    logger: (m: string) => console.log(`  [PW] ${m}`)
  })
  try {
    await adapter.connect()
    const page = adapter.page!
    await page.goto('https://www.facebook.com', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3000)
    const title = await page.title()
    const url = page.url()
    console.log(`  Title: "${title}"`)
    console.log(`  URL: ${url}`)
    const loggedIn = !url.includes('login') && !title.toLowerCase().includes('log in') && !title.toLowerCase().includes('masuk')
    console.log(loggedIn
      ? '  ✓ AUTHENTICATED — cookies valid!'
      : '  ✗ NOT AUTHENTICATED — cookie may be expired')
    await adapter.disconnect()
  } catch (e: any) {
    console.log('  ✗ Playwright error:', e.message)
    await adapter.disconnect().catch(() => {})
  }

  console.log('\n═══════════════════════════════════════')
  console.log('  TEST COMPLETE')
  console.log('═══════════════════════════════════════\n')
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
