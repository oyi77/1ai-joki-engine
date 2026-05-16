'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { 
  LayoutDashboard, 
  Send, 
  MessageSquare, 
  Users, 
  BarChart3, 
  Plus, 
  Zap,
  Activity,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUpRight
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import type { StatusType } from '@/components/ui/StatusBadge'
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import type { PlatformName } from '@/components/ui/PlatformIcon'
import { PlatformIcon } from '@/components/ui/PlatformIcon'
import type { Campaign, Job, PlatformHealthStatus } from '@/lib/types'

const mapJobStatusToType = (status?: string): StatusType => {
  switch (status) {
    case 'completed':
      return 'success'
    case 'running':
      return 'warning'
    case 'failed':
      return 'error'
    default:
      return 'neutral'
  }
}

const platformKeys: PlatformName[] = ['twitter', 'facebook', 'instagram', 'threads', 'whatsapp', 'telegram']

export default function OverviewPage() {
  const { data: campaigns, isLoading: cLoad } = useQuery<Campaign[]>({
    queryKey: ['campaigns'],
    queryFn: async () => (await api.get('/v1/campaigns')).data,
  })

  const { data: jobs, isLoading: jLoad } = useQuery<Job[]>({
    queryKey: ['jobs'],
    queryFn: async () => (await api.get('/v1/jobs')).data,
    refetchInterval: 5000,
  })

  const { data: adapters, isLoading: aLoad } = useQuery<PlatformHealthStatus>({
    queryKey: ['adapters'],
    queryFn: async () => (await api.get('/v1/adapters')).data,
  })

  const isLoading = cLoad || jLoad || aLoad

  if (isLoading) return <LoadingSkeleton count={5} />

  const totalCampaigns = campaigns?.length ?? 0
  const runningJobs = jobs?.filter((j: Job) => j.status === 'running' || j.status === 'pending')?.length ?? 0
  const completedToday = jobs?.filter((j: Job) => {
    const d = new Date(j.created_at ?? '')
    const today = new Date()
    return d.toDateString() === today.toDateString() && (j.status === 'completed' || j.status === 'submitted')
  })?.length ?? 0
  const failedJobs = jobs?.filter((j: Job) => j.status === 'failed')?.length ?? 0

  const recentActivity = [...(jobs ?? [])]
    .sort((a: Job, b: Job) => new Date(b.created_at ?? '').getTime() - new Date(a.created_at ?? '').getTime())
    .slice(0, 8)

  const stats = [
    { 
      label: 'Total Campaigns', 
      value: totalCampaigns, 
      icon: Zap, 
      color: 'text-emerald-400', 
      bg: 'bg-emerald-500/10',
      description: 'All time campaigns'
    },
    { 
      label: 'Pending Jobs', 
      value: runningJobs, 
      icon: Activity, 
      color: 'text-blue-400', 
      bg: 'bg-blue-500/10',
      description: 'Queued processes'
    },
    { 
      label: 'Completed Today', 
      value: completedToday, 
      icon: CheckCircle2, 
      color: 'text-emerald-500', 
      bg: 'bg-emerald-500/10',
      description: 'Successful blasts'
    },
    { 
      label: 'Failed Jobs', 
      value: failedJobs, 
      icon: AlertCircle, 
      color: 'text-red-400', 
      bg: 'bg-red-500/10',
      description: 'Needs attention'
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-100">Overview</h1>
        <p className="text-slate-500 mt-1">Welcome back. Here's what's happening with your engine.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.label} className="overflow-hidden group hover:border-emerald-500/50 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:-translate-y-1 transition-all duration-300 bg-slate-900/40 backdrop-blur-sm border-white/5 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center justify-between">
                <div className={`p-3 rounded-2xl ${stat.bg} ring-1 ring-white/5`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <ArrowUpRight className="w-5 h-5 text-slate-600 group-hover:text-emerald-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300" />
              </div>
              <div className="mt-5">
                <p className="text-3xl font-black text-slate-100 tracking-tight">{stat.value}</p>
                <p className="text-xs font-bold text-slate-400 mt-1.5 uppercase tracking-wider">{stat.label}</p>
              </div>
              <p className="text-[10px] text-slate-600 mt-4 font-medium uppercase tracking-widest">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-lg font-bold text-slate-200">Recent Activity</h2>
            <Button variant="ghost" size="sm" asChild className="text-xs text-slate-500 hover:text-emerald-400">
              <Link href="/jobs">View All Activity</Link>
            </Button>
          </div>
          
          {recentActivity.length === 0 ? (
            <EmptyState 
              icon="message" 
              title="No activity detected" 
              description="Your blast engine is waiting for commands. Start a campaign to see results." 
            />
          ) : (
            <div className="grid gap-3">
              {recentActivity.map((job: Job) => (
                <div key={job.id} className="group relative flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-900/50 rounded-2xl border border-white/5 hover:border-emerald-500/30 hover:bg-slate-900/80 hover:shadow-[0_0_20px_rgba(16,185,129,0.05)] transition-all duration-300 overflow-hidden gap-4 sm:gap-0">
                  <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-emerald-500/0 group-hover:bg-emerald-500/50 transition-all duration-300" />
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="p-3 rounded-2xl bg-slate-800/80 group-hover:bg-emerald-500/10 ring-1 ring-white/5 transition-colors">
                      <PlatformIcon platform={job.platform ?? ''} className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-200 capitalize">{job.type?.replace('-', ' ') || 'Process'}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-xs text-slate-400 font-medium tracking-wide">
                          {new Date(job.created_at ?? '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4 relative z-10 border-t border-slate-800/50 sm:border-0 pt-3 sm:pt-0">
                    <StatusBadge status={mapJobStatusToType(job.status)} />
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-xl" asChild>
                      <Link href={`/jobs/${job.id}`}><ArrowUpRight className="w-4 h-4" /></Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-8">
          <Card className="bg-gradient-to-br from-indigo-950/20 to-slate-950 border-indigo-500/10">
            <CardHeader>
              <CardTitle className="text-base font-bold text-slate-200">Platform Health</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {platformKeys.map((platform) => {
                  const health = adapters?.[platform]
                  return (
                    <div key={platform} className="flex flex-col gap-2 p-3 bg-slate-900/60 rounded-xl border border-slate-800/50">
                      <div className="flex items-center justify-between">
                        <PlatformIcon platform={platform} className="w-4 h-4 text-slate-400" />
                        <div className={`w-1.5 h-1.5 rounded-full ${health?.healthy ? 'bg-emerald-500' : 'bg-red-500'} shadow-[0_0_4px_rgba(16,185,129,0.5)]`} />
                      </div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{platform}</p>
                    </div>
                  )
                })}
              </div>
              <Button variant="outline" className="w-full text-xs" asChild>
                <Link href="/settings">Check Connections</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-emerald-500/5 border-emerald-500/10">
            <CardHeader>
              <CardTitle className="text-base font-bold text-slate-200">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Button asChild className="justify-start gap-3 bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20 border-none">
                <Link href="/blast-runner">
                  <Send className="w-4 h-4" />
                  <span>Launch New Blast</span>
                </Link>
              </Button>
              <Button variant="outline" asChild className="justify-start gap-3 border-slate-800 hover:bg-slate-800">
                <Link href="/campaigns/new">
                  <Plus className="w-4 h-4" />
                  <span>Create Campaign</span>
                </Link>
              </Button>
              <Button variant="outline" asChild className="justify-start gap-3 border-slate-800 hover:bg-slate-800">
                <Link href="/accounts">
                  <Users className="w-4 h-4" />
                  <span>Manage Accounts</span>
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
