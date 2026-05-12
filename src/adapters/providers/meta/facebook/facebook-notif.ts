import { createHttpClient, parseCookies } from '../../../../utils/http-client'

export interface FacebookNotification {
  id: string
  title: string
  url: string
  isUnread: boolean
  creationTime: number
}

export async function getNotifications(
  cookie: string,
  limit: number = 10,
  unreadOnly: boolean = false
): Promise<FacebookNotification[]> {
    if (!cookie) throw new Error('No cookie provided')

    const cookieHeader = parseCookies(cookie)
    const commonHeaders = {
        'Cookie': cookieHeader,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1'
    }

    const pageClient = createHttpClient({
      baseURL: 'https://www.facebook.com',
      timeout: 15_000,
      headers: commonHeaders,
    })

    const pageRes = await pageClient.get('/')
    const html = String(pageRes?.data || '')

    if (html.includes('"login_form"')) {
      throw new Error('Cookie expired or invalid')
    }

    let fbDtsg = '';
    const dtsgMatch = html.match(/"DTSGInitialData",\[\],\{"token":"([^"]+)"\}/) || html.match(/"name":"fb_dtsg","value":"([^"]+)"/);
    if (dtsgMatch) fbDtsg = dtsgMatch[1];

    let lsd = '';
    const lsdMatch = html.match(/"LSD",\[\],\{"token":"([^"]+)"\}/);
    if (lsdMatch) lsd = lsdMatch[1];

    if (!fbDtsg) throw new Error('Could not extract fb_dtsg from page')

    const gqlClient = createHttpClient({
      baseURL: 'https://www.facebook.com',
      timeout: 20_000,
      headers: {
        ...commonHeaders,
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-FB-Friendly-Name': 'CometNotificationsDropdownQuery',
        'X-ASBD-ID': '129477'
      },
    })

    const variables = JSON.stringify({
      "count": limit,
      "environment": "MAIN_SURFACE",
      "menuUseEntryPoint": true,
      "scale": 1
    });

    const params = new URLSearchParams()
    params.append('fb_dtsg', fbDtsg)
    params.append('lsd', lsd)
    params.append('variables', variables)
    params.append('doc_id', '27180281571556607')

    const res = await gqlClient.post('/api/graphql/', params)
    
    const payload = res.data
    const edges = payload?.data?.viewer?.notifications_page?.edges || []
    
    const notifications: FacebookNotification[] = []
    
    for (const edge of edges) {
      if (edge?.node?.__typename === 'NotifPageNotificationRow') {
        const notif = edge.node.notif
        if (notif) {
          notifications.push({
            id: notif.id || notif.notif_id,
            title: notif.body?.text || 'Notification',
            url: notif.url,
            isUnread: notif.seen_state === 'UNSEEN_AND_UNREAD' || notif.seen_state === 'UNREAD',
            creationTime: notif.creation_time?.timestamp || Math.floor(Date.now() / 1000)
          })
        }
      }
    }

    if (unreadOnly) {
      return notifications.filter(n => n.isUnread)
    }
    return notifications
}
