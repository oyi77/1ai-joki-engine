'use client'

import { Search, Plus, MessageSquare, Users, BarChart3, Settings } from 'lucide-react'

export interface EmptyStateProps {
  icon?: 'search' | 'plus' | 'message' | 'users' | 'chart' | 'settings'
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

const iconMap = {
  search: Search,
  plus: Plus,
  message: MessageSquare,
  users: Users,
  chart: BarChart3,
  settings: Settings,
}

export function EmptyState({ icon = 'search', title, description, action, className = '' }: EmptyStateProps) {
  const Icon = iconMap[icon]
  return (
    <div className={`flex flex-col items-center justify-center py-8 px-4 text-center ${className}`}>
      <div className="relative group">
        <div className="absolute inset-0 bg-primary/10 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-500" />
        <div className="relative p-6 bg-card border border-primary/20 rounded-xl shadow-md">
          <Icon className="w-14 h-14 text-primary-500 group-hover:text-primary-100 transition-colors" />
        </div>
      </div>
      <h3 className="text-2xl font-bold text-foreground mb-4">{title}</h3>
      {description && <p className="text-sm text-muted-foreground mb-6 max-w-md leading-relaxed">{description}</p>}
      <div className="flex flex-wrap justify-center gap-4 mt-6">{action}</div>
    </div>
  )
}

export default EmptyState
