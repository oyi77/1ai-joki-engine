import { facebookPostComment } from '../src/blast/actions/facebook-comment'
import { findFacebookTargets } from '../src/adapters/providers/meta/facebook/facebook-finder'

async function main() {
  const cookie = process.env.FB_COOKIE ?? ''
  if (!cookie) {
    console.error('Set FB_COOKIE env var')
    process.exit(1)
  }

  console.log('=== Facebook Blast Action E2E Test ===\n')

  console.log('Step 1: Find posts via HTML scraping...')
  const result = await findFacebookTargets('joki tugas', cookie, 3)
  console.log('Post IDs:', result.postIds)

  if (result.postIds.length === 0) {
    console.log('No posts found')
    await adapter.disconnect()
    return
  }

  console.log('\nStep 2: Comment on first post via blast action...')
  const postId = result.postIds[0]
  console.log('Post ID:', postId)
  const commentResult = await facebookPostComment(
    postId,
    'Butuh joki tugas cepat dan terpercaya? Chat wa.me/628123456789 ya kak!',
    cookie
  )
  console.log('Result:', commentResult)

  await new Promise(r => setTimeout(r, 2000))
  const adapter = (await import('../src/blast/actions/facebook-adapter-cache')).getFacebookAdapter(cookie)
  await adapter.disconnect()

  console.log('\nDone.')
}

main().catch(e => { console.error(e.message); process.exit(1) })