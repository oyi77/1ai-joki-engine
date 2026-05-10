import { chromium } from 'playwright-extra';
import type { Browser, BrowserContext, Page } from 'playwright';
import stealth from 'puppeteer-extra-plugin-stealth';
import { IAdapter, RateLimitStatus } from '../../../IAdapter';
import { findFacebookTargets, FacebookFinderResult } from './facebook-finder';
import { getNotifications, FacebookNotification } from './facebook-notif';

chromium.use(stealth());

export class FacebookPlaywrightAdapter implements IAdapter {
    private browser: Browser | null = null;
    private context: BrowserContext | null = null;
    private page: Page | null = null;
    private rawCookieString: string;

    constructor(private cookieJsonString: string, private opts?: { logger?: (message: string) => void }) {
        this.rawCookieString = cookieJsonString;
    }

    private log(message: string) {
        this.opts?.logger?.(`[FB-ROBUST] ${message}`);
    }

    async connect() {
        try {
            this.browser = await chromium.launch({ headless: false });
            this.context = await this.browser.newContext();
            this.page = await this.context.newPage();

            interface CookieData {
                domain: string;
                sameSite?: string;
                name?: string;
                value?: string;
                path?: string;
                secure?: boolean;
                httpOnly?: boolean;
                expirationDate?: number;
                url?: string;
            }
            const cookies = JSON.parse(this.rawCookieString).map((cookie: CookieData) => ({
                ...cookie,
                domain: cookie.domain.startsWith('.') ? cookie.domain : `.${cookie.domain}`,
                sameSite: cookie.sameSite === 'strict' ? 'Strict' : cookie.sameSite === 'no_restriction' ? 'None' : 'Lax',
            }));

            await this.context.addCookies(cookies);
            await this.context.setExtraHTTPHeaders({
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
            });
            this.log('Browser connected with stealth and cookies injected.');
        } catch (error) {
            this.log(`Error during connect: ${error}`);
            throw error;
        }
    }

    async disconnect() {
        try {
            await this.browser?.close();
            this.log('Browser disconnected successfully.');
        } catch (error) {
            this.log(`Error during disconnect: ${error}`);
            throw error;
        } finally {
            this.browser = null;
            this.context = null;
            this.page = null;
        }
    }

    async getRateLimitStatus(): Promise<RateLimitStatus | null> {
        return { limit: 1000, remaining: 999, reset: Date.now() + 3600000 };
    }

    async sendMessage(to: string, message: string): Promise<{ success: boolean; error?: string; code?: string }> {
        if (!this.page) throw new Error('Browser not connected');
        try {
            await this.page.goto(`https://www.facebook.com/messages/t/${to}`, { waitUntil: 'domcontentloaded' });
            const textBox = await this.page.waitForSelector('div[role="textbox"][contenteditable="true"]');

            if (!textBox) throw new Error('Could not find message input box');

            await textBox.fill(message);
            await textBox.press('Enter');

            this.log(`Message sent to ${to}`);
            return { success: true };
        } catch (error) {
            this.log(`Error sending message: ${error}`);
            return { success: false, error: String(error) };
        }
    }

    async searchPosts(query: string, limit?: number): Promise<FacebookFinderResult> {
        return findFacebookTargets(query, this.rawCookieString, limit);
    }

    async commentOnPost(postUrl: string, commentText: string): Promise<boolean> {
        if (!this.page) throw new Error('Browser not connected');
        try {
            await this.page.goto(postUrl, { waitUntil: 'domcontentloaded' });
            await this.page.waitForTimeout(3000);

            const textBox = await this.page.waitForSelector('div[role="textbox"][contenteditable="true"]');
            if (!textBox) throw new Error('Comment box not found');

            await textBox.fill(commentText);
            await textBox.press('Enter');
            this.log('Successfully commented on the post.');
            return true;
        } catch (error) {
            this.log(`Error commenting on post: ${error}`);
            throw error;
        }
    }

    async getNotifications(limit?: number, unreadOnly?: boolean): Promise<FacebookNotification[]> {
        return getNotifications(this.rawCookieString, limit, unreadOnly);
    }

    async checkUnreadDMsAndReply(replyMsg: string): Promise<number> {
        if (!this.page) throw new Error('Browser not connected');
        try {
            await this.page.goto('https://www.facebook.com/messages/t/', { waitUntil: 'domcontentloaded' });
            const unreadThreads = await this.page.$$('div[aria-label*="Unread"]');

            let replyCount = 0;
            for (const thread of unreadThreads) {
                await thread.click();
                await this.page.waitForTimeout(2000);

                const textBox = await this.page.waitForSelector('div[role="textbox"][contenteditable="true"]');
                if (textBox) {
                    await textBox.fill(replyMsg);
                    await textBox.press('Enter');
                    replyCount++;
                    await this.page.waitForTimeout(1000);
                }
            }
            this.log(`Replied to ${replyCount} unread threads.`);
            return replyCount;
        } catch (error) {
            this.log(`Error checking/replying to DMs: ${error}`);
            throw error;
        }
    }
}