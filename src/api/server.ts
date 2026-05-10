import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { createLogger, transports, format } from 'winston'
import { loadConfig, getConfig } from '../config/secrets'
import { initDatabase, initSqlJsDatabase, runMigrations } from '../db/sqlite'
import { accountsRouter } from '../routes/accounts'
import { templatesRouter } from '../routes/templates'
import { authMiddleware } from '../middleware'
import { postsRouter } from '../routes/posts'
import { jobsRouter, schedulesRouter, defaultJobQueue, startCronScheduler } from '../routes/jobs'
import { adaptersRouter } from '../routes/adapters'
import { webhooksRouter } from '../routes/webhooks'
import { settingsRouter } from '../routes/settings'
import { createCampaignsRouter } from '../routes/campaigns'
import { trackRouter } from '../routes/track'
import { blastRouter } from '../routes/blast'
import { CampaignsRepo } from '../repos/campaignsRepo'
import initializeJobWorker from '../workers/job-worker'
import type { Request, Response, NextFunction } from 'express'

const logger = createLogger({
  level: (process.env.LOG_LEVEL ?? 'info') as string,
  format: format.json(),
  transports: [new transports.Console({ format: format.simple() })],
})

export function createServer() {
  const app = express()
  app.use(helmet())
  app.use(cors())
  app.use(express.json())
  app.use((req: Request, _res: Response, next: NextFunction) => {
    logger.info(`${req.method} ${req.originalUrl} - ${req.ip}`)
    next()
  })
  app.get('/v1/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok' })
  })
  return app
}

export function wireCampaignStatusSync(
  queue: typeof defaultJobQueue,
  campaignsRepo = new CampaignsRepo()
) {
  // ✅ FIX #7: Use atomic transaction for campaign status updates
  queue.on('completed', (jobId: string) => {
    const existingPost = campaignsRepo.getPostByJobId(jobId)
    const completedStatus = existingPost?.platform === 'facebook' ? 'submitted' : 'posted'
    campaignsRepo.atomicMarkPostAndUpdateCampaign(jobId, completedStatus)
  })

  queue.on('failed', (jobId: string) => {
    campaignsRepo.atomicMarkPostAndUpdateCampaign(jobId, 'failed')
  })
}

export async function startServer() {
  loadConfig()
  const cfg = getConfig()
  // Initialize DB and run migrations. Prefer native better-sqlite3 but fall
  // back to sql.js (WASM) if the native module can't be loaded (useful when
  // running under a different Node version where native binaries aren't built).
  const dbPath = cfg.DATABASE_PATH || 'data/app.db'
  try {
    initDatabase(dbPath)
  } catch (err) {
    // Log warning and silently fall back to sql.js
    // eslint-disable-next-line no-console
    console.warn('better-sqlite3 unavailable, falling back to sql.js (WASM):', err instanceof Error ? err.message : String(err))
    // Await async sql.js initialization
    // If this throws, we let it propagate to the caller
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    await initSqlJsDatabase(dbPath)
  }
  runMigrations('./migrations')

  // ✅ FIX #6: Validate port configuration to prevent collisions
  const port = Number(cfg.API_PORT) || 3000
  const dashboardPort = Number(process.env.DASHBOARD_PORT || 3001)
  const wahaPort = Number(process.env.WAHA_BASE_URL?.split(':').pop() || 3000)

  // Check for port conflicts
  const allPorts = [port, dashboardPort]
  const uniquePorts = new Set(allPorts)

  if (uniquePorts.size !== allPorts.length) {
    const duplicatePorts = allPorts.filter((p, i) => allPorts.indexOf(p) !== i)
    throw new Error(
      `❌ PORT CONFLICT: Duplicate ports detected: ${[...new Set(duplicatePorts)].join(', ')}. ` +
        `Set API_PORT=${port}, DASHBOARD_PORT=${dashboardPort} to different values.`
    )
  }

  const app = createServer()
  app.use('/v1', authMiddleware)
  app.use('/v1/accounts', accountsRouter)
  app.use('/v1/templates', templatesRouter)
  app.use('/v1/posts', postsRouter)
  app.use('/v1/jobs', jobsRouter)
  app.use('/v1/schedules', schedulesRouter)
  app.use('/v1/adapters', adaptersRouter)
  app.use('/v1/webhooks', webhooksRouter)
  app.use('/v1/settings', settingsRouter)
  app.use('/v1/campaigns', createCampaignsRouter(defaultJobQueue))
  app.use('/v1/track', trackRouter)
  app.use('/v1/blast', blastRouter)
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    logger.error(err?.message ?? 'Unhandled error')
    res.status(500).json({ error: err?.message ?? 'Internal Server Error' })
  })
  const cronHandle = startCronScheduler(defaultJobQueue)
  wireCampaignStatusSync(defaultJobQueue)
  // Initialize worker to process queued jobs
  void initializeJobWorker(defaultJobQueue).catch((err) => {
    logger.error('Job worker failed to initialize:', err)
  })
  const server = app.listen(port, () => {
    logger.info(`API server listening on port ${port}`)
  })
  server.once('close', () => {
    if (cronHandle) {
      clearInterval(cronHandle)
    }
  })
  return server
}
