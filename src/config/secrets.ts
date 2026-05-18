// Centralized config loader with validation (restored from previous plan)

// Required environment variables for this service
// Core required environment variables. Platform-specific tokens are optional and
// should be provided per-account (via POST /v1/accounts) or set in .env when
// needed for integration tests / production.
export const REQUIRED_VARS = [
  "DATABASE_PATH",
  "API_PORT",
  "API_HOST",
  "DASHBOARD_PORT",
  "JWT_SECRET",
  "LOG_LEVEL",
];

function readRuntimeSettingValue(key: string): string | undefined {
  const envValue = (process.env as any)[key];
  if (envValue) return envValue;

  try {
    const crypto = require("crypto");
    const { getDb } = require("../db/sqlite");
    const db = getDb();
    const row = db.prepare("SELECT value_encrypted FROM runtime_settings WHERE key = ? LIMIT 1").get(key);
    if (!row?.value_encrypted) return undefined;

    const secret = process.env.JWT_SECRET || "fallback-secret-for-development-only";
    const keyBytes = crypto.createHash("sha256").update(secret).digest();
    const data = Buffer.from(row.value_encrypted, "base64");
    const iv = data.slice(0, 12);
    const tag = data.slice(12, 28);
    const ciphertext = data.slice(28);
    const decipher = crypto.createDecipheriv("aes-256-gcm", keyBytes, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  } catch {
    return undefined;
  }
}

// Load and validate configuration from environment
export function loadConfig(): { [key: string]: string } {
  const config: { [key: string]: string } = {};
  for (const key of REQUIRED_VARS) {
    const value = (process.env as any)[key];
    if (!value) {
      throw new Error(`Missing required env var: ${key}`);
    }
    (config as any)[key] = value as string;
  }
  // Optional: additional secrets for webhook/path-based usage
  if ((process.env as any)["WHATSAPP_WEBJS_API_KEY"]) {
    (config as any)["WHATSAPP_WEBJS_API_KEY"] = (process.env as any)["WHATSAPP_WEBJS_API_KEY"];
  }
  return config;
}

// Public accessor returning the canonical config used by the app
export type AppConfig = {
  DATABASE_PATH: string;
  API_PORT: string;
  API_HOST: string;
  DASHBOARD_PORT: string;
  JWT_SECRET: string;
  LOG_LEVEL: string;
  WHATSAPP_CLOUD_API_TOKEN: string;
  TELEGRAM_BOT_TOKEN: string;
  THREADS_ACCESS_TOKEN?: string;
  WHATSAPP_WEBJS_API_KEY?: string;
  TWITTER_BEARER_TOKEN?: string;
  TWITTER_API_KEY?: string;
  TWITTER_API_SECRET?: string;
  // Instagram integration (optional)
  INSTAGRAM_ACCESS_TOKEN?: string;
  INSTAGRAM_ALLOW_PRIVATE_API?: string;
  INSTAGRAM_BUSINESS_ACCOUNT_ID?: string;
  // Waha (self-hosted WhatsApp HTTP API)
  WAHA_BASE_URL?: string;
  WAHA_API_KEY?: string;
  WAHA_SESSION?: string;
  WAHA_WEBHOOK_URL?: string;
  // Telegram MTProto (gramjs / Telethon-style user account)
  TELEGRAM_API_ID?: string;
  TELEGRAM_API_HASH?: string;
  TELEGRAM_SESSION?: string;
};

export function getConfig(): AppConfig {
  const cfg = loadConfig();
  // Type assertions for required keys (guaranteed by loadConfig)
  const result: AppConfig = {
    DATABASE_PATH: cfg.DATABASE_PATH,
    API_PORT: cfg.API_PORT,
    API_HOST: cfg.API_HOST,
    DASHBOARD_PORT: cfg.DASHBOARD_PORT,
    JWT_SECRET: cfg.JWT_SECRET,
    LOG_LEVEL: cfg.LOG_LEVEL,
    // Optional platform tokens can come from env first, then runtime settings stored in SQLite
    WHATSAPP_CLOUD_API_TOKEN: readRuntimeSettingValue("WHATSAPP_CLOUD_API_TOKEN") || '',
    TELEGRAM_BOT_TOKEN: readRuntimeSettingValue("TELEGRAM_BOT_TOKEN") || '',
  } as AppConfig;
  // Optional Instagram fields (not strictly required to be present at startup)
  // Allow overriding via environment variables if not provided by REQUIRED_VARS
  const instagramAccess = readRuntimeSettingValue("INSTAGRAM_ACCESS_TOKEN") || (cfg as any).INSTAGRAM_ACCESS_TOKEN || (process.env as any).INSTAGRAM_ACCESS_TOKEN;
  if (instagramAccess) {
    (result as any).INSTAGRAM_ACCESS_TOKEN = instagramAccess;
  }
  const instagramAllow = readRuntimeSettingValue("INSTAGRAM_ALLOW_PRIVATE_API") || (process.env as any).INSTAGRAM_ALLOW_PRIVATE_API;
  if (instagramAllow !== undefined) {
    (result as any).INSTAGRAM_ALLOW_PRIVATE_API = instagramAllow;
  }
  // Optional IG business account id (used by Graph API)
  const igBizId = readRuntimeSettingValue("INSTAGRAM_BUSINESS_ACCOUNT_ID") || (cfg as any).INSTAGRAM_BUSINESS_ACCOUNT_ID || (process.env as any).INSTAGRAM_BUSINESS_ACCOUNT_ID;
  if (igBizId) {
    (result as any).INSTAGRAM_BUSINESS_ACCOUNT_ID = igBizId;
  }
  // Optional platform tokens read from process.env (do not require at startup)
  const threadsToken = readRuntimeSettingValue("THREADS_ACCESS_TOKEN");
  if (threadsToken) {
    (result as any).THREADS_ACCESS_TOKEN = threadsToken;
  }
  const webjsApiKey = readRuntimeSettingValue("WHATSAPP_WEBJS_API_KEY");
  if (webjsApiKey) {
    result.WHATSAPP_WEBJS_API_KEY = webjsApiKey;
  }
  const twitterBearer = readRuntimeSettingValue("TWITTER_BEARER_TOKEN");
  if (twitterBearer) {
    result.TWITTER_BEARER_TOKEN = twitterBearer;
  }
  const twitterApiKey = readRuntimeSettingValue("TWITTER_API_KEY");
  if (twitterApiKey) {
    result.TWITTER_API_KEY = twitterApiKey;
  }
  const twitterApiSecret = readRuntimeSettingValue("TWITTER_API_SECRET");
  if (twitterApiSecret) {
    result.TWITTER_API_SECRET = twitterApiSecret;
  }
  // Waha optional fields
  const wahaBaseUrl = readRuntimeSettingValue("WAHA_BASE_URL") || (process.env as any).WAHA_BASE_URL;
  if (wahaBaseUrl) result.WAHA_BASE_URL = wahaBaseUrl;
  const wahaApiKey = readRuntimeSettingValue("WAHA_API_KEY") || (process.env as any).WAHA_API_KEY;
  if (wahaApiKey) result.WAHA_API_KEY = wahaApiKey;
  const wahaSession = readRuntimeSettingValue("WAHA_SESSION") || (process.env as any).WAHA_SESSION;
  if (wahaSession) result.WAHA_SESSION = wahaSession;
  const wahaWebhookUrl = readRuntimeSettingValue("WAHA_WEBHOOK_URL") || (process.env as any).WAHA_WEBHOOK_URL;
  if (wahaWebhookUrl) result.WAHA_WEBHOOK_URL = wahaWebhookUrl;
  // Telegram MTProto optional fields
  const tgApiId = readRuntimeSettingValue("TELEGRAM_API_ID") || (process.env as any).TELEGRAM_API_ID;
  if (tgApiId) result.TELEGRAM_API_ID = tgApiId;
  const tgApiHash = readRuntimeSettingValue("TELEGRAM_API_HASH") || (process.env as any).TELEGRAM_API_HASH;
  if (tgApiHash) result.TELEGRAM_API_HASH = tgApiHash;
  const tgSession = readRuntimeSettingValue("TELEGRAM_SESSION") || (process.env as any).TELEGRAM_SESSION;
  if (tgSession) result.TELEGRAM_SESSION = tgSession;
  return result;
}
