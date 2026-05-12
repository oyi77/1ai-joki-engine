'use client'

import { type ReactNode } from 'react'

export interface CardProps {
  className?: string
  children?: ReactNode
  gradient?: boolean
  icon?: ReactNode
  footer?: ReactNode
  title?: string
}

export function Card({
  className = '',
  children,
  gradient = false,
  icon,
  footer,
  title,
  ...props
}: CardProps & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-xl border bg-card text-card-foreground shadow-sm ${gradient ? 'border-emerald-500/30 bg-gradient-to-br from-card to-emerald-900/10' : 'border-border'} ${className}`}
      {...props}
    >
      {(icon || title) && (
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border/50">
          {icon}
          {title && <h3 className="font-semibold leading-none tracking-tight text-lg">{title}</h3>}
        </div>
      )}
      <div className={icon || title ? '' : 'p-6'}>{children}</div>
      {footer && <div className="px-6 py-4 border-t border-border/50 bg-muted/30">{footer}</div>}
    </div>
  )
}

export function CardHeader({ className = '', children, ...props }: { className?: string; children?: ReactNode }) {
  return <div className={`flex flex-col space-y-1.5 p-6 ${className}`} {...props}>{children}</div>
}

export function CardTitle({ className = '', children, ...props }: { className?: string; children?: ReactNode }) {
  return <h3 className={`font-semibold leading-none tracking-tight text-lg ${className}`} {...props}>{children}</h3>
}

export function CardContent({ className = '', children, ...props }: { className?: string; children?: ReactNode }) {
  return <div className={`p-6 pt-0 ${className}`} {...props}>{children}</div>
}

export default Card
