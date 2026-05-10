import { chromium } from 'playwright';

function parseCookies(raw: string) {
  if (raw.startsWith('[')) {
    try {
      return JSON.parse(raw);
    } catch (e) { return []; }
  }
  return [];
}

async function main() {
  const cookieInput = process.argv[2];
  const cookies = parseCookies(cookieInput);

  if (cookies.length === 0) {
    console.error("No valid cookies provided.");
    return;
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  await context.addCookies(cookies);

  const page = await context.newPage();
  
  // docId is intentionally unused - we're intercepting GraphQL requests to extract it
  
  // Intercept GraphQL requests
  page.on('request', request => {
    const url = request.url();
    if (url.includes('/api/graphql/')) {
        const postData = request.postData();
        if (postData) {
            const params = new URLSearchParams(postData);
            const fnName = request.headers()['x-fb-friendly-name'] || params.get('fb_api_req_friendly_name');
            if (fnName && (fnName.toLowerCase().includes('notif') || fnName.toLowerCase().includes('search'))) {
                console.log(`Found GraphQL Request: ${fnName}`);
                console.log(`doc_id: ${params.get('doc_id')}`);
                console.log(`variables: ${params.get('variables')}`);
                console.log('---');
            }
        }
    }
  });

  console.log("Navigating to Facebook...");
  await page.goto('https://www.facebook.com');
  await page.waitForTimeout(3000);
  
  console.log("Clicking on Notifications button...");
  // Try to click the notifications bell. Usually it's an aria-label or SVG.
  // Using generic selector for notifications bell
  try {
      await page.click('[aria-label="Notifications"], [aria-label="Notifikasi"]');
      await page.waitForTimeout(3000);
  } catch (e) {
      console.log("Failed to click notifications via aria-label");
  }
  
  console.log("Searching for something to get search doc_id...");
  try {
      // Type into search bar and press enter
      await page.fill('input[type="search"]', 'joki');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(3000);
  } catch(e) {
      console.log("Failed to perform search");
  }

  await browser.close();
}

main();
