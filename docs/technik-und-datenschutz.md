# Technik und Datenschutz: was tatsächlich gebaut ist

Interne Arbeitsdatei. Hier steht nur, was im Code umgesetzt und mit Tests belegt ist (Stand 14.11.2026). Grundlage für später: TOMs, Verarbeitungsverzeichnis, Infoblatt für die IT des Kunden, Datenschutzerklärung, Löschprotokoll. Nichts hier ist eine Rechtsberatung. Wird bei jedem Bauschritt ergänzt.

Legende: ✅ gebaut und getestet · ◻ geplant, noch nicht gebaut

## 1. Verarbeitete Daten

| Daten | Wozu | Wo | Löschung |
|---|---|---|---|
| E-Mail-Adresse, Zeitpunkt und Version der Einwilligung | Anmeldung, Zustellung des Ergebnisses | Postgres (`users`) | ◻ Regel bei Kündigung/Löschwunsch offen |
| Anmelde-Link und Sitzung | Anmeldung | Postgres, nur als Hash | Link 15 Min. gültig, einmalig; Sitzung 14 Tage |
| Hochgeladener Projektcode (ZIP, entpackt) | Check | Dateiablage je Fall | automatisch nach 30 Tagen, mit Protokoll |
| Antworten auf die Fragen vor dem Check (Zweck, Nutzer, Aufgabe, Zielumgebung, freiwillig) | Einordnung | Postgres (`case_answers`), je Kunde getrennt | ◻ mit dem Fall (noch nicht automatisch) |
| Check-Ergebnis mit Belegen (Datei, Zeile) | Prüfung durch Sebastian | Postgres (`check_results_internal`) | ◻ Aufbewahrungsfrist offen |
| Freigegebenes Ergebnis (Kundensicht) und Freigabe-Protokoll | Anzeige für den Kunden, Nachweis | Postgres (`check_results_public`, `review_log`) | ◻ Aufbewahrungsfrist offen |

Keine Nutzerdaten des Kunden, nur Code. Echte Schlüssel im Code werden nie im Klartext gespeichert oder angezeigt (maskiert).

## 2. Maßnahmen (Grundlage für die TOMs)

**Zugang**
- ✅ Anmeldung nur per E-Mail-Link, kein Passwort. Link 15 Minuten, einmalig, wird erst durch Klick auf einen Button verbraucht (Schutz gegen Mailfilter).
- ✅ Anmelde-Links und Sitzungs-Token liegen nur als SHA-256-Hash in der Datenbank.
- ✅ Sitzungs-Cookie: httpOnly, SameSite Lax, in Produktion Secure. Laufzeit 14 Tage, Abmeldung beendet die Sitzung sofort.
- ✅ Höchstens 5 Anmelde-Links je Adresse in 15 Minuten. Die Antwort verrät nicht, ob es ein Konto gibt.
- ✅ Zugang für Sebastian (Steuerzentrale): nur Adressen aus der Server-Einstellung `STAFF_EMAILS`, Anmeldung höchstens 8 Stunden alt, für alle anderen „nicht gefunden“. Eigene Datenbankrolle `livedock_staff`.
- ◻ Zweiter Faktor für die Steuerzentrale und eigene Instanz hinter eigener Adresse.

**Kundentrennung (harte Regel 6)**
- ✅ Row Level Security in Postgres für alle Kundendaten (Fälle, Projekte, Antworten, Aufträge). Die App-Rolle ist kein Superuser und kann die Sicherheit nicht umgehen. Auch eine Abfrage auf fremde Zeilen liefert nichts, Schreiben auf fremde Zeilen scheitert.
- ✅ Code liegt je Fall in einem eigenen Ordner (Rechte 700). Kein Ordner wird zwischen Fällen geteilt.
- ✅ Ein eigener Hintergrund-Benutzer (`livedock_worker`) sieht alle Fälle, nur für Löschjob und Check. Die App-Rolle hat auf Protokoll und internes Ergebnis keinen Zugriff.

**Umgang mit hochgeladenem Code (harte Regel 1)**
- ✅ Code wird nur entpackt und gelesen, nie ausgeführt.
- ✅ Der Check läuft in einem eigenen Prozess ohne Zugangsdaten zur Datenbank, mit Zeit- und Speicherlimit (10 Minuten, 768 MB). Fehler und Abbrüche hinterlassen keine Details, nur „check failed“.
- ✅ Beim Entpacken abgelehnt: Pfade mit `..` oder absolute Pfade, Verknüpfungen, besondere Dateitypen, verschlüsselte Archive, mehr als 20.000 Dateien, mehr als 300 MB entpackt, einzelne Dateien über 50 MB. Gezählt werden die tatsächlichen Bytes, nicht die Angaben im Archiv.
- ✅ Upload höchstens 50 MB, schon beim Empfang abgebrochen. Nur angemeldete Personen, nur von der eigenen Adresse.
- ✅ `node_modules` und `.git` werden nicht aufbewahrt.

