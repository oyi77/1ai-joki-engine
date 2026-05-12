'use client'

import { type ButtonHTMLAttributes, type ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'icon'
  loading?: boolean
  asChild?: boolean
  className?: string
}

export function Button({
  variant = 'default',
  size = 'default',
  loading,
  asChild,
  className = '',
  children,
  disabled,
  ...props
}: ButtonProps) {
  const base = 'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 min-h-[44px] min-w-[44px]'
  
  const variants = {
    default: `bg-primary text-primary-foreground hover:bg-primary/90`,
    destructive: `bg-destructive text-destructive-foreground hover:bg-destructive/90`,
    outline: `border border-input bg-transparent hover:bg-muted/50 text-foreground`,
    ghost: `hover:bg-muted/50 text-foreground`,
    link: `text-primary underline-offset-4 hover:underline`,
  }
  
  const sizes = {
    default: `px-4 py-2 text-sm`,
    sm: `px-3 py-1 text-xs`,
    icon: `h-8 w-8 p-0`,
  }
  
  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <span className="mr-2 h-4 w-4 animate-spin rounded-full border border-primary/50" />}
      {children}
    </button>
  )
}

export default Button
