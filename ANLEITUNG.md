# beQ CRM: Anleitung

Das beQ CRM läuft komplett im Browser. Es hängt an keinem einzelnen Rechner:

| Was | Wo | Wofür |
|---|---|---|
| Code | GitHub, Repository `beq-crm` (privat) | Ablage, jede Änderung ist nachvollziehbar |
| App online | Netlify | veröffentlicht den Ordner `app` von selbst nach jeder Änderung |
| Daten und Anmeldung | Supabase, Region Frankfurt | erst, wenn echte Daten ins CRM kommen |
| Änderungen | Claude Code im Web (claude.ai/code) | du schreibst den Wunsch, Claude baut, testet und lädt hoch |

Solange in `app/config.js` keine Supabase-Adresse steht, läuft die App im **Demo-Modus**: erfundene Beispieldaten, oben die Marke „Demo“, jeder Browser hat seine eigenen Daten. „Zurücksetzen“ holt frische Beispieldaten.

## 1. Online stellen (einmalig)

1. Auf netlify.com anmelden.
2. „Add new project“, dann „Import an existing project“, dann „GitHub“. Netlify fragt einmal nach Zugriff auf GitHub. Wähle das Repository `beq-crm`.
3. Netlify liest die Einstellungen aus der Datei `netlify.toml`: Veröffentlichungsordner `app`, kein Build-Befehl. Einfach „Deploy“ klicken.
4. Unter „Project configuration“ (oder „Site configuration“), „Change project name“ den Namen auf `beq-crm` ändern. Die Adresse ist dann `https://beq-crm.netlify.app`, falls der Name noch frei ist.

Heißen die Knöpfe bei Netlify inzwischen anders, frag Claude, wonach du suchen sollst.

## 2. Änderungen an der App

1. claude.ai/code öffnen, eine neue Sitzung mit dem Repository `beq-crm` starten.
2. Den Wunsch schreiben, am besten einer pro Nachricht. Zum Beispiel: „Die Spalte ‚Später‘ brauchen wir nicht“ oder „Mach die Karten auf dem Board kompakter“.
3. Claude baut, testet im Browser, zeigt Bildschirmfotos und lädt die Änderung hoch. Netlify veröffentlicht nach ein bis zwei Minuten von selbst.
4. Legt Claude eine neue SQL-Datei in `supabase/` an, diese zuerst in Supabase ausführen (siehe unten), dann erst die neue Version benutzen.

**Handy zeigt einen alten Stand:** die App ganz schließen und neu öffnen.

## 3. Aufs Handy legen

- **iPhone:** die Adresse in Safari öffnen, Teilen-Symbol, „Zum Home-Bildschirm“. Danach die App über das neue Symbol öffnen und dort anmelden. Die Anmeldung in Safari gilt nicht für die App auf dem Home-Bildschirm.
- **Android:** die Adresse in Chrome öffnen, Menü (drei Punkte), „App installieren“ oder „Zum Startbildschirm hinzufügen“.

## 4. Echte Daten: Supabase verbinden

Erst, wenn das CRM im Alltag genutzt werden soll. Supabase direkt im Konto der beQ anlegen, nicht privat.

1. Auf supabase.com mit der beQ-Adresse anmelden. Organisation „beQ“ anlegen.
2. „New project“: Name `beq-crm`, Datenbank-Passwort mit „Generate a password“ erzeugen und im Passwort-Manager speichern, Region **Central EU (Frankfurt)**.
3. Links „SQL Editor“, „New query“. Den Inhalt von `supabase/01_schema.sql` aus GitHub kopieren (Datei öffnen, oben rechts „Copy raw file“), einfügen, „Run“. Erwartet: „Success. No rows returned“. Die Datei darf auch ein zweites Mal laufen, sie richtet dabei nichts doppelt ein.
4. „Authentication“, „Sign In / Providers“: **„Allow new users to sign up“ ausschalten**, „Email“ bleibt an.
5. Project URL und Publishable key heraussuchen („Project Settings“, „Data API“ bzw. „API Keys“) und mit Prompt 2 an Claude geben. Den **Secret key** nie in den Chat und nie ins Repository.
6. Nach dem Online-Stellen: „Authentication“, „URL Configuration“, die Netlify-Adresse als **Site URL** und bei **Redirect URLs** eintragen.

Vorher: Mit Supabase den Vertrag zur Auftragsverarbeitung (DPA) abschließen. Für den Alltag den Tarif Pro nehmen, im Tarif Free pausiert das Projekt nach einer Woche ohne Nutzung und es gibt keine Sicherungen.

## 5. Kollegen freischalten und entfernen

- **Neu freischalten:** Claude bitten, die Person in `team_members` einzutragen (Claude schreibt eine SQL-Datei, du führst sie im SQL Editor aus). Dann unter „Authentication“, „Users“, „Add user“, „Create new user“ das Konto anlegen: E-Mail, Startpasswort, „Auto Confirm User“ anhaken. Adresse der App und Startpasswort getrennt schicken. Jeder ändert das Passwort nach der ersten Anmeldung im Kontomenü (Personen-Symbol oben rechts).
- **Entfernen:** in `team_members` auf inaktiv setzen (Table Editor, Haken bei `active` entfernen) und den Nutzer unter „Authentication“, „Users“ löschen. Aufgaben und Notizen bleiben erhalten. Offene Aufgaben der Person neu zuteilen.
- **Passwort vergessen** (ohne eigenen Mailversand): den Nutzer unter „Authentication“, „Users“ löschen und mit neuem Startpasswort neu anlegen. Es geht nichts verloren, weil das CRM Personen an der E-Mail-Adresse erkennt.

## 6. Umzug in die GitHub-Organisation der beQ

Die Demo liegt zunächst in einem privaten GitHub-Konto. Für den Umzug:

1. Bei GitHub im Repository „Settings“, ganz unten „Transfer ownership“, als neuen Besitzer die Organisation der beQ wählen. Verlauf und Dateien ziehen mit.
2. Bei Netlify: entweder das Projekt unter „Build & deploy“, „Link repository“ mit dem umgezogenen Repository neu verbinden, oder im Netlify-Konto der beQ ein neues Projekt wie in Abschnitt 1 anlegen.
3. In claude.ai die Claude-App von GitHub auch für die Organisation zulassen (claude.ai/connect-github).
4. Ändert sich die Adresse der App, in Supabase die Site URL und die Redirect URLs anpassen.

## 7. Wenn etwas nicht klappt

| Was du siehst | Woran es meist liegt | Was hilft |
|---|---|---|
| „E-Mail oder Passwort stimmt nicht“ | Konto fehlt, Passwort falsch oder „Auto Confirm User“ vergessen | unter „Authentication“, „Users“ prüfen, notfalls neu anlegen |
| „Noch nicht freigeschaltet“ | E-Mail fehlt in `team_members` oder steht auf inaktiv | Claude bitten, sie einzutragen, SQL-Datei ausführen |
| „Keine Verbindung“ | Supabase-Projekt pausiert (nur im Tarif Free) | Supabase öffnen, Projekt wieder starten („Restore“) |
| Link aus einer Passwort-Mail führt zu „localhost“ | Site URL fehlt | Abschnitt 4, Punkt 6 |
| Netlify zeigt einen alten Stand | Veröffentlichung läuft noch oder ist fehlgeschlagen | bei Netlify unter „Deploys“ nachsehen, die Meldung an Claude schicken |
