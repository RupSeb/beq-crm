// Regeln, die in Supabase die Datenbank selbst übernimmt (Standardwerte, Trigger, Kaskaden).
// Der Demo-Modus nutzt sie als „Datenbank“, die App nutzt sie, um Änderungen sofort anzuzeigen.
import { uid, nowIso } from '../lib/util.js'

export const TABLES = [
  'team_members',
  'projects',
  'stages',
  'organizations',
  'persons',
  'meetings',
  'meeting_persons',
  'cards',
  'notes',
]

const WITH_UPDATED_AT = new Set(['projects', 'organizations', 'persons', 'meetings', 'cards', 'notes'])
const WITH_CREATED_AT = new Set(['team_members', 'projects', 'stages', 'organizations', 'persons', 'meetings', 'cards', 'notes'])

const DEFAULTS = {
  team_members: { role: 'mitglied', active: true },
  projects: { color: '#37BA98', sort: 0, archived: false },
  stages: { sort: 0 },
  organizations: { website: null, address: null, industry: null, labels: [], external_id: null },
  persons: { org_id: null, position: null, emails: [], phones: [], linkedin_url: null, labels: [], external_id: null },
  meetings: {
    duration_min: null,
    project_id: null,
    summary: null,
    action_items: null,
    extra_names: [],
    source: 'manuell',
    external_id: null,
    created_by: null,
  },
  meeting_persons: {},
  cards: {
    description: null,
    person_id: null,
    org_id: null,
    assignee: null,
    priority: null,
    due_date: null,
    archived: false,
    meeting_id: null,
    external_id: null,
    created_by: null,
  },
  notes: { card_id: null, person_id: null, org_id: null, meeting_id: null, author: null, external_id: null },
}

// Neuer Datensatz mit allem, was die Datenbank selbst ergänzt
export function prepareInsert(table, row, me) {
  const now = nowIso()
  const r = { ...DEFAULTS[table], ...row }
  if (!r.id) r.id = uid()
  if (WITH_CREATED_AT.has(table) && !r.created_at) r.created_at = now
  if (WITH_UPDATED_AT.has(table)) r.updated_at = r.updated_at || now
  if ((table === 'cards' || table === 'meetings') && me) r.created_by = me
  if (table === 'cards' && !r.stage_changed_at) r.stage_changed_at = now
  if (table === 'notes' && me) r.author = me
  return r
}

// Geänderter Datensatz: updated_at, Spaltenwechsel, Autor bleibt
export function prepareUpdate(table, old, patch) {
  const r = { ...old, ...patch }
  if (WITH_UPDATED_AT.has(table)) r.updated_at = nowIso()
  if (table === 'cards' && 'stage_id' in patch && patch.stage_id !== old.stage_id) r.stage_changed_at = nowIso()
  if ('created_by' in old) r.created_by = old.created_by
  if (table === 'notes') r.author = old.author
  return r
}

// Fehler wie aus der Datenbank, damit beide Wege gleich reagieren
export function dbError(code, message) {
  const e = new Error(message)
  e.code = code
  return e
}

// Prüfungen, die in Supabase Einschränkungen der Tabellen übernehmen
export function checkInsert(db, table, row) {
  if (table === 'stages' && row.kind === 'done' && db.stages.some((s) => s.project_id === row.project_id && s.kind === 'done')) {
    throw dbError('23505', 'stages_one_done_per_project')
  }
  if (table === 'notes' && !row.card_id && !row.person_id && !row.org_id && !row.meeting_id) {
    throw dbError('23514', 'notes_has_parent')
  }
  if (table === 'meeting_persons' && db.meeting_persons.some((m) => m.meeting_id === row.meeting_id && m.person_id === row.person_id)) {
    throw dbError('23505', 'meeting_persons_unique')
  }
}

export function checkDelete(db, table, id) {
  if (table === 'stages' && db.cards.some((c) => c.stage_id === id)) throw dbError('23503', 'cards_stage_id_fkey')
  if (table === 'projects' && db.cards.some((c) => c.project_id === id)) throw dbError('23503', 'cards_project_id_fkey')
}

// Eine neue Notiz schiebt Aufgabe, Kontakt und Firma nach oben
export function afterInsert(db, table, row) {
  if (table !== 'notes') return
  const now = row.created_at || nowIso()
  const touch = (t, id) => {
    if (!id) return
    db[t] = db[t].map((x) => (x.id === id ? { ...x, updated_at: now } : x))
  }
  touch('cards', row.card_id)
  touch('persons', row.person_id)
  touch('organizations', row.org_id)
}

// Was beim Löschen mit abhängigen Einträgen passiert (wie in 01_schema.sql)
export function cascadeDelete(db, table, id) {
  const drop = (t, field) => {
    db[t] = db[t].filter((x) => x[field] !== id)
  }
  const unset = (t, field) => {
    db[t] = db[t].map((x) => (x[field] === id ? { ...x, [field]: null } : x))
  }
  if (table === 'projects') {
    drop('stages', 'project_id')
    unset('meetings', 'project_id')
  }
  if (table === 'cards') drop('notes', 'card_id')
  if (table === 'persons') {
    drop('notes', 'person_id')
    drop('meeting_persons', 'person_id')
    unset('cards', 'person_id')
  }
  if (table === 'organizations') {
    drop('notes', 'org_id')
    unset('persons', 'org_id')
    unset('cards', 'org_id')
  }
  if (table === 'meetings') {
    drop('notes', 'meeting_id')
    drop('meeting_persons', 'meeting_id')
    unset('cards', 'meeting_id')
  }
}

export function emptyDb() {
  return Object.fromEntries(TABLES.map((t) => [t, []]))
}
