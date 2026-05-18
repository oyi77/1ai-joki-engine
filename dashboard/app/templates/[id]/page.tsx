'use client'

import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton'
import { CopyButton } from '@/components/ui/CopyButton'
import { formatDate } from '@/lib/utils'
import type { Template } from '@/lib/types'

export default function TemplateDetailPage() {
  const { id } = useParams()

  const { data: template, isLoading } = useQuery<Template>({
    queryKey: ['template', id],
    queryFn: async () => (await api.get(`/v1/templates/${id}`)).data,
    enabled: !!id,
  })

  if (isLoading) return <LoadingSkeleton count={3} />

  if (!template) return <p className="text-slate-400">Template not found</p>

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">{template.name}</h1>
        <StatusBadge status="info" text={template.type} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Template Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="text-sm text-slate-400">Name</span>
              <p>{template.name}</p>
            </div>
            <div>
              <span className="text-sm text-slate-400">Type</span>
              <p>{template.type}</p>
            </div>
            <div>
              <span className="text-sm text-slate-400">Variables</span>
              <p>{template.variables?.join(', ') || '-'}</p>
            </div>
            <div>
              <span className="text-sm text-slate-400">Created</span>
              <p>{template.created_at ? formatDate(template.created_at) : '-'}</p>
            </div>
            <div>
              <span className="text-sm text-slate-400">Updated</span>
              <p>{template.updated_at ? formatDate(template.updated_at) : '-'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Content</CardTitle>
              <CopyButton text={template.content} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-slate-300 bg-slate-900 p-3 rounded whitespace-pre-wrap max-h-96 overflow-auto">
              {template.content}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
