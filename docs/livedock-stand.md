# livedock. – Stand der Ausarbeitung

Stand: 07.11.2026 · Status: Konzept und Mockups, noch nichts gebaut · erste echte Anfrage über LinkedIn (05.11.)

---

## 1. Positionierung

**Kategorie:** Livegang-Begleitung für selbstgebaute Tools

**Kernsatz:**
> Für Fachbereiche, die mit KI ein eigenes Tool gebaut haben und es im Unternehmen einsetzen wollen. Wir sagen ehrlich, wie es dasteht, und bringen es sicher und freigabefähig in den Betrieb.

**Zielgruppe A (Fokus):** Fachbereiche in Unternehmen (Mittelstand, 20–500 Mitarbeitende, ohne eigenes Entwicklerteam), z. B. Vertrieb, HR, Weiterbildung, Operations.

- B (Gründer und Selbstständige mit Web-App, die echte Nutzer oder Umsatz hat): über das standardisierte Starter-Paket mit wenig persönlichem Aufwand. LinkedIn bleibt bei Fachbereichen.
- Abgrenzung: nur Web-Apps (keine App-Store-Apps), keine Hobby-Projekte
- C (Privatpersonen): ausgeschlossen
- **Zielumgebung:** Das Paket gilt nur für Betrieb im eigenen Hetzner-Konto des Kunden. Will die IT woanders betreiben (Firmen-Cloud), gibt es nur den „Check ohne Paket". Ein Angebot „Freigabefähig machen" wird erst nach 5–10 Gesprächen entschieden.

**Kernproblem des Kunden:** Nicht das Hochladen, sondern die Freigabe. IT fühlt sich nicht zuständig, der Datenschutz will Unterlagen, das Tool bleibt auf dem Laptop.

**Regel:** An dieser Positionierung wird festgehalten, bis 5–10 echte Gespräche etwas anderes zeigen.

**Ansprache:** „wir", nicht „ich". Du-Form. Geschäftssprache, keine Fachbegriffe ohne Erklärung.

---

## 2. Angebot und Preise

Alle Preise sind Platzhalter und werden nach den ersten 2–3 echten Checks festgelegt. Alle Preise zzgl. MwSt.

**Drei Pakete zum Start** (alles andere sind Zusatzoptionen auf der Buchungsseite):

| Baustein | Preis | Inhalt |
|---|---|---|
| **Schnellcheck** | kostenlos | Automatisch, ca. 5 Min. Reduziertes Ergebnis (siehe 4), „passt ins Paket: ja/nein", Festpreis. Kein Lösungsweg, keine Fundorte im Detail. |
| **Starter** (Gründer) | z. B. 590–790 € fix | Schlanke Korrekturen, Einrichtung auf eigenem Server, Checkliste Rechtstexte. Ohne AVV-Paket und Bericht. Kein Kickoff, Fragen nur über das Portal |
| **Go-Live-Paket** (Unternehmen) | z. B. 1.490 € fix | Vollständige Prüfung mit Bericht für die Geschäftsführung, konzeptionelle Einschätzung, **alle für einen sicheren Live-Gang nötigen Korrekturen** (als Änderungsvorschläge mit Vorschau), Einrichtung im eigenen Hetzner-Konto (DE) mit Backups und Monitoring, EU-KI-Anbindung, Datenschutz-Unterlagen (AVV, TOMs, Verarbeitungsverzeichnis, Nutzerhinweis), Testlink, Abnahme, Live-Schaltung, **digitale Übergabe**, 2 Nachprüfungen, 1 Korrekturschleife nach Test |
| **Check ohne Paket** | z. B. 590 € | Nur ausführlicher Bericht, z. B. für die eigene IT. Korrekturen als fertige Prompts, mit Nachprüfung (2 inklusive) |

Dazu kommt Hetzner direkt an Hetzner, ca. 5–20 €/Monat.

