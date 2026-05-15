import { FacebookAdapter } from './src/adapters/providers/meta/facebook/facebook'
import { decrypt } from './src/utils/crypto'
import { getDb, initDatabase } from './src/db/sqlite'
import * as dotenv from 'dotenv'

async function testLive() {
  dotenv.config()
  initDatabase('data/app.db')
  const db = getDb()
  const account = db.prepare("SELECT * FROM accounts WHERE platform = 'facebook' LIMIT 1").get() as any
  
  if (!account) {
    console.error("No Facebook account found in DB")
    process.exit(1)
  }

  console.log(`Testing live integration for: ${account.display_name}`)
  
  const rawCreds = account.credentials_encrypted.toString()
  let cookies = ''
  try {
    cookies = decrypt(rawCreds)
  } catch {
    cookies = rawCreds
  }

  const adapter = new FacebookAdapter(cookies, { logger: (m) => console.log(m) })
  
  console.log("Connecting...")
  await adapter.connect()
  
  console.log("Fetching notifications...")
  const notifs = await adapter.getNotifications(5)
  console.log(`Found ${notifs.length} notifications`)
  
  if (notifs.length > 0) {
    console.log("Marking first notification as read...")
    await adapter.markNotificationRead(notifs[0].id)
  }

  console.log("Searching for targets...")
  const targets = await adapter.searchPosts('business', 3)
  console.log(`Found ${targets.postIds.length} posts and ${targets.userIds.length} users`)

  console.log("Test complete.")
}

testLive().catch(console.error)
