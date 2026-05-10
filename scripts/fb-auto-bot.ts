import { FacebookPlaywrightAdapter } from '../src/adapters/providers/meta/facebook/facebook-playwright';

// Validate environment variable for JSON cookies
if (!process.env.FB_COOKIE) {
  throw new Error('Environment variable `FB_COOKIE` must be set with valid JSON string.');
}

(async function main(): Promise<void> {
  // Initialize the Facebook adapter
  const adapter = new FacebookPlaywrightAdapter(process.env.FB_COOKIE, { logger: console.log });

  try {
    // Connect to Facebook
    await adapter.connect();
    console.log('Connected to Facebook.');

    while (true) {
      try {
        // Search for relevant posts
        console.log('Searching for posts...');
        const posts = await adapter.searchPosts('joki tugas', 3); // Limit to 3 posts

        for (const postId of posts.postIds) {
          const postUrl = `https://www.facebook.com/${postId}`;
          console.log(`Commenting on post: ${postUrl}`);
          await adapter.commentOnPost(
            postUrl,
            'Butuh joki tugas cepat dan aman? Chat aja ke WA kita: wa.me/628123456789 atau Tele: t.me/jokicepat'
          );
        }

        // Check unread messages and reply
        console.log('Checking unread DMs...');
        const repliedCount = await adapter.checkUnreadDMsAndReply(
          'Halo! Butuh joki tugas cepat dan aman? Langsung aja chat ke WA kita: wa.me/628123456789 atau Tele: t.me/jokicepat ya kak!'
        );
        console.log(`${repliedCount} unread DMs replied.`);

        // Sleep for 5 minutes
        console.log('Sleeping for 5 minutes...');
        await new Promise((resolve) => setTimeout(resolve, 5 * 60 * 1000)); // 5 minutes cooldown

      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('An error occurred during the loop iteration:', errorMessage);
      }
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Script failed:', errorMessage);
    try {
      await adapter.disconnect();
    } catch (disconnectError: unknown) {
      const disconnectErrorMessage = disconnectError instanceof Error ? disconnectError.message : String(disconnectError);
      console.error('Error during disconnect:', disconnectErrorMessage);
    }
    process.exit(1);
  }
})();
