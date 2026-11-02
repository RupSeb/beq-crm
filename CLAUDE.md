# beQ CRM: Regeln für Claude

Claude Code liest diese Datei in jeder Sitzung in diesem Ordner automatisch. Sie gilt für den ersten Bau und für alle späteren Änderungen.

## Worum es geht

Ein schlankes, internes CRM für das Team der beQ. Es bündelt, was im Alltag gebraucht wird: Aufgaben mit Dringlichkeit und Fälligkeit, ein Board pro Projekt, Kontakte, Firmen, Notizen und Meetings. Es läuft im Browser und lässt sich auf dem Handy wie eine App installieren.

Wer mit dir arbeitet, ist meist kein Entwickler. Erkläre deshalb in einfachen Worten, was du tust und was die Person selbst klicken muss. Fachbegriffe nur, wenn sie in der Oberfläche von Supabase, Netlify oder GitHub genau so heißen.

## Technik

- Reine Web-App ohne Build-Schritt. Kein npm, kein Bundler, kein Framework-Setup. Node.js muss nicht installiert sein.
- Oberfläche mit Preact und htm als ES-Module. Die Bibliotheken liegen als Dateien in `app/vendor/`: `htm/preact/standalone.module.js` (htm 3.1.1, enthält Preact und die Hooks), `@supabase/supabase-js` Version 2 als UMD-Datei und DOMPurify Version 3 als ES-Modul. Einmal mit fester Versionsnummer herunterladen (unpkg.com oder cdn.jsdelivr.net, wenn die gesperrt sind aus dem npm-Register mit `npm pack paket@version`), danach lädt die App zur Laufzeit nichts von fremden Servern, auch keine Schriften. Die Versionen stehen in `app/vendor/VERSIONEN.txt`.
- Datenbank und Anmeldung über Supabase (Region EU). Zugang nur per E-Mail und Passwort.
- Nur der Ordner `app/` wird veröffentlicht. Alles andere (`supabase/`, `tools/`, `import/`, `export/`, `.env`) bleibt auf dem Rechner bzw. im privaten Repository.
- Hilfsskripte (Import, Abgleich) in Python 3, möglichst nur mit der Standardbibliothek. Wenn ein Paket nötig ist, nenn es und erkläre die Installation in einem Satz. Jede Datei bekommt oben einen kurzen Kommentar, wofür sie da ist und wie man sie startet.
- Vorschau: `python -m http.server 5173 --directory app`, dann http://localhost:5173. In der Cloud-Sitzung sieht die Person diese Adresse nicht. Dort prüfst du selbst mit dem vorinstallierten Chromium (Playwright) und zeigst Bildschirmfotos.
- App-Symbole: `python tools/make_icons.py` (braucht Pillow).

## Arbeitsumgebung: webbasiert

Das CRM hängt an keinem einzelnen Rechner. Alles läuft im Browser:

- Gearbeitet wird mit Claude Code im Web (claude.ai/code) auf diesem GitHub-Repository. Jede Sitzung startet mit einer frischen Kopie. Was bleiben soll, muss committet und hochgeladen sein.
- Netlify ist mit dem Repository verbunden und veröffentlicht jeden Stand im Hauptzweig von selbst. Veröffentlichungsordner `app`, kein Build-Befehl.
- SQL-Dateien führt die Person selbst im SQL Editor von Supabase aus.
- Geheime Schlüssel (Supabase secret key, Pipedrive, Fireflies) stehen nie im Repository und nie im Chat. Für Skripte, die regelmäßig laufen, kommen sie als Secrets zu GitHub (Settings, Secrets and variables, Actions). Für einmalige Läufe in einer Claude-Sitzung trägt die Person sie in den Umgebungseinstellungen der Sitzung ein. Skripte lesen sie aus Umgebungsvariablen und geben sie nie aus.
- Regelmäßige Abgleiche (Fireflies, später Mail und Kalender) laufen als GitHub Actions mit Zeitplan, nicht über die Aufgabenplanung eines Rechners.
- Demophase: Das Repository liegt zunächst im privaten GitHub-Konto der Person und zieht später in die Organisation der beQ um. Bis dahin nur erfundene Daten, keine Verbindung zu einer Datenbank mit echten Kontakten.

## Datenmodell, Besonderheiten

