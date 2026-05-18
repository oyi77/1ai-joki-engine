'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import DataTable from '@/components/ui/DataTable'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Download, Send } from 'lucide-react'
import type { Lead } from '@/lib/types'

export default function LeadsPage() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('')

  const { data: leads, isLoading } = useQuery<Lead[]>({
    queryKey: ['leads'],
    queryFn: async () => (await api.get('/v1/webhooks/leads')).data,
  })

  const handoffMutation = useMutation({
    mutationFn: async (id: string) => api.post(`/v1/webhooks/leads/${id}/handoff`, {}),
    onSuccess: () => {
      toast.success('Lead handed off!')
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    },
  })

  const filtered = (leads ?? []).filter((l: Lead) => {
    if (statusFilter && l.status !== statusFilter) return false
    return true
  })

  const columns = [
    { key: 'contact' as const, header: 'Contact' },
    { key: 'inbound_platform' as const, header: 'Platform' },
    { key: 'campaign_id' as const, header: 'Source Campaign' },
    {
      key: 'status' as const,
      header: 'Status',
      render: (row: Lead) => <StatusBadge status={row.status === 'new' ? 'info' : row.status === 'handoff' ? 'success' : 'warning'} text={row.status} />,
    },
  ]

  const actions = (row: Lead) => (
    <div className="flex gap-1">
      {row.status !== 'handoff' && (
        <Button variant="outline" size="sm" onClick={() => handoffMutation.mutate(row.id)}>
          <Send className="w-3 h-3 mr-1" /> Handoff
        </Button>
      )}
    </div>
  )

  if (isLoading) return <LoadingSkeleton count={5} variant="table" />

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-bold mb-6">Leads</h1>

      <div className="flex gap-3 mb-4">
        <select
          className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-100"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="new">New</option>
          <option value="welcome_sent">Welcome Sent</option>
          <option value="handoff">Handoff</option>
          <option value="converted">Converted</option>
        </select>
        <Button variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" /> Export CSV
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        actions={actions}
        searchable
        searchPlaceholder="Search leads..."
        emptyTitle="No leads yet"
        emptyDescription="Leads will appear when users message your accounts."
      />
    </div>
  )
}
