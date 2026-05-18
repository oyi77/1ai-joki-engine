'use client'

import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton'
import { PlatformIcon } from '@/components/ui/PlatformIcon'
import { formatDate } from '@/lib/utils'
import type { Job } from '@/lib/types'

export default function JobDetailPage() {
  const { id } = useParams()

  const { data: job, isLoading } = useQuery<Job>({
    queryKey: ['job', id],
    queryFn: async () => (await api.get(`/v1/jobs/${id}`)).data,
    enabled: !!id,
  })

  if (isLoading) return <LoadingSkeleton count={3} />

  if (!job) return <p className="text-slate-400">Job not found</p>

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        {job.platform && <PlatformIcon platform={job.platform} />}
        <h1 className="text-2xl md:text-3xl font-bold">Job {job.id}</h1>
        {job.status && <StatusBadge status={job.status} />}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Job Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="text-sm text-slate-400">Type</span>
              <p>{job.type || '-'}</p>
            </div>
            <div>
              <span className="text-sm text-slate-400">Platform</span>
              <p className="capitalize">{job.platform || '-'}</p>
            </div>
            <div>
              <span className="text-sm text-slate-400">Account ID</span>
              <p>{job.account_id || '-'}</p>
            </div>
            <div>
              <span className="text-sm text-slate-400">Status</span>
              <p>{job.status || '-'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Execution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="text-sm text-slate-400">Attempts</span>
              <p>{job.attempts ?? 0} / {job.max_attempts ?? 3}</p>
            </div>
            <div>
              <span className="text-sm text-slate-400">Progress</span>
              <p>{job.progress ?? 0}%</p>
            </div>
            <div>
              <span className="text-sm text-slate-400">Next Run</span>
              <p>{job.next_run_at ? formatDate(job.next_run_at) : '-'}</p>
            </div>
            <div>
              <span className="text-sm text-slate-400">Created</span>
              <p>{job.created_at ? formatDate(job.created_at) : '-'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {job.payload && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Payload</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm text-slate-300 bg-slate-900 p-3 rounded overflow-auto max-h-64">
              {typeof job.payload === 'string' ? job.payload : JSON.stringify(job.payload, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
