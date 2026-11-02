// Demo-Modus: Daten liegen nur in diesem Browser (localStorage). Gleiche Schnittstelle wie supabase.js.
import { local } from '../lib/util.js'
import { buildSeed, DEMO_ME, DEMO_TEAM } from './seed.js'
import { prepareInsert, prepareUpdate, checkInsert, checkDelete, afterInsert, cascadeDelete, dbError, TABLES } from './rules.js'

const KEY = 'beqcrm-demo-v1'
const clone = (x) => JSON.parse(JSON.stringify(x))

function loadDb() {
  const saved = local.get(KEY)
  if (saved && TABLES.every((t) => Array.isArray(saved[t]))) return saved
  const db = buildSeed()
  local.set(KEY, db)
  return db
}

export function createDemoApi() {
  let db = loadDb()
  const save = () => local.set(KEY, db)
  const find = (table, id) => db[table].find((x) => x.id === id)

  return {
    mode: 'demo',

    // Anmeldung gibt es im Demo-Modus nicht
    async getSession() {
      return { email: DEMO_ME }
    },
    onAuthChange() {},
    async signIn() {},
    async signOut() {},
    async resetPassword() {
      throw dbError('demo', 'Im Demo-Modus nicht verfügbar')
    },
    async updatePassword() {
      throw dbError('demo', 'Im Demo-Modus nicht verfügbar')
    },
    async adminName() {
      return DEMO_TEAM[0].name
    },

    async loadAll() {
      return clone(db)
    },

    async insert(table, row) {
      const r = prepareInsert(table, row, DEMO_ME)
      checkInsert(db, table, r)
      db[table] = [...db[table], r]
      afterInsert(db, table, r)
      save()
      return clone(r)
    },

    async update(table, id, patch) {
      const old = find(table, id)
      if (!old) throw dbError('PGRST116', 'not found')
      const r = prepareUpdate(table, old, patch)
      db[table] = db[table].map((x) => (x.id === id ? r : x))
      save()
      return clone(r)
    },

    async remove(table, id) {
      checkDelete(db, table, id)
      db[table] = db[table].filter((x) => x.id !== id)
      cascadeDelete(db, table, id)
      save()
    },

    // Beispieldaten neu erzeugen
    reset() {
      local.remove(KEY)
      db = loadDb()
    },
  }
}
