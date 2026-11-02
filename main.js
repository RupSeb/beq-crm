// Einstieg der App: Rahmen (Kopfleiste, Navigation), Seitenwahl, Service Worker
import { html, render } from './lib/preact.js'
import { Icon } from './lib/icons.js'
import { useStore, boot, isDemo, resetDemo, confirmDialog, toast } from './store.js'
import { useRoute } from './router.js'
import { Dialogs, Toasts } from './ui/common.js'
import { Overview } from './ui/overview.js'
import { Board } from './ui/board.js'
import { CardPanel } from './ui/card.js'
import { MeetingsList, MeetingDetail, MeetingNew } from './ui/meetings.js'
import { ContactsList, ContactDetail, ContactForm } from './ui/contacts.js'
import { OrgsList, OrgDetail, OrgForm } from './ui/orgs.js'
import { Login, SetPassword, NotMember, AuthError, Splash, AccountMenu } from './ui/auth.js'

const NAV = [
  { key: '', label: 'Übersicht', icon: 'home' },
  { key: 'board', label: 'Board', icon: 'board' },
  { key: 'meetings', label: 'Meetings', icon: 'meetings' },
  { key: 'kontakte', label: 'Kontakte', icon: 'contacts' },
  { key: 'firmen', label: 'Firmen', icon: 'orgs' },
]

function Page({ route }) {
  const [section, id, sub] = route.parts
  switch (section) {
    case undefined:
      return html`<${Overview} />`
    case 'board':
      return html`<${Board} projectId=${id} />`
    case 'meetings':
      if (id === 'neu') return html`<${MeetingNew} />`
      return id ? html`<${MeetingDetail} id=${id} key=${id} />` : html`<${MeetingsList} />`
    case 'kontakte':
      if (id === 'neu') return html`<${ContactForm} key="neu" />`
      if (id && sub === 'bearbeiten') return html`<${ContactForm} id=${id} key=${'edit' + id} />`
      return id ? html`<${ContactDetail} id=${id} />` : html`<${ContactsList} />`
    case 'firmen':
      if (id === 'neu') return html`<${OrgForm} key="neu" />`
      if (id && sub === 'bearbeiten') return html`<${OrgForm} id=${id} key=${'edit' + id} />`
      return id ? html`<${OrgDetail} id=${id} />` : html`<${OrgsList} />`
    default:
      return html`<${Overview} />`
  }
}

function DemoBadge() {
  const reset = async () => {
    const ok = await confirmDialog({
      title: 'Beispieldaten zurücksetzen?',
      text: 'Alles, was du in der Demo geändert hast, wird durch frische Beispieldaten ersetzt.',
      confirmLabel: 'Zurücksetzen',
    })
    if (ok) {
      resetDemo()
      toast('Beispieldaten sind frisch')
    }
  }
  return html`<div class="demo">
    <span class="demo-badge" title="Alle Daten sind erfunden und liegen nur in diesem Browser">Demo</span>
    <button type="button" class="header-btn" onClick=${reset} title="Beispieldaten zurücksetzen">
      <${Icon} name="reset" size=${18} /><span class="hide-sm">Zurücksetzen</span>
    </button>
  </div>`
}

function Shell({ route }) {
  const section = route.parts[0] || ''
  const cardId = route.params.get('karte')
  return html`<div class="shell">
    <header class="topbar">
      <a class="brand" href="#/" aria-label="beQ CRM, zur Übersicht">
        <img src="img/logo-dunkel.svg" alt="beQ Hub" width="102" height="26" />
        <span class="brand-crm">CRM</span>
      </a>
      <nav class="topnav" aria-label="Bereiche">
        ${NAV.map(
          (n) => html`<a href=${'#/' + n.key} class=${section === n.key ? 'active' : ''} aria-current=${section === n.key ? 'page' : undefined}>
            ${n.label}
          </a>`
        )}
      </nav>
      <div class="topbar-right">
        ${isDemo && html`<${DemoBadge} />`}
        <${AccountMenu} />
      </div>
    </header>
    <main class="content" id="inhalt">
      <${Page} route=${route} />
    </main>
    <nav class="bottomnav" aria-label="Bereiche">
      ${NAV.map(
        (n) => html`<a href=${'#/' + n.key} class=${section === n.key ? 'active' : ''} aria-current=${section === n.key ? 'page' : undefined}>
          <${Icon} name=${n.icon} size=${22} />
          <span>${n.label}</span>
        </a>`
      )}
    </nav>
    ${cardId && html`<${CardPanel} id=${cardId} key=${cardId} />`}
    <${Dialogs} />
    <${Toasts} />
  </div>`
}

function App() {
  const st = useStore()
  const route = useRoute()
  switch (st.auth) {
    case 'loading':
      return html`<${Splash} />`
    case 'login':
      return html`<${Login} /><${Toasts} />`
    case 'set-password':
      return html`<${SetPassword} />`
    case 'not-member':
      return html`<${NotMember} />`
    case 'error':
      return html`<${AuthError} />`
    default:
      return html`<${Shell} route=${route} />`
  }
}

// Seitenwechsel: nach oben scrollen (nicht, wenn nur eine Aufgabe auf- oder zugeht)
let lastPath = location.hash.split('?')[0]
window.addEventListener('hashchange', () => {
  const path = location.hash.split('?')[0]
  if (path !== lastPath) window.scrollTo(0, 0)
  lastPath = path
})

render(html`<${App} />`, document.getElementById('app'))
boot()

// Service Worker: hält die App-Dateien vor, fragt aber immer zuerst das Netz
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {})
}
