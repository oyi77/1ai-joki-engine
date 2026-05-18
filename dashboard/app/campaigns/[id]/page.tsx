'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton'
import { CopyButton } from '@/components/ui/CopyButton'
import { PlatformIcon } from '@/components/ui/PlatformIcon'
import { useBlastCampaign } from '@/lib/hooks'
import { toast } from 'sonner'
import { Send, BarChart3 } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { ErrorResponse } from '@/lib/types'

export default function CampaignDetailPage() {
  const { id } = useParams()
  const [blastLoading, setBlastLoading] = useState(false)

  const { data: campaign, isLoading } = useQuery({
    queryKey: ['campaign', id],
    queryFn: async () => (await api.get(`/v1/campaigns/${id}`)).data,
    enabled: !!id,
  })

  const { blastMutation } = useBlastCampaign()
  const { mutate: blast } = blastMutation

  if (isLoading) return <LoadingSkeleton count={3} />

  if (!campaign) return <p className="text-slate-400">Campaign not found</p>

  const handleBlast = () => {
    setBlastLoading(true)
    const accountIds: Record<string, string> = {}
    if (campaign?.platforms) {
      for (const p of campaign.platforms) {
        accountIds[p] = ''
      }
    }
    blast(
      { campaignId: id as string, accountIds },
      {
        onSuccess: () => toast.success('Blast started'),
        onError: (e: ErrorResponse | Error) => {
          const message = e instanceof Error ? e.message : (e?.message ?? e?.error ?? 'Blast failed')
          toast.error(message)
        },
        onSettled: () => setBlastLoading(false),
      }
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl md:text-3xl font-bold">{campaign.name}</h1>
          <StatusBadge status={campaign.status} text={campaign.status} />
        </div>
        <Button onClick={handleBlast} disabled={blastLoading}>
          <Send className="w-4 h-4 mr-2" />
          {blastLoading ? 'Blasting...' : 'Blast Now'}
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="history">Blast History</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-sm text-slate-400">Content</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-100">{campaign.content}</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-sm text-slate-400">CTA Link</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <a href={campaign.cta_link} target="_blank" className="text-emerald-400 hover:underline text-sm">
                    {campaign.cta_link}
                  </a>
                  <CopyButton text={campaign.cta_link} />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-sm text-slate-400">Platforms</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 flex-wrap">
                  {(campaign.platforms ?? []).map((p: string) => (
                    <span key={p} className="inline-flex items-center gap-1 px-3 py-1 bg-slate-700 rounded-full text-sm">
                      <PlatformIcon platform={p} className="w-3 h-3" /> {p}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <p className="text-slate-400">Blast history will appear here.</p>
        </TabsContent>

        <TabsContent value="analytics">
          <p className="text-slate-400">Analytics coming soon.</p>
        </TabsContent>
      </Tabs>
    </div>
  )
}
