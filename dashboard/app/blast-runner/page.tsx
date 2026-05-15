'use client'

import { useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { 
  Send, 
  ChevronRight, 
  ChevronLeft, 
  Settings2, 
  Target, 
  Zap, 
  ShieldCheck,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { PlatformIcon } from '@/components/ui/PlatformIcon'
import type { PlatformName } from '@/components/ui/PlatformIcon'
import { toast } from 'sonner'

const platforms: PlatformName[] = ['facebook', 'instagram', 'threads', 'twitter', 'whatsapp', 'telegram']

export default function BlastRunnerPage() {
  const [step, setStep] = useState(1)
  const [platform, setPlatform] = useState<PlatformName>('facebook')
  const [credential, setCredential] = useState('')
  const [message, setMessage] = useState('Test blast from Joki Engine')
  const [targetSource, setTargetSource] = useState('feed')
  const [maxActions, setMaxActions] = useState(30)
  const [actionMixComment, setActionMixComment] = useState(70)
  const [delayMinSec, setDelayMinSec] = useState(20)
  const [delayMaxSec, setDelayMaxSec] = useState(40)
  const [isLoading, setIsLoading] = useState(false)

  const isWhatsApp = platform === 'whatsapp'

  async function handleStartBlast() {
    setIsLoading(true)

    try {
      const accRes = await api.post('/v1/accounts', {
        platform,
        username: `Blast-${Date.now()}`,
        email: 'blast@temp.local',
        credentials: credential,
      })
      const accountId = accRes.data.id

      const payload = {
        platform,
        accountId,
        message,
        maxActions,
        searchQuery: isWhatsApp ? 'use target file' : targetSource,
      }

      const response = await api.post('/v1/blast/run', payload)

      toast.success('Blast initiated successfully', {
        description: `Your ${platform} blast has been queued.`,
      })
      setStep(1)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      toast.error('Failed to start blast', {
        description: message,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const nextStep = () => setStep(s => s + 1)
  const prevStep = () => setStep(s => s - 1)

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100">Blast Runner</h1>
          <p className="text-slate-500 mt-1">Configure and launch a multi-platform automation session.</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800">
          {[1, 2, 3].map((s) => (
            <div 
              key={s}
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all duration-300
                ${step === s ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 
                  step > s ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-600'}
              `}
            >
              {s}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <Card className="border-slate-800/50 bg-slate-950/50 backdrop-blur-sm shadow-2xl">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  {step === 1 && <Settings2 className="w-5 h-5 text-emerald-400" />}
                  {step === 2 && <Target className="w-5 h-5 text-emerald-400" />}
                  {step === 3 && <ShieldCheck className="w-5 h-5 text-emerald-400" />}
                </div>
                <div>
                  <CardTitle>
                    {step === 1 && 'Platform & Identity'}
                    {step === 2 && 'Strategy & Targeting'}
                    {step === 3 && 'Limits & Safety'}
                  </CardTitle>
                  <CardDescription>
                    {step === 1 && 'Choose where and who will execute the blast.'}
                    {step === 2 && 'Define your targets and action composition.'}
                    {step === 3 && 'Configure delays and action caps for safety.'}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
              {step === 1 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-slate-300">Target Platform</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {platforms.map((p) => (
                        <button
                          key={p}
                          onClick={() => setPlatform(p)}
                          className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-200
                            ${platform === p 
                              ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' 
                              : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-600'}
                          `}
                        >
                          <PlatformIcon platform={p} className="w-5 h-5" />
                          <span className="text-xs font-bold uppercase tracking-wider">{p}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-slate-300">Credential / Session ID</label>
                    <input
                      type="text"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                      placeholder="Enter session cookie or credential token..."
                      value={credential}
                      onChange={(e) => setCredential(e.target.value)}
                    />
                    <p className="text-[10px] text-slate-500 italic flex items-center gap-1.5">
                      <AlertCircle className="w-3 h-3" />
                      Make sure this session is still valid in your browser.
                    </p>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  {!isWhatsApp && (
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-slate-300">Target Source</label>
                      <select
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 appearance-none"
                        value={targetSource}
                        onChange={(e) => setTargetSource(e.target.value)}
                      >
                        <option value="feed">Home Feed (Engagement)</option>
                        <option value="profile_followers">Followers List</option>
                        <option value="hashtag">Hashtag Search</option>
                        <option value="explore">Explore Page</option>
                      </select>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <label className="text-sm font-semibold text-slate-300">Action Mix</label>
                      <span className="text-xs font-mono text-emerald-400">{actionMixComment}% Comments / {100 - actionMixComment}% DMs</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      className="w-full accent-emerald-500 bg-slate-800 h-2 rounded-lg appearance-none cursor-pointer"
                      value={actionMixComment}
                      onChange={(e) => setActionMixComment(parseInt(e.target.value))}
                    />
                    <div className="flex justify-between text-[10px] uppercase font-bold text-slate-600 tracking-widest">
                      <span>Pure DM</span>
                      <span>Balanced</span>
                      <span>Pure Comment</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-slate-300">Blast Message</label>
                    <textarea
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 min-h-[100px]"
                      placeholder="Enter the message to be blasted..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-slate-300">Max Actions</label>
                      <input
                        type="number"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        value={maxActions}
                        onChange={(e) => setMaxActions(parseInt(e.target.value))}
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-slate-300">Safety Threshold</label>
                      <div className="flex items-center gap-2 p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs text-emerald-600 font-medium italic">Anti-Ban Enabled</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-sm font-semibold text-slate-300">Delay Range (Seconds)</label>
                    <div className="flex items-center gap-4">
                      <input
                        type="number"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        placeholder="Min"
                        value={delayMinSec}
                        onChange={(e) => setDelayMinSec(parseInt(e.target.value))}
                      />
                      <span className="text-slate-600">to</span>
                      <input
                        type="number"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        placeholder="Max"
                        value={delayMaxSec}
                        onChange={(e) => setDelayMaxSec(parseInt(e.target.value))}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-6 border-t border-slate-800/50">
                <Button 
                  variant="ghost" 
                  onClick={prevStep} 
                  disabled={step === 1 || isLoading}
                  className={step === 1 ? 'invisible' : ''}
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                
                {step < 3 ? (
                  <Button 
                    onClick={nextStep}
                    disabled={step === 1 && !credential}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white min-w-[120px]"
                  >
                    Continue
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button 
                    onClick={handleStartBlast} 
                    disabled={isLoading}
                    className="bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white shadow-xl shadow-emerald-500/20 min-w-[160px]"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Launching...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 mr-2 fill-current" />
                        Start Blast Engine
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-slate-900/50 border-slate-800/50">
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-400">Configuration Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <SummaryItem label="Platform" value={platform} icon={<PlatformIcon platform={platform} className="w-3 h-3" />} />
                <SummaryItem label="Credential" value={credential ? '********' : 'Not set'} />
                <SummaryItem label="Source" value={isWhatsApp ? 'Target File' : targetSource} />
                <SummaryItem label="Actions" value={`${maxActions} Total`} />
                <SummaryItem label="Composition" value={`${actionMixComment}% / ${100 - actionMixComment}%`} />
                <SummaryItem label="Safety" value={`${delayMinSec}s - ${delayMaxSec}s delay`} />
              </div>
            </CardContent>
          </Card>

          <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 space-y-2">
            <div className="flex items-center gap-2 text-indigo-400">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Safety Tip</span>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              For Meta platforms (IG/Threads), the engine uses browser-based automation with stealth plugins. This mimics human behavior but still carries risk if frequency is too high.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function SummaryItem({ label, value, icon }: { label: string, value: string, icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-slate-800/50 last:border-0">
      <span className="text-[10px] font-medium text-slate-500 uppercase tracking-tight">{label}</span>
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-xs font-bold text-slate-300 capitalize">{value}</span>
      </div>
    </div>
  )
}
