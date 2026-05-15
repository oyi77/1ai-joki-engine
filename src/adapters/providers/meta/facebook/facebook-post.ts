import { createHttpClient, parseCookies } from '../../../../utils/http-client'

/**
 * Create a new timeline post (status update) on Facebook.
 * 
 * @param message The text content of the post
 * @param cookie  Raw browser session cookie string
 * @param privacy Privacy setting ('EVERYONE', 'FRIENDS', 'SELF')
 */
export async function createPost(
  message: string,
  cookie: string,
  privacy: 'EVERYONE' | 'FRIENDS' | 'SELF' = 'EVERYONE'
): Promise<{ success: boolean; error?: string; postId?: string }> {
  if (!cookie) throw new Error('No cookie provided')

  const cookieHeader = parseCookies(cookie)
  const commonHeaders = {
    'Cookie': cookieHeader,
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Origin': 'https://www.facebook.com',
    'Referer': 'https://www.facebook.com/',
    'X-FB-LSD': '',
    'X-ASBD-ID': '129477',
    'X-FB-Friendly-Name': 'ComposerStoryCreateMutation'
  }

  // 1. Get tokens
  const pageClient = createHttpClient({
    baseURL: 'https://www.facebook.com',
    headers: commonHeaders
  })
  const pageRes = await pageClient.get('/')
  const html = String(pageRes?.data || '')
  
  let fbDtsg = '';
  const dtsgMatch = html.match(/"DTSGInitialData",\[\],\{"token":"([^"]+)"\}/) || html.match(/"name":"fb_dtsg","value":"([^"]+)"/);
  if (dtsgMatch) fbDtsg = dtsgMatch[1];

  let lsd = '';
  const lsdMatch = html.match(/"LSD",\[\],\{"token":"([^"]+)"\}/);
  if (lsdMatch) lsd = lsdMatch[1];

  if (!fbDtsg) throw new Error('Could not extract fb_dtsg')

  // 2. Create Post Mutation
  const gqlClient = createHttpClient({
    baseURL: 'https://www.facebook.com',
    headers: {
      ...commonHeaders,
      'X-FB-LSD': lsd,
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  })

  const variables = JSON.stringify({
    input: {
      composer_entry_point: "inline_composer",
      composer_source_surface: "timeline",
      idempotence_token: `idemp_${Date.now()}`,
      source: "WWW",
      attachments: [],
      audience: {
        privacy: {
          base_state: privacy,
          allow: [],
          deny: []
        }
      },
      message: {
        ranges: [],
        text: message
      },
      with_tags_ids: [],
      actor_id: extractCUser(cookie),
      client_mutation_id: "1"
    },
    displayCommentsFeedbackContext: null,
    displayCommentsContextEnableComment: null,
    displayCommentsContextIsAggregated: null,
    displayCommentsContextIsStorySet: null,
    feedLocation: "TIMELINE",
    feedbackSource: 0,
    focusCommentID: null,
    gridOrigin: null,
    scale: 1,
    privacySelectorRenderLocation: "COMET_STREAM",
    renderLocation: "timeline",
    useDefaultActor: false,
    inviteShortLinkKey: null
  })

  const params = new URLSearchParams()
  params.append('fb_dtsg', fbDtsg)
  params.append('lsd', lsd)
  params.append('variables', variables)
  params.append('doc_id', '6155595407483853')

  const res = await gqlClient.post('/api/graphql/', params)
  
  if (res.data?.errors) {
    return { success: false, error: res.data.errors[0]?.message || 'GraphQL Error' }
  }

  const postId = res.data?.data?.story_create?.story?.legacy_story_id
  return { success: true, postId }
}

function extractCUser(cookie: string): string {
  const match = cookie.match(/c_user=(\d+)/)
  return match ? match[1] : ''
}
