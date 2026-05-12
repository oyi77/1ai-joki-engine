import axios from 'axios'

async function main() {
  const cookie = process.env.TWITTER_COOKIE ?? ''
  if (!cookie) {
    console.error('Set TWITTER_COOKIE env var')
    process.exit(1)
  }

  const csrfMatch = cookie.match(/ct0=([^;]+)/)
  const csrfToken = csrfMatch?.[1] ?? ''

  const userId = process.env.TEST_USER_ID ?? '1180816105176068096'

  const client = axios.create({
    baseURL: 'https://twitter.com',
    timeout: 15_000,
    headers: {
      Cookie: cookie,
      'X-Csrf-Token': csrfToken,
      Authorization: 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA',
      'Content-Type': 'application/json',
      'X-Twitter-Active-User': 'yes',
      'X-Twitter-Auth-Type': 'OAuth2Session',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    },
  })

  const body = {
    conversation_id: `${userId}-${userId}`,
    recipient_ids: false,
    request_id: String(Date.now()),
    text: 'Twitter DM test from debug - please ignore',
    cards_platform: 'Web-12',
    include_cards: 1,
    include_quote_count: true,
    dm_users: false,
  }

  console.log('Sending DM to user:', userId)
  const res = await client.post('/i/api/1.1/dm/new2.json', JSON.stringify(body))
  console.log('Status:', res.status)
  console.log('Response:', JSON.stringify(res.data, null, 2))
}

main().catch(e => {
  console.error('Error:', e.message)
  if (e.response) {
    console.error('Response status:', e.response.status)
    console.error('Response data:', JSON.stringify(e.response.data, null, 2))
  }
  process.exit(1)
})