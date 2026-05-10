import axios from 'axios';
import fs from 'fs';

async function main() {
  const html = fs.readFileSync('fb_search.html', 'utf8');
  
  const scripts = html.match(/https?:\/\/static\.xx\.fbcdn\.net\/rsrc\.php\/[a-zA-Z0-9_.\-/=?&]+/g) || [];
  const jsFiles = scripts.filter(s => s.includes('.js'));
  console.log(`Found ${jsFiles.length} JS files to check.`);
  
  const targetQuery2 = 'SearchCometResultsInitialResultsQuery';
  let found = false;

  for (let i = 0; i < Math.min(jsFiles.length, 50); i++) {
    const url = jsFiles[i];
    try {
      const res = await axios.get<string>(url, { timeout: 5000 });
      const js = res.data;
      if (js.includes(targetQuery2)) {
          console.log(`Found Search Query in ${url}`);
          const match = js.match(/id:"([0-9]{15,})"/);
          if (match) console.log(`search doc_id: ${match[1]}`);
          found = true;
      }
    } catch (e: unknown) {
      // Ignore errors
    }
  }

  if (!found) console.log("Not found.");
}

main();
