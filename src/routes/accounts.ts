import { Router } from 'express'
import { encrypt, sha256Hex } from '../utils/crypto'
import { AccountsRepo, Account } from '../repos/accountsRepo'
import type { DB } from '../db/sqlite'

const router = Router()

// Do NOT init DB at module import time. Tests should initialize the DB via
// vitest.setup or the server entrypoint. Provide a factory to obtain a repo
// instance lazily so importing this route doesn't force DB init.
let accountsRepo: AccountsRepo | null = null
export function getAccountsRepo(db?: DB) {
  if (accountsRepo) return accountsRepo
  accountsRepo = new AccountsRepo(db)
  return accountsRepo
}

(getAccountsRepo as unknown as { _reset?: () => void })._reset = () => {
  accountsRepo = null
}

/**
 * @route   GET /v1/accounts
 */
router.get('/', async (req, res) => {
  const repo = getAccountsRepo()
  const rows = repo.list()
  const out = rows.map((acc: Account) => ({
    id: acc.id,
    platform: acc.platform,
    username: acc.display_name,
    status: 'active',
    created_at: acc.created_at,
  }))
  res.json(out)
})

/**
 * @route   GET /v1/accounts/:id
 */
router.get('/:id', async (req, res) => {
  const { id } = req.params
  const repo = getAccountsRepo()
  const account = repo.findById(id)
  if (!account) return res.status(404).json({ error: 'Account not found' })
  res.json({
    id: account.id,
    platform: account.platform,
    username: account.display_name,
    status: 'active',
    created_at: account.created_at,
  })
})

/**
 * @route   POST /v1/accounts
 */
router.post('/', async (req, res) => {
  const { platform, username, email, credentials } = req.body

  if (!platform || !username || !credentials) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const encryptedValue = encrypt(credentials)
  const credentials_hash = sha256Hex(credentials)

  const repo = getAccountsRepo()
  const created = repo.create({
    platform,
    display_name: username,
    credentials_encrypted: encryptedValue,
  })

  res.status(201).json({ id: created.id, message: 'Account created successfully' })
})

/**
 * @route   PUT /v1/accounts/:id
 */
router.put('/:id', async (req, res) => {
  const { id } = req.params
  const repo = getAccountsRepo()
  const existing = repo.findById(id)
  if (!existing) return res.status(404).json({ error: 'Account not found' })

  const patch: Record<string, unknown> = {}
  if (req.body.platform !== undefined) patch.platform = req.body.platform
  if (req.body.username !== undefined) patch.display_name = req.body.username
  if (req.body.credentials !== undefined) patch.credentials_encrypted = encrypt(req.body.credentials)
  const ok = repo.update(id, patch)
  if (!ok) return res.status(404).json({ error: 'Account not found' })

  res.json({ message: 'Account updated' })
})

/**
 * @route   DELETE /v1/accounts/:id
 */
router.delete('/:id', async (req, res) => {
  const { id } = req.params
  const repo = getAccountsRepo()
  const ok = repo.delete(id)
  if (!ok) return res.status(404).json({ error: 'Account not found' })
  res.json({ message: 'Account deleted' })
})

export const accountsRouter = router
export default router
