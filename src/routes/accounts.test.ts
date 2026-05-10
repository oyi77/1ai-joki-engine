import { describe, test, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import express from 'express'
import { getDb } from '../db/sqlite'
import { accountsRouter, getAccountsRepo } from './accounts'

beforeEach(() => {
  (getAccountsRepo as any)._reset?.()
})

async function startApp() {
  const app = express()
  app.use(express.json())
  app.use('/v1/accounts', accountsRouter)
  return new Promise<{ baseUrl: string; close: () => Promise<void> }>((resolve) => {
    const server = app.listen(0, () => {
      const addr = server.address() as any
      resolve({
        baseUrl: `http://127.0.0.1:${addr.port}`,
        close: () => new Promise((r) => server.close(() => r())),
      })
    })
  })
}

describe('Kripto Akun', () => {
  it('harus enkripsi dan dekripsi dengan benar', async () => {
    process.env.JWT_SECRET = 'test-secret'
    const { encrypt, decrypt } = await import('../utils/crypto')
    const original = 'my-credential'
    const encrypted = encrypt(original)
    const decrypted = decrypt(encrypted)
    expect(decrypted).toBe(original)
    expect(encrypted).not.toBe(original)
  })
})

describe('API Akun', () => {
  it('GET / mengembalikan array kosong awalnya', async () => {
    const { baseUrl, close } = await startApp()
    const res = await fetch(`${baseUrl}/v1/accounts`)
    const body = await res.json()
    await close()
    expect(res.status).toBe(200)
    expect(Array.isArray(body)).toBe(true)
  })

  it('POST / membuat akun dan mengembalikan id', async () => {
    const { baseUrl, close } = await startApp()
    const res = await fetch(`${baseUrl}/v1/accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform: 'telegram',
        username: 'testuser',
        credentials: 'secret-tok',
      }),
    })
    const body = (await res.json()) as any
    await close()
    expect(res.status).toBe(201)
    expect(body.id).toBeTruthy()
  })

  it('POST / returns 400 when missing required fields', async () => {
    const { baseUrl, close } = await startApp()
    const res = await fetch(`${baseUrl}/v1/accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform: 'telegram' }), // missing username + credentials
    })
    await close()
    expect(res.status).toBe(400)
  })

  it('DELETE /:id removes known account', async () => {
    const { baseUrl, close } = await startApp()
    const createRes = await fetch(`${baseUrl}/v1/accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform: 'twitter', username: 'usr', credentials: 'cred' }),
    })
    const { id } = (await createRes.json()) as any
    const delRes = await fetch(`${baseUrl}/v1/accounts/${id}`, { method: 'DELETE' })
    await close()
    expect(delRes.status).toBe(200)
  })

  it('DELETE /:id returns 404 for unknown id', async () => {
    const { baseUrl, close } = await startApp()
    const res = await fetch(`${baseUrl}/v1/accounts/does-not-exist`, { method: 'DELETE' })
    await close()
    expect(res.status).toBe(404)
  })
})
