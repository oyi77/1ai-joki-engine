'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  MessageSquareText,
  Users,
  FileText,
  Send,
  History,
  BarChart3,
  Settings,
  NotebookText,
  X,
} from 'lucide-react'

interface SidebarProps {
  open?: boolean
  onClose?: () => void
  collapsed?: boolean
}

interface NavItem {
  label: string
  href: string
  icon: typeof LayoutDashboard
}

interface NavGroup {
  group: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    group: 'Main',
    items: [
      { label: 'Dashboard', href: '/', icon: LayoutDashboard },
      { label: 'Analytics', href: '/analytics', icon: BarChart3 },
    ],
  },
  {
    group: 'Campaigns',
    items: [
      { label: 'Manage Campaigns', href: '/campaigns', icon: NotebookText },
      { label: 'Blast Runner', href: '/blast-runner', icon: Send },
      { label: 'Jobs & History', href: '/jobs', icon: History },
    ],
  },
  {
    group: 'CRM & Data',
    items: [
      { label: 'Accounts', href: '/accounts', icon: Users },
      { label: 'Leads', href: '/leads', icon: MessageSquareText },
      { label: 'Templates', href: '/templates', icon: FileText },
    ],
  },
  {
    group: 'System',
    items: [
      { label: 'Settings', href: '/settings', icon: Settings },
    ],
  },
]

function SidebarContent({ onClose, collapsed }: { onClose?: () => void, collapsed?: boolean }) {
  const pathname = usePathname()

  return (
    <div className="flex flex-col h-full bg-slate-950">
      <div className={`p-6 flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-8 h-8 shrink-0 rounded-lg bg-gradient-to-br from-emerald-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <Send className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <span className="font-bold text-lg tracking-tight text-slate-100 uppercase">Joki Blast</span>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-8 scrollbar-hide">
        {navGroups.map((group) => (
          <div key={group.group} className="space-y-2">
            {!collapsed && (
              <h3 className="px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                {group.group}
              </h3>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href + '/'))
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200
                      ${isActive
                        ? 'bg-emerald-500/10 text-emerald-400 font-semibold'
                        : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}
                      ${collapsed ? 'justify-center' : ''}
                    `}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className={`w-5 h-5 shrink-0 transition-transform duration-200 group-hover:scale-110
                      ${isActive ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-300'}
                    `} />
                    {!collapsed && <span>{item.label}</span>}
                    {!collapsed && isActive && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800/50 bg-slate-900/30">
        <div className={`flex items-center gap-3 px-2 py-2 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          {!collapsed && (
            <>
              <span className="text-xs font-medium text-slate-400">System Online</span>
              <span className="ml-auto text-[10px] font-mono text-slate-600">v0.1.0</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export function Sidebar({ open, onClose, collapsed }: SidebarProps) {
  return (
    <>
      <aside 
        className={`hidden md:flex flex-col fixed left-0 top-0 h-screen bg-slate-950 border-r border-slate-800/50 z-30 transition-all duration-300
          ${collapsed ? 'w-20' : 'w-64'}
        `}
      >
        <SidebarContent collapsed={collapsed} />
      </aside>

      {open && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-slate-950 shadow-2xl border-r border-slate-800/50 animate-in slide-in-from-left duration-300">
            <button 
              onClick={onClose}
              className="absolute right-4 top-6 p-2 text-slate-400 hover:text-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
            <SidebarContent onClose={onClose} />
          </div>
        </div>
      )}
    </>
  )
}

export function MobileNav({ open, onToggle }: { open: boolean, onToggle: () => void }) {
  return null
}

export default Sidebar
