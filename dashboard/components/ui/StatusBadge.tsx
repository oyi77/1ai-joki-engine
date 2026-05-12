'use client'

import { CheckCircle, AlertCircle, Info, AlertTriangle, Circle } from 'lucide-react'

export type StatusType = 'success' | 'warning' | 'error' | 'info' | 'neutral'

export interface StatusBadgeProps {
  status: StatusType
  text?: string
  showIcon?: boolean
  className?: string
}

const config: Record<StatusType, { color: string; icon: typeof CheckCircle }> = {
  success: { color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: CheckCircle },
  warning: { color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: AlertTriangle },
  error: { color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: AlertCircle },
  info: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Info },
  neutral: { color: 'bg-muted text-muted-foreground border-border', icon: Circle },
}

export function StatusBadge({ status, text, showIcon = true, className = '' }: StatusBadgeProps) {
  const { color, icon: Icon } = config[status]
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-xs font-medium ${color} ${className}`}>
      {showIcon && <Icon className="w-3 h-3" />}
      {text ?? status}
    </span>
  )
}

export default StatusBadge
