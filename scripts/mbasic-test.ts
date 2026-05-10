import axios from 'axios';

interface Cookie {
  name: string;
  value: string;
}

// Parse raw JSON or string cookies
function parseCookies(raw: string): string {
  if (raw.startsWith('[')) {
    try {
      const arr: Cookie[] = JSON.parse(raw);
      return arr.map((c) => `${c.name}=${c.value}`).join('; ');
    } catch (e) {
      return raw;
    }
  }
  return raw;
}

async function getNotifications(cookieHeader: string) {
  try {
    console.log('Fetching notifications from mbasic...');
    const res = await axios.get('https://mbasic.facebook.com/notifications', {
      headers: {
        'Cookie': cookieHeader,
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36'
      }
    });
    
    const html = res.data as string;
    
    // Look for notifications
    // In mbasic, unread notifications often have a specific style or are inside a table/div
    // Let's just grab the text of the first few links inside the notifications container
    const notifMatches = html.match(/<td valign="top" align="left">(.*?)<\/td>/g);
    
    if (notifMatches && notifMatches.length > 0) {
      console.log(`Found ${notifMatches.length} notification items.`);
      for (let i = 0; i < Math.min(5, notifMatches.length); i++) {
        // Strip HTML tags
        const text = notifMatches[i].replace(/<[^>]+>/g, '').trim();
        console.log(`- ${text}`);
      }
    } else {
      console.log('Could not parse notifications via standard regex. Here is a snippet of the page:');
      console.log(html.substring(0, 1000)); // Just print the title/header to see if logged in
      
      const titleMatch = html.match(/<title>(.*?)<\/title>/);
      console.log('Page Title:', titleMatch ? titleMatch[1] : 'Unknown');
    }
    
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Error fetching notifications:', error.message);
  }
}

async function searchFacebook(cookieHeader: string, query: string) {
  try {
    console.log(`\nSearching for "${query}" on mbasic...`);
    const res = await axios.get(`https://mbasic.facebook.com/search/?query=${encodeURIComponent(query)}`, {
      headers: {
        'Cookie': cookieHeader,
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36'
      }
    });
    
    const html = res.data as string;
    
    // Look for search results. Usually inside divs with specific classes or links
    const resultLinks = html.match(/<a href="([^"]+)"><span>([^<]+)<\/span><\/a>/g) || html.match(/<a[^>]+href="\/profile\.php\?id=[^>]+>(.*?)<\/a>/g);
    
    const titleMatch = html.match(/<title>(.*?)<\/title>/);
    
    console.log(`Page Title: ${titleMatch ? titleMatch[1] : 'Unknown'}`);
    
    if (resultLinks && resultLinks.length > 0) {
      console.log(`Found ${resultLinks.length} search result links.`);
      for (let i = 0; i < Math.min(5, resultLinks.length); i++) {
        console.log(`- ${resultLinks[i]}`);
      }
    } else {
      console.log('No search results found.');
    }
    
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Error searching Facebook:', error.message);
  }
}

async function main() {
  if (process.argv.length < 4) {
    console.log('Usage: ts-node mbasic-test.ts <cookieJson> <query>');
    return;
  }
  const cookieJson = process.argv[2];
  const query = process.argv[3];
  
  const cookieHeader = parseCookies(cookieJson);
  
  await getNotifications(cookieHeader);
  await searchFacebook(cookieHeader, query);
}

main();
