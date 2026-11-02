-- ============================================================
-- beQ CRM: Datenbankschema
--
-- Ausführen: in Supabase links „SQL Editor“, „New query“, den ganzen
-- Inhalt dieser Datei einfügen, „Run“. Erwartet: „Success. No rows returned“.
--
-- Die Datei lässt sich gefahrlos ein zweites Mal ausführen. Sie legt nur an,
-- was noch fehlt, und erneuert Funktionen und Zugriffsregeln.
-- Die Startprojekte kommen nur hinein, wenn noch gar kein Projekt existiert.
--
-- Zugriff: Nur wer angemeldet ist UND aktiv in team_members steht, darf lesen
-- und schreiben. team_members ändern darf nur, wer dort die Rolle admin hat.
-- ============================================================

-- ------------------------------------------------------------
-- Hilfsfunktionen
-- ------------------------------------------------------------

-- E-Mail der angemeldeten Person, klein geschrieben (leer, wenn niemand angemeldet ist)
create or replace function public.current_email()
returns text
language sql stable
set search_path = ''
as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''))
$$;

-- ------------------------------------------------------------
-- Tabellen
-- ------------------------------------------------------------

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text not null,
  role text not null default 'mitglied' check (role in ('admin', 'mitglied')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
-- E-Mail eindeutig, ohne Rücksicht auf Groß- und Kleinschreibung
create unique index if not exists team_members_email_key on public.team_members (lower(email));

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null default '#37BA98',
  sort integer not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null,
  sort integer not null default 0,
  kind text not null check (kind in ('todo', 'doing', 'waiting', 'later', 'done')),
  created_at timestamptz not null default now()
);
-- Höchstens eine Spalte der Art „done“ je Projekt (dass es genau eine gibt, sichert die App)
create unique index if not exists stages_one_done_per_project on public.stages (project_id) where kind = 'done';

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  website text,
  address text,
  industry text,
  labels text[] not null default '{}',
  external_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.persons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  org_id uuid references public.organizations (id) on delete set null,
  position text,
  emails text[] not null default '{}',
  phones text[] not null default '{}',
  linkedin_url text,
  labels text[] not null default '{}',
  external_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  held_at timestamptz not null default now(),
  duration_min integer,
  project_id uuid references public.projects (id) on delete set null,
  summary text,
  action_items text,
  extra_names text[] not null default '{}',
  source text not null default 'manuell' check (source in ('manuell', 'fireflies')),
  external_id text unique,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.meeting_persons (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  person_id uuid not null references public.persons (id) on delete cascade,
  unique (meeting_id, person_id)
);

create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  project_id uuid not null references public.projects (id) on delete restrict,
  stage_id uuid not null references public.stages (id) on delete restrict,
  person_id uuid references public.persons (id) on delete set null,
  org_id uuid references public.organizations (id) on delete set null,
  assignee text,
  priority text check (priority in ('hoch', 'mittel', 'niedrig')),
  due_date date,
  archived boolean not null default false,
  meeting_id uuid references public.meetings (id) on delete set null,
  -- Zeitpunkt des letzten Spaltenwechsels, für „Warte auf Rückmeldung … seit …“
  stage_changed_at timestamptz not null default now(),
  external_id text unique,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  card_id uuid references public.cards (id) on delete cascade,
  person_id uuid references public.persons (id) on delete cascade,
  org_id uuid references public.organizations (id) on delete cascade,
  meeting_id uuid references public.meetings (id) on delete cascade,
  author text,
  external_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Eine Notiz hängt immer an mindestens einem Eintrag
  constraint notes_has_parent check (num_nonnulls(card_id, person_id, org_id, meeting_id) >= 1)
);

