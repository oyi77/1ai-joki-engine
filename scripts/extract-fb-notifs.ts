import * as fs from 'fs';

const script = fs.readFileSync('fb_state_notif_0.json', 'utf8');

// Find all JSON objects within the script
// The payload is often in a specific format like: "notif":{"notif_id":...}
const notifs = script.match(/"notif":\{.*?\}/g);
if (notifs) {
  console.log(`Found ${notifs.length} notif nodes`);
  for (let i = 0; i < Math.min(5, notifs.length); i++) {
    const notifStr = '{' + notifs[i] + '}';
    try {
      const obj = JSON.parse(notifStr);
      console.log(JSON.stringify(obj, null, 2));
    } catch (e) {
      // It might be nested inside other stringified JSON, so we just log the raw string
      console.log('Raw:', notifs[i].substring(0, 500));
    }
  }
}
