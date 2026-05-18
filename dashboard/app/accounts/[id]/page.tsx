'use client'

import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton'
import { PlatformIcon } from '@/components/ui/PlatformIcon'
import { formatDate } from '@/lib/utils'
import type { Account } from '@/lib/types'

export default function AccountDetailPage() {
  const { id } = useParams()

  const { data: account, isLoading } = useQuery<Account>({
    queryKey: ['account', id],
    queryFn: async () => (await api.get(`/v1/accounts/${id}`)).data,
    enabled: !!id,
  })

  if (isLoading) return <LoadingSkeleton count={3} />

  if (!account) return <p className="text-slate-400">Account not found</p>

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <PlatformIcon platform={account.platform} />
        <h1 className="text-2xl md:text-3xl font-bold capitalize">
          {account.username || account.display_name || account.platform}
        </h1>
        <StatusBadge status={account.status} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="text-sm text-slate-400">Platform</span>
              <p className="capitalize">{account.platform}</p>
            </div>
            <div>
              <span className="text-sm text-slate-400">Username</span>
              <p>{account.username || '-'}</p>
            </div>
            <div>
              <span className="text-sm text-slate-400">Display Name</span>
              <p>{account.display_name || '-'}</p>
            </div>
            <div>
              <span className="text-sm text-slate-400">Status</span>
              <p>{account.status}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Timestamps</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="text-sm text-slate-400">Created</span>
              <p>{account.created_at ? formatDate(account.created_at) : '-'}</p>
            </div>
            <div>
              <span className="text-sm text-slate-400">Last Used</span>
              <p>{account.last_used ? formatDate(account.last_used) : '-'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