- `cards.stage_changed_at` setzt die Datenbank, wenn eine Aufgabe die Spalte wechselt. „Warte auf Rückmeldung … seit …“ rechnet damit, nicht mit `updated_at`, weil `updated_at` sich auch bei jeder neuen Notiz ändert.
- `is_team_member()` und `is_team_admin()` sind `security definer`, sonst ruft sich die Zugriffsregel auf `team_members` endlos selbst auf.
- `supabase/01_schema.sql` lässt sich gefahrlos ein zweites Mal ausführen.
- Kommentare auf Deutsch, Namen von Variablen und Funktionen auf Englisch. Code so schreiben, dass ein späterer Claude ihn ohne Vorwissen versteht.

## Sicherheit und Datenschutz

- Jede Tabelle hat Row Level Security. Zugriff hat nur, wer in der Tabelle `team_members` steht und aktiv ist. Neue Tabellen bekommen sofort dieselbe Regel und ausdrückliche Rechte (`grant`), weil neue Supabase-Projekte Tabellen nicht automatisch freigeben.
- In die App gehören nur die Project URL und der öffentliche Schlüssel (publishable key, früher anon key). Der geheime Schlüssel (secret key, früher service_role) steht nur in `.env`. Diese Datei wird nie veröffentlicht, nie ins Repository übernommen und nie im Chat ausgegeben. `.gitignore` von Anfang an anlegen.
- Selbstregistrierung gibt es nicht. Konten legt ein Admin in Supabase an.
- Beispieldaten im Demo-Modus sind komplett erfunden (Namen, Firmen, Adressen auf `example.com`). Nie echte Kontakte, Mails oder Meeting-Inhalte in Code, Beispieldaten, Commits oder Screenshots.
- Fremden Text (Notizen, Mails, Meeting-Zusammenfassungen) nie ungeprüft als HTML einsetzen. Als Text ausgeben oder vorher mit DOMPurify bereinigen.
- Vor allem, was Daten löscht oder überschreibt (Import erneut laufen lassen, Spalten löschen, Tabellen ändern), kurz fragen.

## Design: beQ Hub

Die App folgt dem Corporate Design der beQ Hub (Stand Oktober 2026). Die Farbwelt der alten beQ-Unterlagen (`#1C2545`, `#00D58F`) wird nicht verwendet und nicht gemischt.

**Farben** (exakt diese Werte, als CSS-Variablen an einer Stelle):

| Rolle | HEX | Einsatz in der App |
|---|---|---|
| Navy | `#0D1822` | Kopfleiste, Navigation, Anmeldeseite, Text auf Weiß |
| Grün | `#37BA98` | Akzent: Hauptknopf, aktiver Reiter, Haken, wichtigste Zahl |
| Grün dunkel | `#27836B` | grüne Schrift unter 18 px auf Weiß, Kicker, Links |
| Grün hell | `#BFEADF` | Flächen, zum Beispiel ausgewählte Zeile oder Marke „heute fällig“ |
| Navy 2 | `#1B2B37` | Karten auf Navy, Flächen im Dunkelmodus |
| Navy 3 | `#34495A` | Linien auf Dunkel |
| Schiefer | `#5B6B75` | Nebentext, Beschriftungen |
| Grau | `#9AA7B0` | deaktivierte Elemente, Platzhalter |
| Linie | `#DCE2E6` | Trennlinien |
| Karte | `#F1F4F6` | Karten und Board-Spalten auf Weiß |
| Weiß | `#FFFFFF` | Inhaltsfläche |

- Navy und Weiß tragen rund 70 Prozent der Fläche. Grün markiert pro Ansicht nur das Wichtigste. `#37BA98` nie für kleine Schrift auf Weiß, dafür `#27836B`.
- Auf grünen Knöpfen steht Navy-Text.
- Einzige Funktionsfarbe außerhalb der Palette: ein gedecktes Rot (`#C2513F`) nur für „überfällig“ und Fehlermeldungen.
- Projektfarben (Punkte an Reitern und Karten) aus der Palette: Grün, Navy 3, Grau, Grün dunkel, Grün hell, Schiefer. Nichts Buntes. Im Dunkelmodus müssen die Punkte sichtbar bleiben, notfalls mit hellerer Abstufung.

**Aufbau**

