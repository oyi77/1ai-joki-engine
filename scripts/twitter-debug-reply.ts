import axios from 'axios'

async function main() {
  const cookie = process.env.TWITTER_COOKIE ?? ''
  if (!cookie) {
    console.error('Set TWITTER_COOKIE env var')
    process.exit(1)
  }

  const csrfMatch = cookie.match(/ct0=([^;]+)/)
  const csrfToken = csrfMatch?.[1] ?? ''

  const tweetId = process.env.TEST_TWEET_ID ?? '1916896833821266100'

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
    variables: {
      tweet_text: 'Test reply debug - ignore',
      reply: { in_reply_to_tweet_id: tweetId, exclude_reply_user_ids: [] },
      dark_request: false,
      media: { media_entities: [], possibly_sensitive: false },
      semantic_annotation_ids: [],
    },
    features: {
      tweetypie_unmention_optimization_enabled: true,
      responsive_web_edit_tweet_api_enabled: true,
      graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
      view_counts_everywhere_api_enabled: true,
      longform_notetweets_consumption_enabled: true,
      responsive_web_twitter_article_tweet_consumption_enabled: false,
      tweet_awards_web_tipping_enabled: false,
      freedom_of_speech_not_reach_fetch_enabled: true,
      standardized_nudges_misinfo: true,
      tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: false,
      longform_notetweets_rich_text_read_enabled: true,
      longform_notetweets_inline_media_enabled: false,
      responsive_web_graphql_exclude_directive_enabled: true,
      verified_phone_label_enabled: false,
      responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
      responsive_web_graphql_timeline_navigation_enabled: true,
      responsive_web_enhance_cards_enabled: false,
    },
    queryId: 'SoVnbfCycZ7fERGCwpZkYA',
  }

  console.log('Sending reply to tweet:', tweetId)
  const res = await client.post('/i/api/graphql/SoVnbfCycZ7fERGCwpZkYA/CreateTweet', body)
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