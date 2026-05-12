import { FacebookPlaywrightAdapter } from '../src/adapters/providers/meta/facebook/facebook-playwright'

async function main() {
  const cookieJson = process.env.FB_COOKIE_JSON ?? ''
  if (!cookieJson) {
    console.error('Set FB_COOKIE_JSON env var')
    process.exit(1)
  }

  const adapter = new FacebookPlaywrightAdapter(cookieJson, { logger: console.log })
  await adapter.connect()
  console.log('Connected')

  // Test searchPosts via HTML scraping
  console.log('\n--- Testing searchPosts (HTML scraping) ---')
  const result = await adapter.searchPosts('joki tugas', 3)
  console.log('Post IDs found:', result.postIds)
  console.log('User IDs found:', result.userIds)

  // Test comment on first post
  if (result.postIds.length > 0) {
    console.log('\n--- Testing comment on first post ---')
    const postUrl = `https://www.facebook.com/${result.postIds[0]}`
    console.log('URL:', postUrl)
    try {
      const success = await adapter.commentOnPost(
        postUrl,
        'Butuh joki tugas? Chat wa.me/628123456789'
      )
      console.log('Comment success?', success)
    } catch (e: any) {
      console.log('Comment error:', e.message)
    }
  } else {
    console.log('No posts found — checking HTML search page manually...')
  }

  await adapter.disconnect()
}

main().catch(e => { console.error(e.message); process.exit(1) })