- Kopfleiste und Navigation in Navy mit dem Logo `vorlagen/logo/beQ-Hub-Logo-horizontal-dunkel.svg`, daneben klein „CRM“ in Grau.
- Inhalt auf Weiß. Karten, Kacheln und Board-Spalten als abgerundete Flächen in `#F1F4F6` (Radius etwa 10 px), ohne Rahmen und ohne Schatten. Abstände großzügig und einheitlich.
- Seitenkopf wie auf den Hub-Folien: darüber ein Kicker (klein, Großbuchstaben, fett, Grün dunkel), darunter der Titel fett in Navy.
- Anmeldeseite dunkel in Navy mit grünen Signal-Bögen (konzentrische Bögen aus einer Ecke, nach außen immer transparenter, als SVG im Code). Anmeldekarte in Navy 2.
- Dunkelmodus folgt der Systemeinstellung: Grund Navy, Karten Navy 2, Linien Navy 3, Text Weiß, Nebentext Grau, grüne Schrift in `#37BA98`, Logo-Variante „dunkel“.
- Icons als schlichte Linien-Icons direkt als SVG im Code, einfarbig: auf Weiß Navy, auf Navy Grün oder Weiß. Keine Icon-Schriften.
- Keine Balken, Streifen oder Unterstreichungen als Schmuck, keine Verläufe, keine Schatten außer einer leichten Abdunklung hinter geöffneten Detailfenstern.

**Schrift**

- Hausschrift ist DIN Next W1G. Sie ist lizenzpflichtig und darf nur mit einer Web-Lizenz auf eine Website. Deshalb nutzt die App Jost (freie Lizenz, Dateien in `vorlagen/fonts/Jost/`), kopiert nach `app/fonts/` und per `@font-face` eingebunden. Hat die beQ eine Web-Lizenz für DIN Next W1G, werden nur die Schriftdateien getauscht.
- Titel fett, Beschriftungen Medium, Text Regular. Nie Serifenschriften, nie Arial oder Segoe UI als Ersatz.

**Logo**

- Dateien in `vorlagen/logo/`: horizontal für dunklen Grund (`…-dunkel`) und hellen Grund (`…-hell`), jeweils als SVG und PNG, dazu `beQ-Hub-Logo-Quadrat.png` und `beQ-Hub-Logo-Original.svg`.
- Nie verzerren, umfärben oder mit Effekten versehen. Rundherum Freiraum mindestens in Höhe des „e“.
- App-Symbole (Handy, Browser-Tab) aus `beQ-Hub-Logo-Original.svg` bzw. `beQ-Hub-Logo-Quadrat.png` erzeugen: randlose Navy-Fläche, Schriftzug mittig, bei der maskierbaren Variante nur in den inneren 80 Prozent. Nicht nachzeichnen.

## Sprache und Schreibregeln

Gilt für alle Texte in der App, für Fehlermeldungen, `ANLEITUNG.md` und deine Antworten.

- Marke immer „beQ“ (b klein, Q groß) und „beQ Hub“, auch in Überschriften und Labels. Bei `text-transform: uppercase` den Markennamen ausnehmen.
- Du-Form in der Oberfläche.
- Kein Gendern mit Doppelpunkt, Stern oder Unterstrich.
- Keine Semikolons. Keine langen oder mittellangen Gedankenstriche, auch nicht in Zeitspannen: „10:00 bis 11:00“, „3. bis 5. März“. Bindestriche in Wörtern wie „E-Mail“ sind richtig.
- Echte Umlaute und ß, nie ae, oe, ue oder ss als Ersatz.
- Deutsche Anführungszeichen „so“.
- Kurz und klar, wie ein Mensch schreibt. Fehlermeldungen sagen, was passiert ist und was man tun kann („Keine Verbindung. Bitte gleich noch einmal versuchen.“), nie nur einen technischen Code.
- Platzhalter für fehlende Angaben in eckigen Klammern, damit sie auffallen.

## Arbeitsweise

- Bei größeren Aufgaben erst in wenigen Sätzen sagen, wie du vorgehst, dann bauen.
- Nach dem Bauen selbst prüfen: lokale Vorschau starten, die wichtigsten Abläufe durchklicken, auch in Handybreite (390 px) und im Dunkelmodus. Erst dann „fertig“ melden.
- Am Ende jeder Aufgabe in drei bis fünf Sätzen sagen, was sich geändert hat, was die Person jetzt tun muss (zum Beispiel neu hochladen oder eine SQL-Datei in Supabase ausführen) und was noch offen ist.
- `ANLEITUNG.md` aktuell halten. Jede Änderung am Datenbankschema als eigene, nummerierte SQL-Datei in `supabase/` ablegen (`01_schema.sql`, `02_team.sql`, `03_…`), damit klar ist, was schon ausgeführt wurde. Bereits ausgeführte Dateien nicht mehr ändern.
- Wenn ein Fakt fehlt (Namen, Projekte, Adressen), nachfragen statt erfinden.
