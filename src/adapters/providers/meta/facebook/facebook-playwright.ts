import type { Browser, BrowserContext, Page } from 'playwright';
import { IAdapter, RateLimitStatus } from '../../../IAdapter';
import { findFacebookTargets, FacebookFinderResult } from './facebook-finder';
import { getNotifications, FacebookNotification } from './facebook-notif';

export interface FacebookAdapterOptions {
    logger?: (message: string) => void;
    headless?: boolean;
}

export class FacebookPlaywrightAdapter implements IAdapter {
    private browser: Browser | null = null;
    private context: BrowserContext | null = null;
    private _page: Page | null = null;
    private rawCookieString: string;
    private opts: FacebookAdapterOptions;
    private _connected = false;

    get page(): Page | null {
        return this._page;
    }

    constructor(cookieJsonString: string, opts?: FacebookAdapterOptions) {
        this.rawCookieString = cookieJsonString;
        this.opts = opts ?? {};
    }

    private log(message: string) {
        this.opts?.logger?.(`[FB-ROBUST] ${message}`);
    }

    async connect() {
        if (this._connected) return
        try {
            const { chromium: chr } = await import('playwright-extra')
            const stealthPlugin = (await import('puppeteer-extra-plugin-stealth')).default
            const browserWithStealth = chr.use(stealthPlugin())
            this.browser = await browserWithStealth.launch({ headless: this.opts.headless ?? true });
            this.context = await this.browser.newContext();
            this._page = await this.context.newPage();

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

            let parsedCookies: CookieData[]
            try {
                parsedCookies = JSON.parse(this.rawCookieString)
            } catch {
                parsedCookies = this.rawCookieString.split(';').map(pair => {
                    const eq = pair.indexOf('=')
                    if (eq < 0) return null
                    return {
                        name: pair.slice(0, eq).trim(),
                        value: pair.slice(eq + 1).trim(),
                        domain: '.facebook.com',
                        path: '/',
                    } as CookieData
                }).filter((c): c is CookieData => c !== null)
            }

            const cookies = parsedCookies.map(c => ({
                name: c.name!,
                value: c.value!,
                domain: c.domain ?? '.facebook.com',
                path: c.path ?? '/',
                secure: !!c.secure,
                httpOnly: !!c.httpOnly,
                sameSite: (c.sameSite === 'strict' ? 'Strict' : c.sameSite === 'no_restriction' ? 'None' : 'Lax') as 'Strict' | 'None' | 'Lax',
            }));

            await this.context.addCookies(cookies);
            await this.context.setExtraHTTPHeaders({
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
            });
            this.log('Browser connected with stealth and cookies injected.');
            this._connected = true;
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
            this._page = null;
            this._connected = false;
        }
    }

    async getRateLimitStatus(): Promise<RateLimitStatus | null> {
        return { limit: 1000, remaining: 999, reset: Date.now() + 3600000 };
    }

    async sendMessage(to: string, message: string): Promise<{ success: boolean; error?: string; code?: string }> {
        if (!this._page) throw new Error('Browser not connected');
        try {
            await this._page.goto(`https://www.facebook.com/messages/t/${to}`, { waitUntil: 'domcontentloaded' });
            const textBox = await this._page.waitForSelector('div[role="textbox"][contenteditable="true"]');

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
        if (!this._page) throw new Error('Browser not connected');
        try {
            await this._page.goto(postUrl, { waitUntil: 'domcontentloaded' });
            await this._page.waitForTimeout(3000);

            const textBox = await this._page.waitForSelector('div[role="textbox"][contenteditable="true"]');
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
        if (!this._page) throw new Error('Browser not connected');
        try {
            await this._page.goto('https://www.facebook.com/messages/t/', { waitUntil: 'domcontentloaded' });
            const unreadThreads = await this._page.$$('div[aria-label*="Unread"]');

            let replyCount = 0;
            for (const thread of unreadThreads) {
                await thread.click();
                await this._page.waitForTimeout(2000);

                const textBox = await this._page.waitForSelector('div[role="textbox"][contenteditable="true"]');
                if (textBox) {
                    await textBox.fill(replyMsg);
                    await textBox.press('Enter');
                    replyCount++;
                    await this._page.waitForTimeout(1000);
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