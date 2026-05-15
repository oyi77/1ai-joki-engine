'use client'

import { Bell, Activity, ChevronRight } from 'lucide-react'
import type { PlatformName } from '../ui/PlatformIcon'
import { PlatformIcon } from '../ui/PlatformIcon'

interface HeaderProps {
  onMenuToggle?: () => void
  platformHealth?: Record<string, { healthy: boolean }>
  breadcrumb?: string
}

const platformKeys: PlatformName[] = ['twitter', 'facebook', 'instagram', 'threads', 'whatsapp', 'telegram']

export function Header({ onMenuToggle, platformHealth, breadcrumb }: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 h-16 border-b border-white/5 bg-[#0a0f18]/70 backdrop-blur-xl flex items-center px-6 gap-4 shadow-sm">
      {onMenuToggle && (
        <button
          onClick={onMenuToggle}
          className="md:hidden p-2 rounded-xl hover:bg-slate-800 transition-colors min-h-[44px] min-w-[44px]"
          aria-label="Open menu"
        >
          <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}

      {breadcrumb && (
        <div className="hidden md:flex items-center text-sm font-medium">
          <span className="text-slate-500">Dashboard</span>
          <ChevronRight className="w-4 h-4 mx-2 text-slate-600" />
          <span className="text-slate-100 bg-emerald-500/10 px-2.5 py-1 rounded-lg text-xs font-semibold border border-emerald-500/20">
            {breadcrumb}
          </span>
        </div>
      )}

      <div className="flex-1" />

      <div className="flex items-center gap-6">
        {platformHealth && (
          <div className="hidden lg:flex items-center gap-4 bg-slate-900/50 px-4 py-1.5 rounded-full border border-slate-800/50">
            {platformKeys.map((platform) => {
              const health = platformHealth[platform]
              return (
                <div key={platform} className="group relative flex items-center justify-center">
                  <PlatformIcon 
                    platform={platform} 
                    className={`w-4 h-4 transition-all duration-200 ${health?.healthy ? 'text-slate-300 opacity-80' : 'text-red-400 opacity-100'}`} 
                  />
                  <div className={`absolute -bottom-1 -right-1 w-2 h-2 rounded-full border-2 border-slate-900 ${health?.healthy ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  
                  <div className="absolute top-full mt-2 hidden group-hover:block bg-slate-800 text-slate-100 text-[10px] px-2 py-1 rounded border border-slate-700 whitespace-nowrap z-50 capitalize shadow-xl">
                    {platform}: {health?.healthy ? 'Connected' : 'Disconnected'}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="flex items-center gap-2">
          <button className="relative p-2 rounded-xl hover:bg-slate-800 transition-colors group" aria-label="Activity">
            <Activity className="w-5 h-5 text-slate-400 group-hover:text-emerald-400" />
          </button>
          
          <button className="relative p-2 rounded-xl hover:bg-slate-800 transition-colors group" aria-label="Notifications">
            <Bell className="w-5 h-5 text-slate-400 group-hover:text-emerald-400" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-slate-950" />
          </button>
          
          <div className="h-8 w-[1px] bg-slate-800 mx-2" />
          
          <div className="flex items-center gap-3 pl-2">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold border border-indigo-400/30">
              JS
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
