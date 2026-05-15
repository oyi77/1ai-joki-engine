'use client'

import { Toaster } from '@/components/ui/sonner'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 30,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-screen bg-[#0a0f18] relative">
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
        
        <Sidebar 
          open={sidebarOpen} 
          onClose={() => setSidebarOpen(false)} 
          collapsed={collapsed}
        />
        
        <div className={`flex-1 flex flex-col transition-all duration-300 ${collapsed ? 'md:pl-20' : 'md:pl-64'}`}>
          <Header
            onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
            breadcrumb="Overview"
          />
          
          <main className="flex-1 p-6 md:p-8">
            <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              {children}
            </div>
          </main>

          <footer className="py-6 px-8 border-t border-slate-900/50 text-center text-slate-600 text-[10px] uppercase tracking-widest">
            &copy; 2026 BerkahKarya Automation Engine • All Rights Reserved
          </footer>
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex fixed left-[18px] bottom-8 z-40 w-10 h-10 items-center justify-center bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 hover:border-emerald-500/50 transition-all group shadow-2xl"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg className={`w-4 h-4 text-slate-400 group-hover:text-emerald-400 transition-transform ${collapsed ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      </div>
      <Toaster position="top-right" theme="dark" closeButton richColors />
    </QueryClientProvider>
  )
}
