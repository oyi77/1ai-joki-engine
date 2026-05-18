'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { useCreateCampaign } from '@/lib/hooks'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import type { ErrorResponse } from '@/lib/types'

const PLATFORMS = ['facebook', 'instagram', 'twitter', 'threads', 'whatsapp', 'telegram']

export default function NewCampaignPage() {
  const router = useRouter()
  const { mutate: create, isPending } = useCreateCampaign()
  const [name, setName] = useState('')
  const [content, setContent] = useState('')
  const [ctaLink, setCtaLink] = useState('')
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])

  const togglePlatform = (p: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    )
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Name is required')
      return
    }
    if (!content.trim()) {
      toast.error('Content is required')
      return
    }
    if (selectedPlatforms.length === 0) {
      toast.error('Select at least one platform')
      return
    }
    create(
      { name: name.trim(), content: content.trim(), cta_link: ctaLink.trim(), platforms: selectedPlatforms },
      {
        onSuccess: (result: { id: string }) => {
          toast.success('Campaign created')
          router.push(`/campaigns/${result.id}`)
        },
        onError: (e: ErrorResponse | Error) => {
          const message = e instanceof Error ? e.message : (e?.message ?? e?.error ?? 'Failed to create')
          toast.error(message)
        },
      }
    )
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl md:text-3xl font-bold mb-6">New Campaign</h1>
      <Card>
        <CardHeader>
          <CardTitle>Campaign Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white"
                placeholder="Campaign name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Content</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white"
                placeholder="Post content or message template"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">CTA Link</label>
              <input
                type="url"
                value={ctaLink}
                onChange={(e) => setCtaLink(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white"
                placeholder="https://example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Platforms</label>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => togglePlatform(p)}
                    className={`px-3 py-1.5 rounded-md text-sm capitalize ${
                      selectedPlatforms.includes(p)
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Campaign'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
