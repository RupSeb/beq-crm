// Aufgabe (Detailansicht): öffnet sich über der aktuellen Seite, am Rechner rechts, auf dem Handy bildschirmfüllend
import { html, useState, useEffect } from '../lib/preact.js'
import { Icon } from '../lib/icons.js'
import { fmtDateTime, fmtRelative } from '../lib/util.js'
import {
  getCard,
  getProject,
  getPerson,
  getMeeting,
  stagesOf,
  stageOfKind,
  update,
  remove,
  memberName,
  confirmDialog,
  toast,
} from '../store.js'
import { closeCard } from '../router.js'
import { Field, PriorityPicker, ProjectSelect, AssigneeSelect, EntityPicker, Notes, Dot } from './common.js'

export function CardPanel({ id }) {
  const card = getCard(id)
  const [title, setTitle] = useState(card ? card.title : '')
  const [description, setDescription] = useState(card ? card.description || '' : '')

  useEffect(() => {
    if (card) {
      setTitle(card.title)
      setDescription(card.description || '')
    }
  }, [id])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !document.querySelector('.modal')) closeCard()
    }
    window.addEventListener('keydown', onKey)
    document.body.classList.add('panel-open')
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.classList.remove('panel-open')
    }
  }, [])

  if (!card) {
    return html`<div class="backdrop" onClick=${closeCard}>
      <aside class="panel" onClick=${(e) => e.stopPropagation()}>
        <div class="panel-head">
          <div class="kicker">Aufgabe</div>
          <button type="button" class="icon-btn" aria-label="Schließen" onClick=${closeCard}><${Icon} name="x" /></button>
        </div>
        <p class="empty">Diese Aufgabe gibt es nicht mehr.</p>
      </aside>
    </div>`
  }

  const project = getProject(card.project_id)
  const stages = stagesOf(card.project_id)
  const meeting = getMeeting(card.meeting_id)
  const set = (patch) => update('cards', card.id, patch)

  const saveTitle = () => {
    const t = title.trim()
    if (!t) setTitle(card.title)
    else if (t !== card.title) set({ title: t })
  }
  const saveDescription = () => {
    const d = description.trim()
    if (d !== (card.description || '')) set({ description: d || null })
  }

  // Projekt wechseln: Spalte gleicher Art im neuen Projekt
  const changeProject = (projectId) => {
    if (!projectId || projectId === card.project_id) return
    const oldStage = stages.find((s) => s.id === card.stage_id)
    const target = stageOfKind(projectId, oldStage ? oldStage.kind : 'todo')
    set({ project_id: projectId, stage_id: target && target.id })
  }

  // Kontakt wählen: Firma des Kontakts übernehmen, wenn noch keine gesetzt ist
  const changePerson = (personId) => {
    const patch = { person_id: personId }
    const person = getPerson(personId)
    if (person && person.org_id && !card.org_id) patch.org_id = person.org_id
    set(patch)
  }

  const del = async () => {
    const ok = await confirmDialog({ title: 'Aufgabe löschen?', text: `„${card.title}“ und ihre Notizen sind danach weg.`, confirmLabel: 'Löschen', danger: true })
    if (!ok) return
    closeCard()
    await remove('cards', card.id)
    toast('Aufgabe gelöscht')
  }

  return html`<div class="backdrop" onClick=${closeCard}>
    <aside class="panel" role="dialog" aria-modal="true" aria-label=${'Aufgabe ' + card.title} onClick=${(e) => e.stopPropagation()}>
      <div class="panel-head">
        <div class="kicker">${project && html`<${Dot} color=${project.color} />`}Aufgabe${project ? ' · ' + project.name : ''}</div>
        <button type="button" class="icon-btn" aria-label="Schließen" onClick=${closeCard}><${Icon} name="x" /></button>
      </div>
      <div class="panel-body">
        <textarea
          class="title-input"
          rows="2"
          value=${title}
          aria-label="Titel"
          onInput=${(e) => setTitle(e.target.value)}
          onBlur=${saveTitle}
          onKeyDown=${(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              e.target.blur()
            }
          }}
        ></textarea>
        ${card.archived && html`<p class="notice">Diese Aufgabe liegt im Archiv.</p>`}

        <${Field} label="Spalte">
          <div class="stage-picker" role="group" aria-label="Spalte">
            ${stages.map(
              (s) => html`<button
                type="button"
                class=${'chip-btn' + (s.id === card.stage_id ? ' active' : '')}
                aria-pressed=${s.id === card.stage_id}
                onClick=${() => s.id !== card.stage_id && set({ stage_id: s.id })}
              >
                ${s.name}
              </button>`
            )}
          </div>
        <//>

        <div class="field-grid">
          <${Field} label="Projekt" htmlFor="card-project">
            <${ProjectSelect} id="card-project" value=${card.project_id} onChange=${changeProject} />
          <//>
          <${Field} label="Zuständig" htmlFor="card-assignee">
            <${AssigneeSelect} id="card-assignee" value=${card.assignee} onChange=${(v) => set({ assignee: v })} />
          <//>
          <${Field} label="Fällig am" htmlFor="card-due">
            <div class="with-clear">
              <input id="card-due" type="date" value=${card.due_date || ''} onChange=${(e) => set({ due_date: e.target.value || null })} />
              ${card.due_date &&
              html`<button type="button" class="icon-btn small" aria-label="Fälligkeit entfernen" onClick=${() => set({ due_date: null })}>
                <${Icon} name="x" size=${16} />
              </button>`}
            </div>
          <//>
          <${Field} label="Dringlichkeit">
            <${PriorityPicker} value=${card.priority} onChange=${(v) => set({ priority: v })} />
          <//>
          <${Field} label="Kontakt" htmlFor="card-person">
            <${EntityPicker} kind="person" inputId="card-person" value=${card.person_id} onChange=${changePerson} placeholder="Kontakt suchen oder neu anlegen" />
          <//>
          <${Field} label="Firma" htmlFor="card-org">
            <${EntityPicker} kind="org" inputId="card-org" value=${card.org_id} onChange=${(v) => set({ org_id: v })} placeholder="Firma suchen oder neu anlegen" />
          <//>
        </div>

        <${Field} label="Beschreibung" htmlFor="card-desc">
          <textarea
            id="card-desc"
            rows="4"
            value=${description}
            placeholder="Details, Links, nächste Schritte"
            onInput=${(e) => setDescription(e.target.value)}
            onBlur=${saveDescription}
          ></textarea>
        <//>

        ${meeting &&
        html`<${Field} label="Aus dem Meeting">
          <a class="meeting-link" href=${'#/meetings/' + meeting.id}>
            <${Icon} name="meetings" size=${16} /> ${meeting.title}, ${fmtDateTime(meeting.held_at)}
          </a>
        <//>`}

        <h3 class="section-title">Notizen</h3>
        <${Notes} field="card_id" id=${card.id} />

        <div class="panel-foot">
          <span class="muted small">
            Angelegt von ${memberName(card.created_by) || 'unbekannt'} ${fmtRelative(card.created_at)}
          </span>
          <div class="panel-actions">
            <button type="button" class="btn" onClick=${() => set({ archived: !card.archived })}>
              <${Icon} name="archive" size=${16} /> ${card.archived ? 'Aus dem Archiv holen' : 'Archivieren'}
            </button>
            <button type="button" class="btn btn-danger-text" onClick=${del}><${Icon} name="trash" size=${16} /> Löschen</button>
          </div>
        </div>
      </div>
    </aside>
  </div>`
}
