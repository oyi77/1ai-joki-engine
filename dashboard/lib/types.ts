/**
 * Type definitions for the dashboard application
 * Shared interfaces for API responses and component props
 */

export interface Account {
  id: string
  platform: string
  username?: string
  display_name?: string
  status: string
  created_at?: string
  last_used?: string
}

export interface Campaign {
  id: string
  name: string
  content: string
  cta_link?: string
  platforms: string[]
  status: string
  created_at?: string
}

export interface Template {
  id: string
  name: string
  content: string
  variables?: string[]
  type: string
  created_at?: string
  updated_at?: string
}

export interface Job {
  id: string
  account_id?: string
  platform?: string
  type?: string
  payload?: string
  attempts?: number
  max_attempts?: number
  next_run_at?: string | null
  status?: string
  progress?: number
  created_at?: string
}

export interface Lead {
  id: string
  inbound_platform: string
  contact: string
  campaign_id?: string
  welcome_sent: number
  status: string
  created_at?: string
  updated_at?: string
}

export interface Post {
  id: string
  campaign_id: string
  platform: string
  job_id?: string
  status: string
  created_at?: string
}

export interface TableColumn<T> {
  key: keyof T | string
  header: string
  render?: (row: T) => React.ReactNode
  width?: string
}

export interface DataTableProps<T> {
  columns: TableColumn<T>[]
  data: T[]
  isLoading?: boolean
  actions?: (row: T) => React.ReactNode
  onRowClick?: (row: T) => void
}

export interface ConfirmDialogProps {
  open: boolean
  title: string
  description?: string
  actionText?: string
  onConfirm: () => void
  onCancel: () => void
  isLoading?: boolean
}

export interface StatusBadgeProps {
  status: string
  text: string
}

export interface EmptyStateProps {
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
}

export interface FormFieldProps {
  label: string
  name: string
  type?: 'text' | 'email' | 'url' | 'number' | 'password' | 'textarea' | 'select'
  placeholder?: string
  helperText?: string
  options?: { value: string; label: string }[]
  error?: string
  className?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void
}

export interface Adapter {
  name: string
  platform: string
  healthy: boolean
}

export interface PlatformHealthStatus {
  [key: string]: {
    healthy: boolean
    mode: string
  }
}

export interface AnalyticsStats {
  total_campaigns?: number
  total_leads?: number
  lead_sources?: Array<{
    platform: string
    count: number
  }>
  [key: string]: unknown
}

export type ErrorResponse = {
  message?: string
  error?: string
}
