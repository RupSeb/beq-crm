// Adressen mit #/…, damit „Zurück“ im Browser funktioniert und man Links teilen kann.
// Beispiel: #/board/<projekt-id>?karte=<aufgaben-id>
import { useState, useEffect } from './lib/preact.js'

export function parseHash() {
  const raw = location.hash.replace(/^#/, '')
  const [pathPart, query = ''] = raw.split('?')
  const parts = pathPart.split('/').filter(Boolean)
  return { parts, params: new URLSearchParams(query), path: '/' + parts.join('/') }
}

export function useRoute() {
  const [route, setRoute] = useState(parseHash)
  useEffect(() => {
    const fn = () => setRoute(parseHash())
    window.addEventListener('hashchange', fn)
    return () => window.removeEventListener('hashchange', fn)
  }, [])
  return route
}

function build(path, params) {
  const q = params && [...params.keys()].length ? '?' + params.toString() : ''
  return '#' + path + q
}

export function navigate(path, params) {
  location.hash = build(path, params ? new URLSearchParams(params) : null)
}

// Einen Parameter setzen oder entfernen, der Rest der Adresse bleibt
export function setParam(key, value, replace = false) {
  const { path, params } = parseHash()
  if (value === null || value === undefined || value === '') params.delete(key)
  else params.set(key, value)
  const target = build(path, params)
  if (replace) history.replaceState(null, '', target)
  if (replace) window.dispatchEvent(new HashChangeEvent('hashchange'))
  else location.hash = target
}

// Aufgabe als Fenster über der aktuellen Seite. Schließen geht einen Schritt zurück,
// wenn die Aufgabe in der App geöffnet wurde, sonst wird nur der Parameter entfernt.
let openedInApp = false
export function openCard(id) {
  openedInApp = !parseHash().params.get('karte')
  setParam('karte', id, !openedInApp)
}
export function closeCard() {
  if (openedInApp) {
    openedInApp = false
    history.back()
  } else {
    setParam('karte', null, true)
  }
}

export const href = (path) => '#' + path
