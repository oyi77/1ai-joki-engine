import { execFileSync } from 'child_process'
import { createHash } from 'crypto'

export interface TwitterCLIResult {
    success: boolean
    error?: string
    code?: string
}

export interface TwitterCLIOptions {
    logger?: (message: string) => void
    cliPath?: string
}

export interface TwitterCookieData {
    name: string
    value: string
    domain?: string
    hostOnly?: boolean
}

function extractTokens(cookieJson: string): { authToken: string; ct0: string } {
    try {
        const cookies: TwitterCookieData[] = JSON.parse(cookieJson)
        const authToken = cookies.find(c => c.name === 'auth_token')?.value ?? ''
        const ct0 = cookies.find(c => c.name === 'ct0')?.value ?? ''
        return { authToken, ct0 }
    } catch {
        return { authToken: '', ct0: '' }
    }
}

export class TwitterCLIAdapter {
    private authToken: string
    private ct0: string
    private cliPath: string
    private log: (msg: string) => void
    private _connected = false

    constructor(cookieJsonString: string, opts?: TwitterCLIOptions) {
        const { authToken, ct0 } = extractTokens(cookieJsonString)
        this.authToken = authToken
        this.ct0 = ct0
        this.cliPath = opts?.cliPath ?? 'twitter'
        this.log = opts?.logger ?? (() => {})
    }

    private env(): NodeJS.ProcessEnv {
        return {
            TWITTER_AUTH_TOKEN: this.authToken,
            TWITTER_CT0: this.ct0,
        }
    }

    private parseTwitterJSON(rawOutput: string): any {
        const trimmed = rawOutput.trim()
        const jsonStart = trimmed.indexOf('{')
        const clean = jsonStart >= 0 ? trimmed.slice(jsonStart) : trimmed
        try {
            return JSON.parse(clean)
        } catch {
            return { raw: clean }
        }
    }

    private async run(args: string[], timeout = 30_000): Promise<string> {
        return new Promise((resolve, reject) => {
            const { spawn } = require('child_process')
            const proc = spawn(this.cliPath, args, {
                env: { ...process.env, ...this.env() },
                timeout,
            })
            let stdout = ''
            let stderr = ''
            proc.stdout.on('data', (d: Buffer) => { stdout += d })
            proc.stderr.on('data', (d: Buffer) => { stderr += d })
            proc.on('close', (code: number | null) => {
                if (code === 0) resolve(stdout.trim())
                else reject(new Error(stderr.trim() || stdout.trim() || `twitter CLI exited ${code}`))
            })
        })
    }

    async connect(): Promise<void> {
        if (this._connected) return
        try {
            const out = await this.run(['status', '--json'])
            const parsed = this.parseTwitterJSON(out)
            if (parsed.ok && parsed.data?.authenticated) {
                this._connected = true
                this.log(`TwitterCLI connected as @${parsed.data.user.username}`)
            } else {
                throw new Error('Not authenticated')
            }
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e)
            this.log(`Connect failed: ${msg}`)
            throw new Error(`TwitterCLI auth failed: ${msg}`)
        }
    }

    async disconnect(): Promise<void> {
        this._connected = false
        this.log('TwitterCLI disconnected')
    }

    async replyToMessage(tweetId: string, message: string): Promise<TwitterCLIResult> {
        if (!this._connected) return { success: false, error: 'Not connected', code: 'NOT_CONNECTED' }
        if (!tweetId) return { success: false, error: 'tweetId required', code: 'MISSING_PARAM' }
        if (!message) return { success: false, error: 'message required', code: 'MISSING_PARAM' }

        try {
            this.log(`Replying to ${tweetId}: "${message.substring(0, 30)}..."`)
            const out = await this.run(['reply', tweetId, message, '--json'])
            const parsed = this.parseTwitterJSON(out)

            if (parsed.ok && parsed.data?.success) {
                this.log(`Reply sent: ${parsed.data.id}`)
                return { success: true }
            }

            const errMsg = parsed.error ?? parsed.message ?? JSON.stringify(parsed)
            this.log(`Reply failed: ${errMsg}`)
            return { success: false, error: errMsg, code: 'TWITTER_API_ERROR' }
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e)
            this.log(`Reply error: ${msg}`)
            return { success: false, error: msg, code: 'TWITTER_CLI_ERROR' }
        }
    }

    async sendMessage(_to: string, message: string): Promise<TwitterCLIResult> {
        if (!this._connected) return { success: false, error: 'Not connected', code: 'NOT_CONNECTED' }

        try {
            this.log(`Posting tweet: "${message.substring(0, 30)}..."`)
            const out = await this.run(['post', message, '--json'])
            const parsed = this.parseTwitterJSON(out)

            if (parsed.ok && parsed.data?.success) {
                this.log(`Tweet posted: ${parsed.data.id}`)
                return { success: true }
            }

            const errMsg = parsed.error ?? JSON.stringify(parsed)
            return { success: false, error: errMsg, code: 'TWITTER_API_ERROR' }
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e)
            this.log(`Post error: ${msg}`)
            return { success: false, error: msg, code: 'TWITTER_CLI_ERROR' }
        }
    }

    async getRateLimitStatus(): Promise<{ limit: number; remaining: number; reset: number } | null> {
        return null
    }
}

export function twitterCLICacheKey(cookie: string): string {
    return createHash('sha256').update(cookie.slice(0, 100)).digest('hex')
}
