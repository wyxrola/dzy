import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { Clock3, Heart, LogOut, Map, PawPrint, Plus, X } from 'lucide-react'
import { AuthScreen } from './components/AuthScreen'
import { MemoryForm } from './components/MemoryForm'
import { MemoryMap } from './components/MemoryMap'
import { PasswordRecoveryScreen } from './components/PasswordRecoveryScreen'
import { PetPair } from './components/PetPair'
import { TimelineView } from './components/TimelineView'
import { createMemory, fetchCoupleSpace, fetchMemories } from './lib/api'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import type { CoupleSpace, Memory, NewMemoryInput } from './types'

type ViewMode = 'map' | 'timeline'

function LoadingScreen() {
  return (
    <main className="loading-screen">
      <PetPair compact pose="map" />
      <p>小猫和小狗正在找我们走过的路…</p>
    </main>
  )
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [couple, setCouple] = useState<CoupleSpace | null>(null)
  const [memories, setMemories] = useState<Memory[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('map')
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [previewMode, setPreviewMode] = useState(false)
  const [recoveringPassword, setRecoveringPassword] = useState(false)
  const [showWelcome, setShowWelcome] = useState(true)

  useEffect(() => {
    if (import.meta.env.DEV && (!isSupabaseConfigured || !supabase)) {
      import('./data/legacyMemories').then(({ legacyMemories }) => {
        setMemories(legacyMemories)
        setCouple({ id: 'preview', name: '我们的足迹地图', displayName: '我们的小世界' })
        setPreviewMode(true)
        setLoading(false)
      })
      return
    }

    if (!isSupabaseConfigured || !supabase) {
      setError('网站的私密空间尚未连接。')
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (!data.session) setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'PASSWORD_RECOVERY') setRecoveringPassword(true)
      setSession(nextSession)
      if (!nextSession) {
        setCouple(null)
        setMemories([])
        setLoading(false)
      }
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  const loadPrivateSpace = useCallback(async () => {
    if (!session?.user) return
    setLoading(true)
    setError('')
    try {
      const nextCouple = await fetchCoupleSpace(session.user)
      const nextMemories = await fetchMemories(nextCouple.id)
      setCouple(nextCouple)
      setMemories(nextMemories)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '暂时没有加载出共同空间。')
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => {
    if (session && isSupabaseConfigured) void loadPrivateSpace()
  }, [session, loadPrivateSpace])

  async function handleSave(input: NewMemoryInput) {
    if (!session?.user || !couple || previewMode) {
      throw new Error('本地预览不会写入真实数据，配置好共同空间后就可以上传。')
    }
    await createMemory(couple.id, session.user.id, input)
    await loadPrivateSpace()
  }

  async function signOut() {
    await supabase?.auth.signOut()
  }

  if (loading) return <LoadingScreen />
  if (recoveringPassword) return <PasswordRecoveryScreen onComplete={() => setRecoveringPassword(false)} />
  if (isSupabaseConfigured && !session) return <AuthScreen />

  if (!couple) {
    return (
      <main className="error-screen">
        <Heart size={32} />
        <h1>还差最后一点配置</h1>
        <p>{error || '共同空间暂时没有准备好。'}</p>
        {session && <button className="quiet-button" onClick={signOut}>退出登录</button>}
      </main>
    )
  }

  return (
    <main className={`app-shell app-shell--${viewMode}`}>
      <header className="app-header">
        <button className="app-logo" onClick={() => { setViewMode('map'); setSelectedId(null); setShowWelcome(true) }}>
          <span><PawPrint size={16} fill="currentColor" /></span>
          <div><strong>我们的足迹地图</strong><small>OUR FOOTPRINT MAP</small></div>
        </button>

        <nav className="view-switch" aria-label="切换视图">
          <button className={viewMode === 'map' ? 'is-active' : ''} onClick={() => setViewMode('map')}><Map size={16} />地图</button>
          <button className={viewMode === 'timeline' ? 'is-active' : ''} onClick={() => { setViewMode('timeline'); setSelectedId(null) }}><Clock3 size={16} />时光</button>
        </nav>

        <div className="header-actions">
          <div className="pet-avatar" title={previewMode ? '小猫和小狗的本地预览' : couple.displayName}>
            <PetPair compact pose="together" />
          </div>
          {!previewMode && <button className="icon-button" onClick={signOut} aria-label="退出登录"><LogOut size={18} /></button>}
        </div>
      </header>

      {error && <div className="app-notice" role="alert">{error}</div>}
      <div className="app-content">
        <section className="app-content__main">
          {viewMode === 'map' ? (
            <>
              <MemoryMap
                memories={memories}
                selectedId={selectedId}
                onSelect={(memory) => { setShowWelcome(false); setSelectedId(memory.id) }}
                onClose={(memory) => setSelectedId((current) => current === memory.id ? null : current)}
              />
              {memories.length > 0 && showWelcome && !selectedId && (
                <section className="map-welcome">
                  <button type="button" className="map-welcome__close" onClick={() => setShowWelcome(false)} aria-label="关闭地图介绍">
                    <X size={20} />
                  </button>
                  <div className="map-welcome__copy">
                    <p className="eyebrow"><PawPrint size={12} /> OUR FOOTPRINTS</p>
                    <h1>我们一起走过<br /><strong>{memories.length}</strong> 个地方</h1>
                    <p>地图只收藏已经发生的快乐。点开一个坐标，再一起回到那一天。</p>
                  </div>
                  <PetPair compact pose="together" />
                </section>
              )}
            </>
          ) : (
            <TimelineView memories={memories} onSelect={(memory) => { setViewMode('map'); setShowWelcome(false); setSelectedId(memory.id) }} />
          )}

          {memories.length === 0 && (
            <div className="empty-state">
              <PetPair compact pose="peek" />
              <h2>第一串脚印还在路上</h2>
              <p>等你们想起某一个地方，就让小猫和小狗帮忙收藏起来。</p>
            </div>
          )}

          <button className="add-memory-button" onClick={() => setShowForm(true)} disabled={previewMode} title={previewMode ? '下一版会开放共同记录' : undefined}>
            <Plus size={19} />
            <span>记下一个地方</span>
          </button>
        </section>

      </div>

      {showForm && <MemoryForm onClose={() => setShowForm(false)} onSave={handleSave} />}
    </main>
  )
}
