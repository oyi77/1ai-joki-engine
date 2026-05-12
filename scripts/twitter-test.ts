import { twitterReply } from '../src/blast/actions/twitter-comment'

async function main() {
  const cookie = process.env.TWITTER_COOKIE ?? ''
  if (!cookie) {
    console.error('Set TWITTER_COOKIE env var (raw string)')
    process.exit(1)
  }

  const tweetId = process.env.TEST_TWEET_ID ?? '1916896833821266100'
  console.log('=== Twitter Reply E2E Test (Playwright) ===\n')
  console.log('Tweet ID:', tweetId)

  const result = await twitterReply(tweetId, 'Twitter reply via Playwright - please ignore', cookie)
  console.log('Result:', result)
}

main().catch(e => { console.error(e.message); process.exit(1) })