/**
 * Facebook Finder — cari groups/posts dan ekstrak target IDs.
 *
 * Menggunakan Facebook HTML page scraping (cookie-based).
 * Fallback ke data/targets.txt jika search tidak menghasilkan hasil.
 */

import { createHttpClient, parseCookies } from '../../../../utils/http-client'
import { getRandomTargets } from '../../../../utils/randomTargets'

export interface FacebookSearchFilters {
  creationTime?: 'today' | 'this_week' | 'this_month' | 'this_year'
  author?: 'friends' | 'groups' | 'public'
  group?: string
}

export interface FacebookFinderResult {
  postIds: string[]
  userIds: string[]
}

/**
 * Cari Facebook untuk group posts berdasarkan query.
 * Ekstrak post IDs (untuk comment) dan user IDs (untuk DM).
 *
 * @param query   Kata kunci pencarian
 * @param cookie  Raw browser session cookie string
 * @param limit   Max target yang di-return (default 30)
 * @param filters Advanced search filters
 */
export async function findFacebookTargets(
  query: string,
  cookie: string,
  limit: number = 30,
  filters?: FacebookSearchFilters
): Promise<FacebookFinderResult> {
  if (!cookie) {
    return fallbackToFile(limit)
  }

  const cookieHeader = parseCookies(cookie)

  try {
    // Try GraphQL search first for better filtering support
    try {
      const gqlResult = await findFacebookTargetsGraphQL(query, cookie, limit, filters)
      if (gqlResult.postIds.length > 0 || gqlResult.userIds.length > 0) {
        return gqlResult
      }
    } catch (e) {
      console.warn('[FacebookFinder] GraphQL search failed, falling back to HTML scraper:', e instanceof Error ? e.message : String(e))
    }

    // Fallback to HTML scraper
    const searchClient = createHttpClient({
      baseURL: 'https://www.facebook.com',
      timeout: 20_000,
      headers: {
        Cookie: cookieHeader,
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
    })

    const searchUrl = `/search/posts/?q=${encodeURIComponent(query)}`;
    const res = await searchClient.get(searchUrl)
    const html = String(res?.data || '')

    if (html.includes('"login_form"')) {
      console.warn('[FacebookFinder] Cookie expired (redirected to login), fallback ke targets.txt')
      return fallbackToFile(limit)
    }

    const postIds: string[] = []
    const userIds: string[] = []

    // Extract post_id dari initial state payload di HTML
    const postIdRegex = /"post_id":"(\d+)"/g
    let match: RegExpExecArray | null
    while ((match = postIdRegex.exec(html)) !== null) {
      if (!postIds.includes(match[1])) postIds.push(match[1])
    }
    
    // Extract ID dari posts URL pattern (biasanya di group_id/posts/post_id)
    const urlRegex = /"url":"https:\\\/\\\/www\.facebook\.com\\\/groups\\\/(\d+)\\\/posts\\\/(\d+)\\\/"/g
    while ((match = urlRegex.exec(html)) !== null) {
      const fullId = `${match[1]}_${match[2]}`
      if (!postIds.includes(fullId)) postIds.push(fullId)
    }

    if (postIds.length === 0 && userIds.length === 0) {
      return fallbackToFile(limit)
    }

     return {
       postIds: postIds.slice(0, limit),
       userIds: userIds.slice(0, limit),
     }
   } catch (e: unknown) {
     const error = e instanceof Error ? e : new Error(String(e))
     console.error('[FacebookFinder] Search error:', error.message)
     return fallbackToFile(limit)
   }
}

/**
 * Advanced search using Facebook GraphQL endpoint.
 */
async function findFacebookTargetsGraphQL(
  query: string,
  cookie: string,
  limit: number = 30,
  filters?: FacebookSearchFilters
): Promise<FacebookFinderResult> {
  const cookieHeader = parseCookies(cookie)
  
  // 1. Get tokens
  const pageClient = createHttpClient({
    baseURL: 'https://www.facebook.com',
    headers: { Cookie: cookieHeader }
  })
  const pageRes = await pageClient.get('/')
  const html = String(pageRes?.data || '')
  
  let fbDtsg = '';
  const dtsgMatch = html.match(/"DTSGInitialData",\[\],\{"token":"([^"]+)"\}/) || html.match(/"name":"fb_dtsg","value":"([^"]+)"/);
  if (dtsgMatch) fbDtsg = dtsgMatch[1];
  
  if (!fbDtsg) throw new Error('Could not extract fb_dtsg')

  // 2. Search Mutation
  const gqlClient = createHttpClient({
    baseURL: 'https://www.facebook.com',
    headers: {
      'Cookie': cookieHeader,
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  })

  const variables = JSON.stringify({
    count: limit,
    cursor: null,
    params: {
      bqf: "[]",
      browse_sesid: `ses_${Date.now()}`,
      query: query,
      search_surface: "POSTS_SURFACE",
      filters: buildFilters(filters)
    },
    scale: 1
  })

  const params = new URLSearchParams()
  params.append('fb_dtsg', fbDtsg)
  params.append('variables', variables)
  params.append('doc_id', '6012268648876713')

  const res = await gqlClient.post('/api/graphql/', params)
  const edges = res.data?.data?.search?.search_results?.edges || []
  
  const postIds: string[] = []
  const userIds: string[] = []

  for (const edge of edges) {
    const node = edge.node
    if (node?.__typename === 'Story') {
      postIds.push(node.legacy_story_id)
      if (node.author?.id) userIds.push(node.author.id)
    }
  }

  return { postIds, userIds }
}

function buildFilters(filters?: FacebookSearchFilters): string[] {
  if (!filters) return []
  const result: string[] = []
  if (filters.creationTime) {
    result.push(JSON.stringify({ name: "creation_time", args: filters.creationTime }))
  }
  if (filters.author) {
    result.push(JSON.stringify({ name: "author", args: filters.author }))
  }
  return result
}

/**
 * Fallback: read random targets dari data/targets.txt.
 * Heuristic: IDs dengan underscore (_) = postIds, numeric-only = userIds.
 */
function fallbackToFile(limit: number): FacebookFinderResult {
  const targets = getRandomTargets(limit)
  const postIds: string[] = []
  const userIds: string[] = []
  for (const t of targets) {
    if (t.includes('_')) {
      postIds.push(t)
    } else {
      userIds.push(t)
    }
  }
  return { postIds, userIds }
}