-- ------------------------------------------------------------
-- Indizes (Fremdschlüssel, Fälligkeit, Meeting-Datum)
-- ------------------------------------------------------------
create index if not exists stages_project_idx on public.stages (project_id);
create index if not exists persons_org_idx on public.persons (org_id);
create index if not exists persons_emails_idx on public.persons using gin (emails);
create index if not exists meetings_project_idx on public.meetings (project_id);
create index if not exists meetings_held_at_idx on public.meetings (held_at);
create index if not exists meeting_persons_meeting_idx on public.meeting_persons (meeting_id);
create index if not exists meeting_persons_person_idx on public.meeting_persons (person_id);
create index if not exists cards_project_idx on public.cards (project_id);
create index if not exists cards_stage_idx on public.cards (stage_id);
create index if not exists cards_person_idx on public.cards (person_id);
create index if not exists cards_org_idx on public.cards (org_id);
create index if not exists cards_meeting_idx on public.cards (meeting_id);
create index if not exists cards_due_date_idx on public.cards (due_date);
create index if not exists notes_card_idx on public.notes (card_id);
create index if not exists notes_person_idx on public.notes (person_id);
create index if not exists notes_org_idx on public.notes (org_id);
create index if not exists notes_meeting_idx on public.notes (meeting_id);

-- ------------------------------------------------------------
-- Zugriffsfunktionen
-- security definer, weil die Regeln auf team_members sonst sich selbst aufrufen
-- ------------------------------------------------------------

create or replace function public.is_team_member()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.team_members t
    where lower(t.email) = public.current_email() and t.active
  )
$$;

create or replace function public.is_team_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.team_members t
    where lower(t.email) = public.current_email() and t.active and t.role = 'admin'
  )
$$;

-- Name eines aktiven Admins, für die Meldung „Dein Konto ist noch nicht freigeschaltet“.
-- Gibt nur einen Namen preis, keine E-Mail-Adressen.
create or replace function public.crm_admin_name()
returns text
language sql stable security definer
set search_path = ''
as $$
  select t.name from public.team_members t
  where t.active and t.role = 'admin'
  order by t.created_at
  limit 1
$$;

revoke all on function public.is_team_member() from public, anon;
revoke all on function public.is_team_admin() from public, anon;
revoke all on function public.crm_admin_name() from public, anon;
grant execute on function public.current_email() to authenticated;
grant execute on function public.is_team_member() to authenticated;
grant execute on function public.is_team_admin() to authenticated;
grant execute on function public.crm_admin_name() to authenticated;

-- ------------------------------------------------------------
-- Trigger: Zeitstempel, Autor, Spaltenwechsel
-- ------------------------------------------------------------

-- updated_at bei jeder Änderung
create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

-- created_by setzt die Datenbank (Importe ohne Anmeldung behalten ihren Wert)
create or replace function public.tg_set_created_by()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(nullif(public.current_email(), ''), new.created_by);
  else
    new.created_by := old.created_by;
  end if;
  return new;
end
$$;

-- Aufgaben: Spaltenwechsel merken
create or replace function public.tg_cards_stage_changed()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.stage_changed_at := coalesce(new.stage_changed_at, now());
  elsif new.stage_id is distinct from old.stage_id then
    new.stage_changed_at := now();
  end if;
  return new;
end
$$;

-- Notizen: Autor setzt die Datenbank
create or replace function public.tg_notes_author()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.author := coalesce(nullif(public.current_email(), ''), new.author);
  else
    new.author := old.author;
  end if;
  return new;
end
$$;

-- Eine neue Notiz schiebt Aufgabe, Kontakt und Firma in den Listen nach oben
create or replace function public.tg_notes_touch_parents()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.card_id is not null then
    update public.cards set updated_at = now() where id = new.card_id;
  end if;
  if new.person_id is not null then
    update public.persons set updated_at = now() where id = new.person_id;
  end if;
  if new.org_id is not null then
    update public.organizations set updated_at = now() where id = new.org_id;
  end if;
  return null;
end
$$;

drop trigger if exists set_updated_at on public.projects;
create trigger set_updated_at before update on public.projects
  for each row execute function public.tg_set_updated_at();
drop trigger if exists set_updated_at on public.organizations;
create trigger set_updated_at before update on public.organizations
  for each row execute function public.tg_set_updated_at();
