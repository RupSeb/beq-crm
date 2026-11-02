// Echte Datenbank: Supabase. Gleiche Schnittstelle wie demo.js.
// Die Bibliothek wird erst geladen, wenn sie gebraucht wird (im Demo-Modus nie).
import { TABLES } from './rules.js'

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = src
    s.onload = resolve
    s.onerror = () => reject(new Error('Bibliothek konnte nicht geladen werden'))
    document.head.appendChild(s)
  })
}

// Art des Links aus einer Mail (Passwort zurücksetzen, Einladung), bevor Supabase die Adresse aufräumt
function readLinkInfo() {
  const raw = location.hash.startsWith('#') ? location.hash.slice(1) : ''
  if (!raw.includes('access_token') && !raw.includes('error')) return { type: null, error: null }
  const params = new URLSearchParams(raw)
  return {
    type: params.get('type'),
    error: params.get('error_code') || params.get('error'),
  }
}

export async function createSupabaseApi(config) {
  const link = readLinkInfo()
  await loadScript('vendor/@supabase/supabase-js/supabase.js')
  const client = window.supabase.createClient(config.supabaseUrl, config.supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'beqcrm-auth',
    },
  })

  const check = ({ data, error }) => {
    if (error) throw error
    return data
  }

  // Supabase liefert höchstens 1000 Zeilen auf einmal, deshalb seitenweise laden
  async function fetchAll(table) {
    const pageSize = 1000
    let from = 0
    let rows = []
    for (;;) {
      const data = check(await client.from(table).select('*').range(from, from + pageSize - 1))
      rows = rows.concat(data)
      if (data.length < pageSize) return rows
      from += pageSize
    }
  }

  return {
    mode: 'supabase',
    linkType: link.type,
    linkError: link.error,

    async getSession() {
      const { data } = await client.auth.getSession()
      return data.session ? { email: data.session.user.email } : null
    },
    onAuthChange(cb) {
      client.auth.onAuthStateChange((event, session) => cb(event, session ? { email: session.user.email } : null))
    },
    async signIn(email, password) {
      check(await client.auth.signInWithPassword({ email, password }))
    },
    async signOut() {
      await client.auth.signOut()
    },
    async resetPassword(email) {
      check(await client.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname }))
    },
    async updatePassword(password) {
      check(await client.auth.updateUser({ password }))
    },
    async adminName() {
      const { data, error } = await client.rpc('crm_admin_name')
      return error ? null : data
    },

    async loadAll() {
      const lists = await Promise.all(TABLES.map(fetchAll))
      return Object.fromEntries(TABLES.map((t, i) => [t, lists[i]]))
    },
    async insert(table, row) {
      return check(await client.from(table).insert(row).select().single())
    },
    async update(table, id, patch) {
      return check(await client.from(table).update(patch).eq('id', id).select().single())
    },
    async remove(table, id) {
      check(await client.from(table).delete().eq('id', id))
    },
  }
}
