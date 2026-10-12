import { FormEvent, useState } from 'react'
import { ArrowRight, LockKeyhole, Mail, PawPrint } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { PetPair } from './PetPair'

export function AuthScreen() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const appUrl = new URL(import.meta.env.BASE_URL, window.location.origin).toString()

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!supabase) return
    setSubmitting(true)
    setError('')
    setNotice('')

    const normalizedEmail = email.trim().toLowerCase()

    if (isSignUp) {
      if (password.length < 8) {
        setError('密码至少需要 8 位。')
        setSubmitting(false)
        return
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: { emailRedirectTo: appUrl },
      })
      if (signUpError) setError('暂时没能开通，请检查邮箱后再试。')
      else if (!data.session) setNotice('确认邮件已经发送。打开邮件里的链接后，就能进入地图。')
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      })
      if (signInError) setError('邮箱或密码不正确，请再试一次。')
    }
    setSubmitting(false)
  }

  function toggleMode() {
    setIsSignUp((current) => !current)
    setError('')
    setNotice('')
  }

  async function handleResetPassword() {
    if (!supabase) return
    if (!email.trim()) {
      setError('先填入你的邮箱，再发送重置邮件。')
      return
    }
    setSubmitting(true)
    setError('')
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: appUrl,
    })
    if (resetError) setError('暂时没能发送邮件，请稍后再试。')
    else setNotice('如果这个邮箱属于你，重置链接已经在路上了。')
    setSubmitting(false)
  }

  return (
    <main className="auth-shell">
      <section className="auth-story" aria-label="我们的共同记忆">
        <div className="auth-brand"><PawPrint size={17} fill="currentColor" /> 我们的足迹地图</div>
        <div className="auth-story__copy">
          <p className="eyebrow">OUR FOOTPRINT MAP</p>
          <h1>你和我，还有<br />一路的小脚印。</h1>
          <p>每一个坐标都不是打卡，是我们认真一起生活过的证据。</p>
        </div>
        <div className="auth-pets">
          <PetPair pose="map" />
          <span>今天也一起回家看看吧</span>
        </div>
      </section>

      <section className="auth-panel">
        <form className="auth-card" onSubmit={handleSubmit}>
          <div className="auth-card__heading">
            <span className="auth-card__icon"><LockKeyhole size={20} /></span>
            <div>
              <p className="eyebrow">PRIVATE SPACE</p>
              <h2>{isSignUp ? '第一次来到这里' : '回到我们的地图'}</h2>
            </div>
          </div>
          <p className="auth-card__intro">
            {isSignUp ? '使用受邀请的邮箱，设置只属于你的密码。' : '只为你们两个人开放。各自登录，回到同一张地图。'}
          </p>

          <label className="field">
            <span>邮箱</span>
            <span className="field__control">
              <Mail size={17} />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
                autoComplete="email"
                required
              />
            </span>
          </label>

          <label className="field">
            <span>密码</span>
            <span className="field__control">
              <LockKeyhole size={17} />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={isSignUp ? '设置至少 8 位密码' : '输入你的密码'}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                required
              />
            </span>
          </label>

          {error && <p className="form-message form-message--error" role="alert">{error}</p>}
          {notice && <p className="form-message form-message--success">{notice}</p>}

          <button className="primary-button primary-button--wide" type="submit" disabled={submitting}>
            {submitting ? (isSignUp ? '正在开通…' : '正在打开…') : (isSignUp ? '开通我的账户' : '进入我们的地图')}
            {!submitting && <ArrowRight size={18} />}
          </button>
          {!isSignUp && (
            <button className="text-button" type="button" onClick={handleResetPassword} disabled={submitting}>
              忘记密码
            </button>
          )}
          <button className="text-button" type="button" onClick={toggleMode} disabled={submitting}>
            {isSignUp ? '已经开通过，返回登录' : '第一次来？开通账户'}
          </button>
          <p className="auth-card__footnote">只有受邀请的两个邮箱能进入共同空间。</p>
        </form>
      </section>
    </main>
  )
}
