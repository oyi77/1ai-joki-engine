/**
 * Facebook Finder — cari groups/posts dan ekstrak target IDs.
 *
 * Menggunakan Facebook HTML page scraping (cookie-based).
 * Fallback ke data/targets.txt jika search tidak menghasilkan hasil.
 */

import { createHttpClient, parseCookies } from '../../../../utils/http-client'
import { getRandomTargets } from '../../../../utils/randomTargets'

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
 */
export async function findFacebookTargets(
  query: string,
  cookie: string,
  limit: number = 30
): Promise<FacebookFinderResult> {
  if (!cookie) {
    return fallbackToFile(limit)
  }

  const cookieHeader = parseCookies(cookie)

  try {
    // Gunakan page scraping biasa untuk menghindari error GraphQL doc_id missing variables
    const searchClient = createHttpClient({
      baseURL: 'https://www.facebook.com',
      timeout: 20_000,
      headers: {
        Cookie: cookieHeader,
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Upgrade-Insecure-Requests': '1',
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
      console.warn('[FacebookFinder] Tidak ada target dari search, fallback ke targets.txt')
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
