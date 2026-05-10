import axios from 'axios';
import fs from 'fs';

interface Cookie {
  name: string;
  value: string;
}

function parseCookies(raw: string): string {
  if (raw.startsWith('[')) {
    try {
      const arr: Cookie[] = JSON.parse(raw);
      return arr.map((c) => `${c.name}=${c.value}`).join('; ');
    } catch (e) { return raw; }
  }
  return raw;
}
async function main() {
  const cookieInput = process.argv[2];
  const cookieHeader = parseCookies(cookieInput);

  try {
    const client = axios.create({
      baseURL: 'https://mbasic.facebook.com',
      headers: {
        'Cookie': cookieHeader,
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1'
      }
    });

    console.log('Fetching mbasic.facebook.com/notifications.php...');
    const res = await client.get('/notifications.php');
    fs.writeFileSync('mbasic_fb_notifications.html', res.data);
    console.log('Saved to mbasic_fb_notifications.html');
    
    const html = res.data as string;
    let stripped = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    stripped = stripped.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    const text = stripped.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    console.log("Text content snippet:", text.substring(0, 500));
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Error:', error.message);
  }
}
main();
