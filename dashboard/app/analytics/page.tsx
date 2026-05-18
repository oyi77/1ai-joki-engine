'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts'
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton'
import { dateRanges } from '@/lib/utils'
import { BarChart3, TrendingUp } from 'lucide-react'

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState('last7')

  const { data: stats, isLoading } = useQuery({
    queryKey: ['analytics', dateRange],
    queryFn: async () => {
      const from = dateRanges[dateRange as keyof typeof dateRanges]()
      const res = await api.get(`/v1/track/stats${from ? `?from=${from}` : ''}`)
      return res.data
    },
  })

  if (isLoading) return <LoadingSkeleton count={4} />

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">Analytics</h1>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-[180px] bg-slate-800 border-slate-700">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="last7">Last 7 Days</SelectItem>
            <SelectItem value="last30">Last 30 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-400">CTR</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-emerald-400">{stats?.ctr || 0}%</p></CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-400">Success Rate</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-emerald-400">{stats?.success_rate || 0}%</p></CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-400">Leads</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-blue-400">{stats?.leads || 0}</p></CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-400">Clicks</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-amber-400">{stats?.clicks || 0}</p></CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-400">Conversions</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-purple-400">{stats?.conversions || 0}</p></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader><CardTitle>Clicks Over Time</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats?.clicks_by_day || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} />
                <Legend />
                <Line type="monotone" dataKey="clicks" stroke="#10b981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader><CardTitle>Success by Platform</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats?.by_platform || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="platform" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} />
                <Legend />
                <Bar dataKey="success" fill="#10b981" />
                <Bar dataKey="failed" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader><CardTitle>Lead Sources</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats?.lead_sources || []}
                  dataKey="count"
                  nameKey="source"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#10b981"
                >
                  {(stats?.lead_sources || []).map((_: unknown, i: number) => (
                    <Cell key={i} fill={['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444'][i % 5]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader><CardTitle>Conversion Funnel</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={stats?.funnel || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="stage" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} />
                <Area type="monotone" dataKey="count" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
