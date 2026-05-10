import { createHttpClient, parseCookies } from '../../../utils/http-client'

export async function postComment(
  tweetId: string,
  message: string,
  cookie: string
): Promise<{ success: boolean; error?: string }> {
  if (!cookie) return { success: false, error: 'Cookie not provided' }
  if (!tweetId) return { success: false, error: 'Tweet ID not provided' }
  if (!message) return { success: false, error: 'Message not provided' }

  const ckHeader = parseCookies(cookie)
  const ct0Match = ckHeader.match(/ct0=([^;]+)/)
  const ct0 = ct0Match?.[1] ?? ''

  try {
    const client = createHttpClient({
      baseURL: 'https://twitter.com',
      timeout: 15_000,
      headers: {
        Cookie: ckHeader,
        'X-Csrf-Token': ct0,
        Authorization:
          'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA',
        'Content-Type': 'application/json',
        'X-Twitter-Active-User': 'yes',
        'X-Twitter-Auth-Type': 'OAuth2Session',
      },
    })

    const body = {
      variables: {
        tweet_text: message,
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
        tweet_awards_web_tipping_enabled: false,
        freedom_of_speech_not_reach_fetch_enabled: true,
        standardized_nudges_misinfo: true,
        longform_notetweets_rich_text_read_enabled: true,
        responsive_web_graphql_exclude_directive_enabled: true,
        verified_phone_label_enabled: false,
        responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
        responsive_web_graphql_timeline_navigation_enabled: true,
        responsive_web_enhance_cards_enabled: false,
      },
      queryId: 'SoVnbfCycZ7fERGCwpZkYA',
    }

    const res = await client.post('/i/api/graphql/SoVnbfCycZ7fERGCwpZkYA/CreateTweet', body)
    const resultTweetId = res?.data?.data?.create_tweet?.tweet_results?.result?.rest_id
    return { success: !!resultTweetId, error: resultTweetId ? undefined : 'Comment failed' }
  } catch (e: any) {
    return { success: false, error: e?.message ?? 'Twitter comment error' }
  }
}
