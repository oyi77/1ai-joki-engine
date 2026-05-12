import { facebookSendDM } from '../src/blast/actions/facebook-dm'
import { getFacebookAdapter } from '../src/blast/actions/facebook-adapter-cache'

async function main() {
  const cookie = process.env.FB_COOKIE ?? ''
  if (!cookie) {
    console.error('Set FB_COOKIE env var')
    process.exit(1)
  }

  console.log('=== Facebook DM E2E Test ===\n')
  const result = await facebookSendDM('100036401781631', 'Test DM dari engine joki - ignore', cookie)
  console.log('Result:', result)

  const adapter = getFacebookAdapter(cookie)
  await adapter.disconnect()
  console.log('Done.')
}

main().catch(e => { console.error(e.message); process.exit(1) })