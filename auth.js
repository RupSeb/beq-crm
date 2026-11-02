// Anmeldung, neues Passwort, „nicht freigeschaltet“, Kontomenü
import { html, useState, useEffect, useRef } from '../lib/preact.js'
import { Icon } from '../lib/icons.js'
import { local } from '../lib/util.js'
import {
  state,
  isDemo,
  signIn,
  signOut,
  resetPassword,
  updatePassword,
  enter,
  errorText,
  toast,
  openDialog,
  closeDialog,
} from '../store.js'
import { Modal, Field, dialogKinds } from './common.js'

// Grüne Signal-Bögen aus einer Ecke, nach außen immer transparenter
function SignalArcs() {
  const arcs = [140, 230, 320, 410, 500, 590, 680]
  return html`<svg class="signal-arcs" viewBox="0 0 700 700" aria-hidden="true" preserveAspectRatio="xMaxYMax meet">
    ${arcs.map((r, i) => html`<circle cx="700" cy="700" r=${r} fill="none" stroke="#37BA98" stroke-width=${i < 2 ? 3 : 2} opacity=${(0.85 - i * 0.12).toFixed(2)} />`)}
    <circle cx="700" cy="700" r="46" fill="#37BA98" opacity="0.9" />
  </svg>`
}

function AuthShell({ children }) {
  return html`<div class="auth-screen">
    <${SignalArcs} />
    <div class="auth-card">
      <div class="auth-brand">
        <img src="img/logo-dunkel.svg" alt="beQ Hub" width="132" height="34" />
        <span class="brand-crm">CRM</span>
      </div>
      ${children}
    </div>
  </div>`
}

export function Login() {
  const [email, setEmail] = useState(local.get('beqcrm-last-email', ''))
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(state.authMessage)
  const [info, setInfo] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setInfo(null)
    try {
      await signIn(email.trim(), password)
    } catch (err) {
      setError(errorText(err))
      setBusy(false)
    }
  }
  const forgot = async () => {
    setError(null)
    if (!email.trim()) {
      setError('Trag zuerst deine E-Mail-Adresse ein.')
      return
    }
    try {
      await resetPassword(email.trim())
      setInfo('Wenn es ein Konto mit dieser Adresse gibt, kommt gleich eine Mail mit einem Link.')
    } catch (err) {
      setError(errorText(err))
    }
  }

  return html`<${AuthShell}>
    <h1 class="auth-title">Anmelden</h1>
    <form onSubmit=${submit}>
      <${Field} label="E-Mail" htmlFor="login-email">
        <input id="login-email" type="email" autocomplete="username" required value=${email} onInput=${(e) => setEmail(e.target.value)} />
      <//>
      <${Field} label="Passwort" htmlFor="login-password">
        <input id="login-password" type="password" autocomplete="current-password" required value=${password} onInput=${(e) => setPassword(e.target.value)} />
      <//>
      ${error && html`<p class="auth-error" role="alert">${error}</p>`}
      ${info && html`<p class="auth-info" role="status">${info}</p>`}
      <button type="submit" class="btn btn-primary btn-block" disabled=${busy}>${busy ? 'Einen Moment …' : 'Anmelden'}</button>
    </form>
    <button type="button" class="auth-link" onClick=${forgot}>Passwort vergessen?</button>
    <p class="auth-hint">Die Mail kommt nur an, wenn in Supabase ein eigener Mailversand eingerichtet ist. Sonst hilft dir der Admin weiter.</p>
  <//>`
}

export function SetPassword() {
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const submit = async (e) => {
    e.preventDefault()
    if (pw.length < 8) return setError('Bitte mindestens 8 Zeichen.')
    if (pw !== pw2) return setError('Die beiden Passwörter sind nicht gleich.')
    setBusy(true)
    setError(null)
    try {
      await updatePassword(pw)
      toast('Neues Passwort gespeichert')
      await enter(state.sessionEmail)
    } catch (err) {
      setError(errorText(err))
      setBusy(false)
    }
  }
  return html`<${AuthShell}>
    <h1 class="auth-title">Neues Passwort festlegen</h1>
    <form onSubmit=${submit}>
      <${Field} label="Neues Passwort" htmlFor="new-pw" hint="Mindestens 8 Zeichen">
        <input id="new-pw" type="password" autocomplete="new-password" required value=${pw} onInput=${(e) => setPw(e.target.value)} />
      <//>
      <${Field} label="Noch einmal" htmlFor="new-pw2">
        <input id="new-pw2" type="password" autocomplete="new-password" required value=${pw2} onInput=${(e) => setPw2(e.target.value)} />
      <//>
      ${error && html`<p class="auth-error" role="alert">${error}</p>`}
      <button type="submit" class="btn btn-primary btn-block" disabled=${busy}>Passwort speichern</button>
    </form>
  <//>`
}