drop trigger if exists set_updated_at on public.persons;
create trigger set_updated_at before update on public.persons
  for each row execute function public.tg_set_updated_at();
drop trigger if exists set_updated_at on public.meetings;
create trigger set_updated_at before update on public.meetings
  for each row execute function public.tg_set_updated_at();
drop trigger if exists set_updated_at on public.cards;
create trigger set_updated_at before update on public.cards
  for each row execute function public.tg_set_updated_at();
drop trigger if exists set_updated_at on public.notes;
create trigger set_updated_at before update on public.notes
  for each row execute function public.tg_set_updated_at();

drop trigger if exists set_created_by on public.cards;
create trigger set_created_by before insert or update on public.cards
  for each row execute function public.tg_set_created_by();
drop trigger if exists set_created_by on public.meetings;
create trigger set_created_by before insert or update on public.meetings
  for each row execute function public.tg_set_created_by();

drop trigger if exists stage_changed on public.cards;
create trigger stage_changed before insert or update on public.cards
  for each row execute function public.tg_cards_stage_changed();

drop trigger if exists set_author on public.notes;
create trigger set_author before insert or update on public.notes
  for each row execute function public.tg_notes_author();
drop trigger if exists touch_parents on public.notes;
create trigger touch_parents after insert on public.notes
  for each row execute function public.tg_notes_touch_parents();

-- ------------------------------------------------------------
-- Zugriffsschutz (Row Level Security) und Rechte
-- Neue Supabase-Projekte geben Tabellen nicht automatisch frei,
-- deshalb stehen die Rechte (grant) hier ausdrücklich.
-- ------------------------------------------------------------

grant usage on schema public to authenticated;

-- team_members: alle im Team lesen, nur Admins ändern
alter table public.team_members enable row level security;
revoke all on public.team_members from anon;
grant select, insert, update, delete on public.team_members to authenticated;
drop policy if exists team_read on public.team_members;
create policy team_read on public.team_members
  for select to authenticated using (public.is_team_member());
drop policy if exists admin_insert on public.team_members;
create policy admin_insert on public.team_members
  for insert to authenticated with check (public.is_team_admin());
drop policy if exists admin_update on public.team_members;
create policy admin_update on public.team_members
  for update to authenticated using (public.is_team_admin()) with check (public.is_team_admin());
drop policy if exists admin_delete on public.team_members;
create policy admin_delete on public.team_members
  for delete to authenticated using (public.is_team_admin());

-- Alle anderen Tabellen: wer aktiv im Team ist, darf alles
do $$
declare
  t text;
begin
  foreach t in array array['projects', 'stages', 'organizations', 'persons', 'meetings', 'meeting_persons', 'cards', 'notes']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('drop policy if exists team_all on public.%I', t);
    execute format(
      'create policy team_all on public.%I for all to authenticated using (public.is_team_member()) with check (public.is_team_member())',
      t
    );
  end loop;
end
$$;

-- ------------------------------------------------------------
-- Startdaten: Projekte und Spalten (nur wenn noch kein Projekt existiert)
-- ------------------------------------------------------------
do $$
declare
  p record;
  pid uuid;
begin
  if not exists (select 1 from public.projects) then
    for p in
      select * from (values
        ('Partnervertrieb', '#37BA98', 1),
        ('Pilotkunden', '#34495A', 2),
        ('Events', '#27836B', 3),
        ('Allgemein', '#5B6B75', 4)
      ) as v (name, color, sort)
    loop
      insert into public.projects (name, color, sort) values (p.name, p.color, p.sort) returning id into pid;
      insert into public.stages (project_id, name, sort, kind) values
        (pid, 'To-dos', 1, 'todo'),
        (pid, 'In Arbeit', 2, 'doing'),
        (pid, 'Warte auf Rückmeldung', 3, 'waiting'),
        (pid, 'Später', 4, 'later'),
        (pid, 'Erledigt', 5, 'done');
    end loop;
  end if;
end
$$;
