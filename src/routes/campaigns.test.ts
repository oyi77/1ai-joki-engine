import { describe, test, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import express from 'express'
import { createCampaignsRouter, getCampaignsRepo } from './campaigns'

// Reset module-level singleton between tests
beforeEach(() => {
  (getCampaignsRepo as any)._reset?.()
})

function makeQueue() {
  return { enqueuePostJob: vi.fn().mockResolvedValue('job_test_001') }
}

async function startApp(queue = makeQueue()) {
  const app = express()
  app.use(express.json())
  app.use('/v1/campaigns', createCampaignsRouter(queue as any))
  return new Promise<{ baseUrl: string; close: () => Promise<void>; queue: typeof queue }>(
    (resolve) => {
      const server = app.listen(0, () => {
        const addr = server.address() as any
        resolve({
          baseUrl: `http://127.0.0.1:${addr.port}`,
          close: () => new Promise((r) => server.close(() => r())),
          queue,
        })
      })
    }
  )
}

describe('API Kampanye', () => {
  it('POST / membuat kampanye', async () => {
    const { baseUrl, close } = await startApp()
    const res = await fetch(`${baseUrl}/v1/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Summer Sale',
        content: 'Big summer sale!',
        cta_link: 'https://wa.me/628123',
        platforms: ['twitter', 'threads'],
      }),
    })
    const body = (await res.json()) as any
    await close()
    expect(res.status).toBe(201)
    expect(body.id).toBeTruthy()
    expect(body.name).toBe('Summer Sale')
    expect(body.platforms).toEqual(['twitter', 'threads'])
  })

  it('POST / mengembalikan 400 saat name hilang', async () => {
    const { baseUrl, close } = await startApp()
    const res = await fetch(`${baseUrl}/v1/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'test', platforms: ['twitter'] }),
    })
    await close()
    expect(res.status).toBe(400)
  })

  it('POST / mengembalikan 400 saat platforms kosong', async () => {
    const { baseUrl, close } = await startApp()
    const res = await fetch(`${baseUrl}/v1/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test', content: 'test', platforms: [] }),
    })
    await close()
    expect(res.status).toBe(400)
  })

  it('GET / mendaftar kampanye', async () => {
    const { baseUrl, close } = await startApp()
    await fetch(`${baseUrl}/v1/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'C1', content: 'hello', platforms: ['twitter'] }),
    })
    const res = await fetch(`${baseUrl}/v1/campaigns`)
    const body = (await res.json()) as any[]
    await close()
    expect(res.status).toBe(200)
    expect(Array.isArray(body)).toBe(true)
    expect(body.length).toBeGreaterThan(0)
  })

  it('GET /:id returns 404 for unknown', async () => {
    const { baseUrl, close } = await startApp()
    const res = await fetch(`${baseUrl}/v1/campaigns/nonexistent`)
    await close()
    expect(res.status).toBe(404)
  })

  it('POST /:id/blast enqueues jobs per platform', async () => {
    const queue = makeQueue()
    const { baseUrl, close } = await startApp(queue)
    // Create campaign
    const createRes = await fetch(`${baseUrl}/v1/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Blast Test',
        content: 'Test blast content',
        cta_link: 'https://wa.me/628',
        platforms: ['twitter', 'threads'],
      }),
    })
    const campaign = (await createRes.json()) as any
    // Blast
    const blastRes = await fetch(`${baseUrl}/v1/campaigns/${campaign.id}/blast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        account_ids: { twitter: 'acc_tw_001', threads: 'acc_th_001' },
      }),
    })
    const blastBody = (await blastRes.json()) as any
    await close()
    expect(blastRes.status).toBe(202)
    expect(blastBody.posts.length).toBe(2)
    expect(queue.enqueuePostJob).toHaveBeenCalledTimes(2)
  })

  it('DELETE /:id removes campaign', async () => {
    const { baseUrl, close } = await startApp()
    const createRes = await fetch(`${baseUrl}/v1/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Del', content: 'bye', platforms: ['threads'] }),
    })
    const c = (await createRes.json()) as any
    const delRes = await fetch(`${baseUrl}/v1/campaigns/${c.id}`, { method: 'DELETE' })
    await close()
    expect(delRes.status).toBe(200)
  })
})
