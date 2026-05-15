import { createHttpClient, parseCookies } from '../../../../utils/http-client'

export type FacebookReactionType = 'LIKE' | 'LOVE' | 'CARE' | 'HAHA' | 'WOW' | 'SAD' | 'ANGRY'

/**
 * Like or React to a Facebook post.
 * 
 * @param feedbackId The feedback ID of the post (can be the post ID or extracted from HTML)
 * @param reaction   The type of reaction
 * @param cookie     Raw browser session cookie string
 */
export async function reactToPost(
  feedbackId: string,
  reaction: FacebookReactionType = 'LIKE',
  cookie: string
): Promise<{ success: boolean; error?: string }> {
  if (!cookie) throw new Error('No cookie provided')

  const cookieHeader = parseCookies(cookie)
  const commonHeaders = {
    'Cookie': cookieHeader,
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.5',
    'Origin': 'https://www.facebook.com',
    'Referer': 'https://www.facebook.com/',
    'X-FB-LSD': '', // Will be filled
    'X-ASBD-ID': '129477',
    'X-FB-Friendly-Name': 'CometFeedbackReactionMutation'
  }

  // 1. Get CSRF tokens from homepage
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

  // 2. Perform Reaction Mutation
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
      feedback_id: feedbackId,
      feedback_reaction_id: getReactionId(reaction),
      is_tracking_encrypted: true,
      subscribe_status: "SUBSCRIBED",
      actor_id: extractCUser(cookie),
      client_mutation_id: "1"
    },
    useDefaultActor: false
  })

  const params = new URLSearchParams()
  params.append('fb_dtsg', fbDtsg)
  params.append('lsd', lsd)
  params.append('variables', variables)
  params.append('doc_id', '6155595407483853') // Using a known working mutation ID for Comet

  const res = await gqlClient.post('/api/graphql/', params)
  
  if (res.data?.errors) {
    return { success: false, error: res.data.errors[0]?.message || 'GraphQL Error' }
  }

  return { success: true }
}

function getReactionId(type: FacebookReactionType): string {
  const map: Record<FacebookReactionType, string> = {
    'LIKE': '1',
    'LOVE': '2',
    'CARE': '16',
    'HAHA': '4',
    'WOW': '3',
    'SAD': '7',
    'ANGRY': '8'
  }
  return map[type]
}

function extractCUser(cookie: string): string {
  const match = cookie.match(/c_user=(\d+)/)
  return match ? match[1] : ''
}