**Wahlleistungen** (jederzeit, nie sicherheitsrelevant):
- Betrieb ab 149 €/Monat (Updates, Backups, Monitoring, 1 Std. Anpassungen, monatlich kündbar). **Beim Buchen als Haken vorausgewählt**, kein eigenes Paket.
- Microsoft-Login/SSO (z. B. 390 €)
- Express in 5 Arbeitstagen (z. B. 290 €, nur mit Paket)
- Unterstützung bei der Datenschutz-Folgenabschätzung
- Schulung weiterer Nutzer
- Übergabe an die eigene IT
- Umsetzung konzeptioneller Hinweise (nach Aufwand)
- Weitere Nachprüfungen (z. B. 49 €)
- Einweisung per Video-Gespräch (z. B. 90 €, Platzhalter; in den ersten Fällen auf Anfrage kostenlos)

**Grundsätze**

- **Sicherheit ist nie eine Zusatzoption.** Sicherheitskorrekturen, Server, Backups, EU-KI und Datenschutz-Unterlagen stecken im Paket und sind nie einzeln buchbar.
- **Festpreis von Anfang an.** Der Kunde sieht ihn nach dem Schnellcheck, bevor er bucht.
- **Ausstiegsklausel:** Ergibt die vollständige Prüfung etwas grundlegend anderes als der Schnellcheck, kann der Kunde kostenlos zurücktreten.
- **Passt ein Tool nicht ins Paket** (grundlegender Umbau, kein Login/Rollen bei sensiblen Daten, Zielumgebung), gibt es ein eigenes Angebot bzw. den Check ohne Paket.
- **Konzeptionelle Hinweise** (Oberfläche, Aufbau) gehören nicht zum Festpreis. Sie werden mit fertigem Prompt oder als Extra-Angebot umgesetzt.
- **Keine Einzelkäufe pro Empfehlung.** Ein Angebot, eine Freigabe, eine Rechnung.
- **Vorschau ist Teil des Festpreises.**
- **Zahlung (Vorschlag):** 50 % bei Buchung, 50 % bei Abnahme.

---

## 3. Gesamtprozess (aus Kundensicht)

Dauer meist 2–4 Wochen. Aktive Zeit des Kunden etwa 2 Stunden.

### Phase 1 · Kennenlernen (kostenlos, ca. 15 Min.)

1. Kunde findet livedock (LinkedIn, Website, Empfehlung), klickt „Jetzt kostenlos checken"
2. **Einzige Registrierung:** nur E-Mail-Adresse, Zusagen bestätigen, Magic Link (kein Passwort, keine Firmendaten). Der Link führt zuerst auf eine Seite mit Button „Jetzt anmelden" (Schutz gegen Mailfilter).
3. Code verbinden: GitHub (nur Lesezugriff, ein Repository) oder ZIP-Upload. Option „macht bei uns jemand anderes".
4. **Fragen vor dem Start (Bildschirm 2a, überspringbar, ca. 1 Min.):** Wofür? Wer nutzt es? Wichtigste Aufgabe? **Wo soll das Tool laufen** (Hetzner / firmeneigene Umgebung / weiß ich nicht)? Stack-Erkennung läuft währenddessen im Hintergrund.
5. „Check starten", Terminal-Fortschritt (Bildschirm 2b). Tab schließen ist ok, Ergebnis kommt per Mail.
6. Ergebnisseite (siehe 4). Mail enthält nur den Link, weder Preis noch Funde.
7. Optional: Erstgespräch (20 Min.)

**Entscheidung:** Paket buchen, Angebot als PDF für den Einkauf, Gespräch, später oder Ende