**Löschung (harte Regel 6)**
- ✅ Kopie des Codes wird nach 30 Tagen automatisch gelöscht (täglicher Job), Dateien und Datenbankzeile. Jede Löschung steht im Protokoll (Fall, Zeitpunkt, Zahl der Dateien und Bytes). Ein Eintrag entsteht nur, wenn wirklich gelöscht wurde.
- ◻ Löschprotokoll im Portal für den Kunden sichtbar.
- ◻ Löschung bei Kündigung per Button.

**Eigene Sicherheit (wir erfüllen, was wir anbieten)**
- ✅ Vor jedem Commit prüft die eigene Engine `portal/` und `engine/` (`scripts/selfcheck.ts`, Hook in `.githooks`). Jeder Fund blockiert den Commit. Stand 09.11.2026: keine Funde, alle fünf Bereiche der Portal-Prüfung grün.
- ✅ Keine Standardpasswörter: `npm run db:setup` erzeugt zufällige Passwörter für drei Datenbankrollen (Eigentümer, App, Worker) und schreibt sie in `.env` (nicht in Git, Rechte 600).
- ✅ Bausteine mit bekannten Lücken wurden bei der ersten Selbstprüfung gefunden und aktualisiert (Nodemailer, Next.js).
- ✅ E-Mail-Adressen werden streng geprüft (nur einfache Adressen, keine Anführungszeichen oder Klammern), weil sie in Mail-Kopfzeilen landen.

**Ausgabe und Freigabe (harte Regeln 2 bis 5)**
- ✅ Die Engine gibt nur sichere Funde aus (Konfidenz mindestens 0,8). Die Kundensicht enthält keine Datei, Zeile oder Lösung.
- ✅ Das vollständige Ergebnis liegt in einer Tabelle ohne Zugriff für die Kunden-App (per Test belegt). Der Kunde sieht nur den Fortschritt (welche Schritte fertig sind), nichts zum Ergebnis, bis Sebastian freigibt.
- ✅ Ein kostenloser Check je Fall (Datenbank-Regel), ein Fall je Kunde.
- ✅ Fehlermeldungen und Protokolle enthalten keinen Kundeninhalt.
- ✅ Freigabe-Warteschlange: Der Kunde bekommt sein Ergebnis erst nach Freigabe. Freigegeben wird nur die Kundensicht (ohne Datei, Zeile, Prüfhinweis). Jede Freigabe, Zurückhaltung und Mail steht im Protokoll (wer, wann, Ergebnis-Code), ohne Kundeninhalt.
- ✅ Ergebnisseite des Kunden liest nur die freigegebene Kundensicht. Die Kunden-App darf daran nur die Bestätigung „Zugänge erneuert“ setzen, nichts sonst (per Test belegt). Bei akutem Fund steht die Bestätigung im Protokoll der Steuerzentrale.
- ✅ Sofortmeldung bei akutem Fund: Mail mit Priorität an Sebastian, ohne Einzelheiten und ohne Schlüssel. Der Kunde sieht bis zur Freigabe nichts.
- ◻ Sofortmeldung aufs Handy per Push (derzeit nur per Mail).

## 3. Orte der Verarbeitung

- ◻ Server in Deutschland (Hetzner). Bisher nur Entwicklungsumgebung, kein Kundencode.
- ✅ Entscheidung 09.11.2026: KI-Analyse nur in der EU, keine Abfragen in die USA. Die Bereiche 1 bis 5 der Engine laufen ohne KI.
- ◻ Lücken-Abgleich in Produktion über lokale Kopie der Datenbank auf dem EU-Server (nur in der Entwicklung per npm-Registry, USA).
- ◻ Auswahl der EU-KI-Einrichtung (Recherche liegt vor, Prüfung offen).
- ◻ Mail-Versand per SMTP über info@livedock.de bei All-inkl (Deutschland), Server w013d057.kasserver.com, Port 465 mit SSL, Zugangsdaten nur in den Server-Einstellungen. Eingebaut und getestet, noch nicht mit dem echten Postfach erprobt. Auftragsverarbeitungsvertrag klären, SPF/DKIM/DMARC einrichten.

## 4. Unterauftragsverarbeiter (geplant)

| Anbieter | Wofür | Stand |
|---|---|---|
| Hetzner | Server | geplant |
| All-inkl (E-Mail-Postfach) | Versand der Anmelde-Mails | geplant, AVV prüfen |
| EU-KI-Anbieter | KI-Auswertung | offen |

## 5. Offen für die Unterlagen

- ◻ Datenschutzerklärung (Platzhalter im Portal).
- ◻ Infoblatt für die IT des Kunden (vor dem Verbinden, als PDF).
- ◻ AVV-Vorlage, TOMs, Verarbeitungsverzeichnis aus diesem Dokument ableiten.
- ◻ Aufbewahrungsfristen für E-Mail-Adresse, Antworten und Ergebnis festlegen.
- ◻ Schrift selbst hosten (kein Abruf bei Google).
- ◻ Rechtliche Prüfung aller Unterlagen vor dem ersten echten Kunden.
