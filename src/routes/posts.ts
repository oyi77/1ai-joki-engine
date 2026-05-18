import { Router } from 'express'
import { PostsRepo } from '../repos/postsRepo'
import type { DB } from '../db/sqlite'

let postsRepo: PostsRepo | null = null
export function getPostsRepo(db?: DB) {
  if (postsRepo) return postsRepo
  postsRepo = new PostsRepo(db)
  return postsRepo
}

const router = Router()

/**
 * GET /v1/posts
 * List all posts, optionally filtered by campaign_id.
 */
router.get('/', (req, res) => {
  try {
    const repo = getPostsRepo()
    const { campaign_id } = req.query
    let posts
    if (campaign_id && typeof campaign_id === 'string') {
      posts = repo.findByCampaign(campaign_id)
    } else {
      posts = repo.findAll()
    }
    res.json(posts)
  } catch (e: unknown) {
    const errorMsg = e instanceof Error ? e.message : 'Internal error'
    res.status(500).json({ error: errorMsg })
  }
})

/**
 * GET /v1/posts/:id
 */
router.get('/:id', (req, res) => {
  try {
    const repo = getPostsRepo()
    const post = repo.findById(req.params.id)
    if (!post) return res.status(404).json({ error: 'Post not found' })
    res.json(post)
  } catch (e: unknown) {
    const errorMsg = e instanceof Error ? e.message : 'Internal error'
    res.status(500).json({ error: errorMsg })
  }
})

/**
 * PATCH /v1/posts/:id/status
 * Body: { status: 'pending' | 'queued' | 'posted' | 'failed' | 'submitted' }
 */
router.patch('/:id/status', (req, res) => {
  try {
    const repo = getPostsRepo()
    const { status, job_ids } = req.body ?? {}
    const validStatuses = ['pending', 'queued', 'posted', 'failed', 'submitted']
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` })
    }
    const ok = repo.updateStatus(req.params.id, status, job_ids)
    if (!ok) return res.status(404).json({ error: 'Post not found' })
    res.json({ id: req.params.id, status })
  } catch (e: unknown) {
    const errorMsg = e instanceof Error ? e.message : 'Internal error'
    res.status(500).json({ error: errorMsg })
  }
})

export const postsRouter = router
export default router
