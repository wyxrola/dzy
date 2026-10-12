import { FormEvent, useState } from 'react'
import { ArrowRight, KeyRound } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { PetPair } from './PetPair'

interface PasswordRecoveryScreenProps {
  onComplete: () => void
}

export function PasswordRecoveryScreen({ onComplete }: PasswordRecoveryScreenProps) {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!supabase) return
    if (password.length < 8) {
      setError('新密码至少需要 8 个字符。')
      return
    }
    if (password !== confirmation) {
      setError('两次输入的密码不一致。')
      return
    }

    setSaving(true)
    setError('')
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setSaving(false)
    if (updateError) {
      setError('没有更新成功，请重新打开邮件里的链接再试。')
      return
    }
    onComplete()
  }

  return (
    <main className="recovery-shell">
      <form className="recovery-card" onSubmit={handleSubmit}>
        <PetPair compact pose="together" />
        <p className="eyebrow">BACK TO OUR MAP</p>
        <h1>设置一个新密码</h1>
        <p>换好密码，就能继续回到只属于你们的地图。</p>
        <label className="field">
          <span>新密码</span>
          <span className="field__control"><KeyRound size={17} /><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" /></span>
        </label>
        <label className="field">
          <span>再次输入</span>
          <span className="field__control"><KeyRound size={17} /><input type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" /></span>
        </label>
        {error && <p className="form-message form-message--error" role="alert">{error}</p>}
        <button className="primary-button primary-button--wide" disabled={saving}>{saving ? '正在保存…' : '保存并回到地图'} {!saving && <ArrowRight size={18} />}</button>
      </form>
    </main>
  )
}