**Nach dem Ergebnis:** Weg A bucht sofort · Weg B lädt PDF (häufigster Fall, Status „beim Einkauf", Erinnerung nach 3 Tagen, Mail-Vorlage für interne Argumentation) · Weg C bucht Gespräch (Akte vorbereitet) · Weg D tut nichts (eine Erinnerung nach 2 Tagen, Löschwarnung 2 Tage vor Ablauf, Löschung nach 30 Tagen).

### Phase 2 · Starten (ca. 1 Woche, meist Wartezeit auf Freigaben)

8. Buchungsseite: Paket, Zusatzoptionen mit mitlaufendem Preis, Firmen- und Rechnungsdaten
9. Interne Zustimmung: Fachbereich bestätigt per Klick „Einkauf hat zugestimmt" (mit Name und Datum)
10. Buchung bestätigen: Auftragsbestätigung, Rechnung 1 (50 %), Löschfrist des Codes entfällt
11. Beteiligte einladen (Datenschutz, IT, Einkauf, Geschäftsführung)
12. Parallel: **AVV** (Entwurf sofort sichtbar, Datenschutz unterschreibt selbst digital) · **Hetzner-Konto** (geführt, 10 Min., höchste Abbruchgefahr, Option „macht jemand anderes" mit Anleitung als PDF) · **Kickoff-Fragebogen** und Termin (30 Min.)

Die vollständige Prüfung kann nach Buchung und AVV starten, der Server kommt später.

### Phase 3 · Umsetzen (ca. 1–2 Wochen)

13. Sandbox: Tool mit Testdaten starten, Screenshots (Fallback: Video)
14. Bericht lesen (Bereiche „Muss vor dem Go-Live" und „Einschätzung", PDF für die Geschäftsführung). Entscheidung nur bei „nicht beheben" (Begründung mit Name und Datum).
15. Korrekturen als Änderungsvorschläge in einfachen Worten, **mit Vorschau** vor dem Klick auf „Übernehmen"
16. Server, Deployment, Backups, Monitoring, EU-KI (Checkliste im Portal)
17. Datenschutz-Unterlagen einsehbar (auch für den Datenschutz)

**Ausstieg:** Bei grundlegend anderem Ergebnis kostenlos zurücktreten

### Phase 4 · Live gehen (ca. 2–3 Tage)

18. Testlink auf dem Testserver, 1–2 Kollegen, Rückmeldeformular (1 Korrekturschleife inklusive)
19. Abnahme per Klick mit Checkliste (löst Rechnung 2 aus), Mitzeichnung durch andere Rollen möglich
20. Live-Schaltung zum Wunschzeitpunkt
21. **Digitale Einweisung** (statt persönlichem Termin): Übergabe-Seite aus den Falldaten, Erklärvideo (3–5 Min., einmal aufgenommen), Checkliste „Übergabe verstanden" mit Name und Datum, Rollenversion für die IT, Fragen schriftlich innerhalb eines Arbeitstags. PDF-Mappe als automatischer Download.

**Erfolg:** Tool läuft, Unterlagen liegen vor, der Fachbereich kann es intern freigeben lassen.

### Phase 5 · Danach

22. Betrieb bei livedock oder Übergabe an die eigene IT (Live-Schaltung ist in beiden Fällen enthalten, die Übergabe ersetzt nur den Betrieb)
23. Betrieb-Übersicht: Status, Backups, Updates, Stundenkonto, Wunsch-Formular mit Klick-Bestätigung
24. Störungen: Mail an den Kunden, bevor er es merkt. Monatsmail mit 2 Zeilen Status.
25. Nachfrage nach 30 Tagen, dann Referenz oder Empfehlung
26. Kündigung per Button: Zugriff entzogen, Code gelöscht, Löschprotokoll im Portal

### Rollen im Portal

Der Fachbereich ist Hauptnutzer und lädt per E-Mail (Magic Link) Einkauf, IT, Datenschutz und Geschäftsführung ein. Jede Rolle sieht nur ihren Ausschnitt:
- Einkauf: Angebot, Rechnungsdaten
- Datenschutz: AVV prüfen und unterschreiben, Unterlagen
- IT: Infoblatt, Zugriffsübersicht, Übergabe (technische Fassung)
- Geschäftsführung: Bericht als PDF, kein Login

Das Portal zeigt immer, **wer gerade blockiert**, und erinnert nach 3 Tagen freundlich.

---

## 4. Schnellcheck und Ergebnis

Der Schnellcheck ist der wichtigste Moment. Hier entscheidet sich, ob jemand Code und Geld gibt.

**Vor dem Verbinden**
- Beispielergebnis zeigen („So sieht dein Ergebnis aus")
- Zusagen: nur Lesezugriff auf ein Repository, Code wird nur gelesen, nicht ausgeführt, keine Nutzerdaten, KI-Analyse in der EU ohne Training, Kopie nach 30 Tagen gelöscht, Zugriff jederzeit entziehbar
- Alternative ohne App-Verbindung: ZIP (Hinweis: ohne `.env`, `node_modules`)
- Infoblatt für die IT als PDF

**Ergebnis gibt wenig preis**, damit es nicht zum Selbstkorrigieren reicht:
- Zeigen: Anzahl je Schweregrad, Kategorie und Auswirkung, **grober Bereich** (z. B. „Login", „Datenbank", „KI-Anbindung"), Positives, Passung, Festpreis
- Nicht zeigen: Datei und Zeile, Lösungen, Code-Ausschnitte, die vollständige Liste kleiner Funde
- **Ausnahme:** Ein echter Schlüssel im Code wird immer klar benannt (maskiert) mit „sofort erneuern"
- Ergebnis ist ein Schnappschuss, erneute Checks erst nach Buchung oder gegen Gebühr

**Aufbau der Ergebnisseite:** 1 Einordnung (Ampel plus ein Satz, kein Alarmton) · 2 Funde · 3 Positives · 4 Was für den Live-Gang fehlt · 5 Passung · 6 Festpreis (Zusatzoptionen erst beim Buchen) · 7 Buttons: „Paket buchen", „20 Min. Gespräch", „Angebot als PDF" · 8 Mensch dahinter (Foto, Name)

**Grundsatz:** Lieber 3 sichere Funde als 10 unsichere. Im Schnellcheck erscheinen nur Funde mit hoher Sicherheit.

**Ampel nach 7 Prüfbereichen**

| # | Bereich | Frage |
|---|---|---|
| 1 | Geheimnisse | Schlüssel oder Passwörter im Code? |
| 2 | Zugang und Rechte | Login, Rollen, serverseitige Prüfung, offene Datenbank? |
| 3 | Daten und Datenschutz | Wohin fließen personenbezogene Daten, Löschfunktion? |
| 4 | KI-Anbindung | EU-Region, Eingabeprüfung, Limits? |
| 5 | Code und Bausteine | Veraltet, angreifbar, Eingaben ungeprüft? |
| 6 | Betrieb | Server in DE, Backups, Monitoring, Zertifikat? |
| 7 | Unterlagen | AVV, TOMs, Verzeichnis, Rechtstexte? |

Bereiche 1–5 bilden die Code-Ampel. **Bereiche 6 und 7 stehen getrennt als „Was noch fehlt"**, weil sie bei fast jedem Tool rot sind. Konzeptionelle Bewertung gibt es erst in der vollständigen Prüfung.

**Mögliche Ergebnisse und Maßnahme**

| # | Ergebnis | Maßnahme |
|---|---|---|
| 1 | 🟢 Gut aufgestellt | Starter (Gründer) oder Go-Live (Firma), ehrliche Begründung (Server, Unterlagen fehlen) |
| 2 | 🟡 Behebbar (Normalfall) | Go-Live-Paket zum Festpreis |
| 3 | 🔴 Umbau nötig (z. B. kein Login/Rollen bei sensiblen Daten, alles in einer Datei) | Kein Festpreis, Gespräch, eigenes Angebot. Schwelle vorsichtig setzen, im Zweifel zu 2 plus Prüfung durch Sebastian. |
| 4 | 🚨 Akuter Fund (Schlüssel, offene Datenbank) | Banner über allem, sofort handeln, Sofortmeldung an Sebastian, Schlüssel nie im Klartext speichern |
| 5 | ⚙️ Stack nicht unterstützt (anfangs nur Next.js/Node) | Meldung direkt nach dem Verbinden, Anfrage bei Sebastian, Warteliste |
| 6 | ❓ Nicht prüfbar (leer, riesig, Abbruch) | „Wir melden uns persönlich", Warnung an Sebastian |
| 7 | ⛔ Außerhalb des Angebots (App-Store, Hobby, Privat) | Freundliche Absage, Code sofort löschen |
| 8 | ⚙️ Zielumgebung passt nicht (firmeneigene Umgebung) | Check ohne Paket oder Gespräch, Meldung als möglicher Großkunde |

**Paketregel:** Stack unterstützt? Zielgruppe (Mail-Domain, Antworten)? Anzahl und Schwere sicherer Funde? Schalter „grundlegender Umbau"? Zielumgebung? Festpreis regelbasiert, Zuschläge nur durch vom Kunden gewählte Zusatzoptionen.

**Freigabe:** Die ersten 5–10 Checks laufen mit Freigabe durch Sebastian (Ergebnis in „ca. 1 Std."), danach automatisch.

---

## 5. Konzeptionelle Bewertung

**Voraussetzungen**

1. **Zweck kennen:** über die Kontextfragen
2. **Anwendung sehen**
   - Standard: Tool aus dem Code in einer abgeschotteten Umgebung (Sandbox) starten. KI-Aufrufe durch Platzhalter-Antworten ersetzen, Schlüssel durch Testwerte, Datenbank mit Beispieldaten befüllen. Automatische Screenshots der wichtigsten Seiten.
   - Fallback: Kunde lädt ein Video hoch (2–3 Min., drei wichtigste Abläufe, mit Testdaten) oder zeigt es im Bildschirm-Teilen. Ist ein Tool nicht startbar, sagen wir das ehrlich.
   - **Kein Tunnel** auf den lokalen Rechner des Kunden.
3. **Feste Kriterien**
   - Fokus: Ist die Hauptaufgabe sofort erkennbar? Gibt es überflüssige Funktionen?
   - Oberfläche: Rangfolge, Texte, Fehlermeldungen, leere Zustände
   - Aufbau: unnötige Komplexität, doppelte Logik, Wartbarkeit
   - Betrieb: Rollen und Rechte

**Form:** Jeder Punkt mit Beleg (Screenshot) und konkretem Vorschlag.

**Im Bericht** gibt es zwei Bereiche: **Muss vor dem Go-Live** (im Paket) und **Einschätzung** (optional).

Die KI schlägt vor, Sebastian entscheidet. Im Schnellcheck erscheint höchstens ein Satz dazu.

**Vorschau (Teil des Festpreises):** Stufe 1 in Phase 3 je Änderungsvorschlag (Sandbox, nur Beispieldaten, Zugang per Portal-Login, wird nach Übernahme/Ablehnung abgebaut). Stufe 2 in Phase 4 als Testlink auf dem Testserver. Nicht im Schnellcheck.

---

## 6. Umsetzung und Zugriff

| Situation | Vorgehen |
|---|---|
| **Standard im Paket** | Kunde erweitert den GitHub-Zugriff auf „Änderungen vorschlagen". livedock ändert nie direkt, jede Korrektur kommt als Pull Request. Der Kunde sieht ihn im Portal in einfachen Worten, mit Vorschau, und übernimmt mit einem Klick. |
| **Code nur lokal** | livedock richtet im Go-Live ein eigenes Repository ein |
| **Firma erlaubt keinen Schreibzugriff** | Änderungen als Paket für die IT, Klärung im Kickoff, Bedingung im Angebot |
| **Nur Check, kein Paket** | Fertige Prompts für das KI-Tool des Kunden, Nachprüfung (2 inklusive, danach z. B. 49 € je Nachprüfung) |

Server-Zugriff besteht ohnehin über das Hetzner-Konto des Kunden, eingeschränkt und jederzeit entziehbar.

---

## 7. Kundenportal

**Prinzip:** Immer nur ein nächster Schritt, klar benannt. Jeder Bildschirm hat: Fortschritt (schritt x von 5), Wer ist dran? (Violett = „deine aufgabe", Grün = „wir sind dran"), eine klare Überschrift, Warum der Schritt nötig ist, nummerierte Schritte, einen Hauptbutton, Was danach passiert.

**Bildschirme**

| Schritt | Bildschirm | Stand |
|---|---|---|
| 1 Prüfen | Code verbinden | Mockup |
| | 2a Fragen (neu, getrennt) | zu erstellen |
| | 2b Schnellcheck läuft | Mockup (anpassen) |
| | Ergebnis Schnellcheck (4 Vorlagen: Festpreis, kein Festpreis, persönlich melden, Absage) | Mockup (anpassen) |
| 2 Starten | Paket buchen | Mockup |
| | AVV und Rechnungsdaten, Einladungen | fehlt |
| | Hetzner-Konto einrichten | fehlt |
| | Kickoff-Fragebogen und Termin | fehlt |
| 3 Umsetzen | Video hochladen (Fallback) | Mockup |
| | Bericht lesen | Mockup |
| | Korrektur im Detail, plus Vorschau | Mockup (Vorschau ergänzen) |
| | Datenschutz-Unterlagen | fehlt |
| 4 Live gehen | Testlink mit Kollegen | fehlt |
| | Abnahme | fehlt |
| | Übergabe (digitale Einweisung) | fehlt |
| 5 Danach | Betrieb-Übersicht, Betrieb buchen/Übergabe an IT | fehlt |
| Immer | Dokumente und Rechnungen, Fragen an uns, Beteiligte einladen | fehlt |

**Weitere fehlende Seiten:** Starter-Pfad (kürzere Strecke), Zwischenseite „eigenes Angebot", Seite „Zurücktreten", Rollensichten für Einkauf, IT, Datenschutz.

---

## 8. Website

**Konzept:** Interaktive Terminal-Session im Stil von Claude Code.

- **Startbereich:** ASCII-Banner, Kernaussage invers, ein Satz, Hauptbutton **„Jetzt kostenlos checken"**, zweiter Button „Erst Fragen stellen", darunter „kostenlos · ergebnis in 5 minuten · nur lesezugriff"
- **Fragenbereich:** Vorgeschlagene Fragen, eigene Eingabe möglich (Freitext wird zugeordnet), Antworten erscheinen Wort für Wort. Die nächste Frage ist jeweils vorausgewählt.
  - Was macht ihr genau?
  - Wie funktioniert der kostenlose Check?
  - Warum kann ich es nicht einfach selbst hochladen?
  - Wie läuft das ab? (erklärt das Portal)
  - Wo landen meine Daten?
  - Was habe ich am Ende in der Hand?
  - Was kostet das?
  - Lass uns sprechen (Erstgespräch nur noch als zweite Option)
- **Überblick:** `livedock --help` mit allem auf einen Blick
- **Scrollverhalten:** Vom Startbereich springt die Seite immer direkt zum Fragenbereich bzw. zur ersten Antwort.

**Offen:** Ziel des Buttons „Code verbinden" (Portal-URL), Preise [x] und [y], Impressum und Datenschutz

---

## 9. Corporate Identity

**Name:** livedock. (klein geschrieben, Punkt in Akzentgrün)

**Leitidee:** Dunkles Terminal, wirkt wie ein Entwicklerwerkzeug, fällt auf LinkedIn auf, kein typischer Agentur-Look

**Schrift:** JetBrains Mono, durchgehend, Gewichte 400 und 700. Eine Schriftgröße pro Terminal-Logik.

**Farben**

| Token | Wert | Verwendung |
|---|---|---|
| `--bg` | `#121416` | Hintergrund |
| `--chrome` | `#1C1F22` | Fensterleiste, Kästen |
| `--userbar` | `#24282C` | Nutzereingabe, Trennlinien |
| `--line` | `#353B40` | Rahmen |
| `--fg` | `#E8EAEB` | Text |
| `--soft` | `#C3C8CB` | Fließtext zweitrangig |
| `--dim` | `#8E979C` | Hinweise |
| `--mute` | `#6C757A` | sehr zurückhaltend |
| `--accent` | `#5AF78E` | Grün: livedock liefert, erledigt, gut |
| `--cyan` | `#57C7FF` | Befehle, Dateipfade |
| `--you` | `#C3A6FF` | Violett: du bist dran, Hauptbuttons im Portal |
| `--warn` | `#F3D36B` | mittel, ausstehend |
| `--err` | `#FF6E6E` | dringend |

**Farblogik:** Grün = wir liefern. Violett = du bist dran. Cyan = Befehl oder Code. Gelb/Rot = Schweregrad.

**Stilmittel:** Terminal-Elemente (●, ⎿, ✓, ☐/☒, Spinner ⠋), Kleinschreibung für Systemzeilen, gestrichelte Linien für Hinweise und Fußzeilen

---

## 10. Datenschutz und Recht

- **Rollen:** Kunde = Verantwortlicher, livedock = Auftragsverarbeiter (Art. 28 DSGVO), Hetzner = Unterauftragsverarbeiter
- **Unterlagen:** AVV-Vorlage, TOMs, Verarbeitungsverzeichnis
- **Prüfung:** nur Code, keine echten Daten
- **KI-Dienste:** Datenflüsse in die USA sind oft der kritische Punkt. Empfehlung: EU-Regionen oder europäische Anbieter.
- **Eigene KI:** EU-Betrieb (z. B. Claude über eine EU-Cloud-Region oder Mistral), AVV, kein Training mit Kundencode
- **Eigene Sicherheit:** Kunden strikt getrennt, Geheimnisse verschlüsselt, Zugriffsprotokoll. livedock muss sauberer sein als seine Kunden.
- **Haftung:** Bewertung als konzeptionelle Einschätzung, Verantwortung für den Einsatz beim Kunden. Im Paket stammen die Korrekturen von livedock, deshalb kein Prompt-Weg im Paket.
- **Marke:** keine aktive DE/EU-Marke „livedock" gefunden (EU-Marke von 2011 abgelaufen). In den USA gibt es Anmeldungen von RoadSync (Klassen 9/42, Logistik-Zahlungssoftware). Empfehlung: eigene DPMA-Anmeldung (Klassen 42, 35). Keine Rechtsberatung, vor Anmeldung prüfen lassen.

---

## 11. Technik und Automatisierung

**Gliederung (nach Skizze vom 07.11.)**

| Block | Inhalt |
|---|---|
| **1. Grundlagen** (unsichtbar) | Login und Rollen, Kundentrennung, eine Datenbank für Portal und Steuerzentrale, Job-Warteschlange mit Live-Fortschritt, verschlüsselte Ablage mit Löschjobs und Zugriffsprotokoll, GitHub-App, Hetzner-Anbindung, Mail, digitale Unterschrift, Freigabe-Warteschlange |
| **2. Kundenportal** | Kundensicht, livedock-Sicht (Steuerzentrale: Briefing, Freigaben, Prüfansichten, Meldungen, Erinnerungen) |
| **3. KI-Tools** | Check-Engine → Sandbox → Tiefencheck-Engine → Agents: Korrektur, Server, Dokumente, Betrieb, Kommunikation, Büro (Lexware, Cal.com, Zahlungsstatus), Koordinator (tägliches Briefing) |
| **4. Inhalte** | Dokumentvorlagen (AVV, TOMs, Verzeichnis, Nutzerhinweis), Regelwerk (Ampel, Paketzuordnung, Zielumgebung), Texte für Ergebnisseiten und Mails, Erklärvideos/Tutorials |
| **5. Website** | Terminal-Fragen, Start des Checks |

**Abhängigkeiten (= Baureihenfolge der Tools):** Sandbox braucht die Check-Engine (Stack-Erkennung), der Tiefencheck die Sandbox (Screenshots), die Agents den Tiefencheck (Funde).

**Check-Tool (MVP):**
- CLI `livedock check ./repo`
- Stack-Erkennung, gitleaks, osv-scanner, semgrep, Erkennung von KI-Diensten
- Claude (EU) für Datenflüsse, Login und konzeptionelle Einschätzung
- Code wird nur gelesen, nicht ausgeführt
- Sonderfälle: echter Schlüssel (nie im Klartext), nicht unterstützter Stack, Abbruch, Zugriff entzogen (sofort löschen)
- Bericht: Ampel, Aufbau, Datenflüsse inkl. KI, Risiken, Einschätzung, To-dos, was für den Go-Live fehlt

**Menschliche Prüfung:** Check-Ergebnis (anfangs jedes), Bericht, Pull Requests, Live-Schaltung, Updates, alles Ausgehende. Dokumente anfangs alle, später Stichprobe.

**Stack:** Next.js, Postgres, Claude Agent SDK, GitHub-App, Hetzner/Coolify-API, Cal.com, Lexware

**Reihenfolge nach Wirkung**
1. Fundament + Portal Bildschirme 1–3 + Check-Engine (damit läuft die LinkedIn-Strecke)
2. Sandbox
3. Buchung, Dokumenten-Agent, Büro-Agent
4. Tiefenprüfung, Korrektur-Agent, Server-Agent
5. Betrieb und Kommunikation

Anfangs laufen 3–5 halbmanuell mit Skripten per Claude Code. Automatisieren, was sich nach 2–3 Kunden wiederholt.

---

## 12. Offene Entscheidungen

- [ ] Preise: Go-Live-Paket, Starter, Betrieb, Zusatzoptionen, Video-Einweisung (nach 2–3 echten Checks)
- [ ] Zahlung: Vorschlag 50 % bei Buchung, 50 % bei Abnahme
- [ ] Schnellcheck-Ergebnis: erste 5–10 mit Freigabe, danach automatisch (Vorschlag, noch nicht bestätigt)
- [ ] Fundorte im Ergebnis: grob zeigen („Bereich Login") oder ganz weglassen (Vorschlag: grob)
- [ ] Login und Rollen: ab welchem Umfang kippt es in ein eigenes Angebot?
- [ ] Testrunden: eine Korrekturschleife inklusive (Vorschlag)
- [ ] Betrieb: Reaktionszeit 1 Arbeitstag? Störungen über denselben Button wie Wünsche?
- [ ] Starter-Pfad für Gründer: eigener Pfad oder gleiches Portal mit weniger Schritten? Betrieb dort ab 149 € oder günstigerer Tarif?
- [ ] Angebot „Freigabefähig machen" (Zielumgebung woanders): nach 5–10 Gesprächen
- [ ] Konzern-Variante (SSO, DSFA, Schulung, IT-Übergabe gebündelt): nach den ersten Gesprächen
- [ ] Check-Tool: unterstützte Stacks (Vorschlag: Next.js/Node zuerst), Berichtsformat (PDF, Portal, beides), Testprojekt (eigenes Projekt, NEXUS nur mit Erlaubnis)
- [ ] Löschfrist und „kein Training" technisch sicherstellen (steht bereits auf Website und Portal)
- [ ] Fehlende Portal-Bildschirme (siehe 7)
- [ ] Domain sichern, Marke anmelden

---

## 13. Arbeitsstände (Artefakte)

- **Website (Version „Kurz", aktuell):** https://claude.ai/artifact/4SFrqD6NbBSncQSZMHtNq5 · Kernaussage pro Antwort, ein erklärender Satz, Schlagworte, fester Button „kostenlos checken"
- **Website (Version „Dunkel", ausführlicher):** https://claude.ai/artifact/XJEoRcoc9uZtvXpjN2LF4r
- **CI-Leitfaden:** https://claude.ai/artifact/Xrt2FNRKGtBYevQLaMHDDY
- **Kundenportal (Mockups):** https://claude.ai/artifact/AqBZvCbyZBwbwMVkDp2w5Z
- Verworfen: Varianten Petrol, Papier, Mix, Hell sowie das erste Website-Mockup