export function NotMember() {
  return html`<${AuthShell}>
    <h1 class="auth-title">Noch nicht freigeschaltet</h1>
    <p class="auth-text">Dein Konto ist noch nicht für das beQ CRM freigeschaltet. Melde dich bei ${state.adminName || 'beim Admin'}.</p>
    <p class="auth-hint">Angemeldet als ${state.sessionEmail}</p>
    <button type="button" class="btn btn-block" onClick=${signOut}>Abmelden</button>
  <//>`
}

export function AuthError() {
  return html`<${AuthShell}>
    <h1 class="auth-title">Das hat nicht geklappt</h1>
    <p class="auth-text">${state.authMessage || 'Die Daten ließen sich nicht laden.'}</p>
    <button type="button" class="btn btn-primary btn-block" onClick=${() => location.reload()}>Noch einmal versuchen</button>
  <//>`
}

export function Splash() {
  return html`<div class="splash" aria-busy="true"><img src="img/logo-dunkel.svg" alt="beQ Hub" width="150" height="38" /></div>`
}

function ChangePassword() {
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    if (pw.length < 8) return setError('Bitte mindestens 8 Zeichen.')
    if (pw !== pw2) return setError('Die beiden Passwörter sind nicht gleich.')
    setBusy(true)
    try {
      await updatePassword(pw)
      closeDialog()
      toast('Neues Passwort gespeichert')
    } catch (err) {
      setError(errorText(err))
      setBusy(false)
    }
  }
  return html`<${Modal} title="Passwort ändern" onClose=${closeDialog}>
    ${isDemo
      ? html`<p>Im Demo-Modus gibt es keine Konten und keine Passwörter.</p>`
      : html`<form onSubmit=${submit}>
          <${Field} label="Neues Passwort" htmlFor="cp-1" hint="Mindestens 8 Zeichen">
            <input id="cp-1" type="password" autocomplete="new-password" value=${pw} onInput=${(e) => setPw(e.target.value)} />
          <//>
          <${Field} label="Noch einmal" htmlFor="cp-2">
            <input id="cp-2" type="password" autocomplete="new-password" value=${pw2} onInput=${(e) => setPw2(e.target.value)} />
          <//>
          ${error && html`<p class="form-error" role="alert">${error}</p>`}
          <div class="form-actions">
            <button type="button" class="btn" onClick=${closeDialog}>Abbrechen</button>
            <button type="submit" class="btn btn-primary" disabled=${busy || !pw}>Speichern</button>
          </div>
        </form>`}
  <//>`
}
dialogKinds['change-password'] = ChangePassword

export function AccountMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef()
  useEffect(() => {
    if (!open) return
    const onDoc = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false)
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])
  const me = state.me || {}
  return html`<div class="account" ref=${ref}>
    <button type="button" class="header-icon" aria-label="Kontomenü" aria-expanded=${open} onClick=${() => setOpen(!open)}>
      <${Icon} name="account" size=${24} />
    </button>
    ${open &&
    html`<div class="account-menu" role="menu">
      <div class="account-who">
        <strong>${me.name}</strong>
        <span class="muted small">${me.email}</span>
        <span class="muted small">${me.role === 'admin' ? 'Admin' : 'Mitglied'}</span>
      </div>
      <button
        type="button"
        role="menuitem"
        onClick=${() => {
          setOpen(false)
          openDialog({ kind: 'change-password' })
        }}
      >
        <${Icon} name="lock" size=${18} /> Passwort ändern
      </button>
      ${!isDemo &&
      html`<button
        type="button"
        role="menuitem"
        onClick=${() => {
          setOpen(false)
          signOut()
        }}
      >
        <${Icon} name="logout" size=${18} /> Abmelden
      </button>`}
    </div>`}
  </div>`
}

