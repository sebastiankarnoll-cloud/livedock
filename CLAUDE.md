# livedock. – Projektvorgaben für Claude Code

Quelle der Wahrheit für Angebot, Prozess, Ergebnisse und Regeln: `docs/livedock-stand.md` (Stand 07.11.2026). Bei Widerspruch gilt dieses Dokument, nicht deine Annahme. Bei Unklarheit fragen, nicht raten.

## Arbeitsweise
- Sprache im Code: Englisch (Bezeichner, Kommentare). Texte für Kunden und Sebastian: Deutsch, Du-Form, Geschäftssprache, „wir“.
- Erst Mockup/Konzept, dann Umsetzung. Nur bauen, was ausdrücklich beauftragt ist.
- Kurz und kopierbar antworten. Terminalbefehle verkettet.
- Kleine Schritte, jeder Schritt mit Test. Kein Schritt ohne Erfolgskriterium.

## Harte Regeln (nie brechen)
1. **Kundencode wird nur gelesen, nie ausgeführt.** Ausnahme ist allein die Sandbox (abgeschottet, ohne Netz, Platzhalter statt echter Schlüssel).
2. **Schlüssel und Passwörter nie im Klartext** speichern, loggen oder im Ergebnis zeigen. Immer maskieren (z. B. `sk-…ab12`).
3. **Nur sichere Funde ausgeben.** Lieber 3 sichere als 10 unsichere. Jeder Fund braucht Beleg und Konfidenz; unter Schwelle wird er verworfen.
4. **Schnellcheck gibt wenig preis:** Anzahl je Schweregrad, Kategorie, Auswirkung, grober Bereich, Positives. Keine Datei/Zeile, keine Lösung, keine Code-Ausschnitte. Einzige Ausnahme: echter Schlüssel (maskiert, „sofort erneuern“).
5. **Nichts geht ohne Sebastian nach außen** (Ergebnisse anfangs, Mails, Pull Requests, Live-Schaltung). Freigabe-Warteschlange.
6. **Kundentrennung:** Daten, Ablage und Jobs strikt je Fall getrennt. Kopie des Codes nach 30 Tagen automatisch löschen, mit Protokoll.
7. **KI-Analyse nur in der EU**, kein Training mit Kundencode.
8. Änderungen am Kundencode nie direkt, nur als Vorschlag (Pull Request) mit Tests.

## Struktur
- `engine/` Check-Engine (CLI zuerst: `livedock check ./repo`)
- `portal/` Kundenportal und Steuerzentrale (Next.js, Postgres)
- `testprojekte/` bewusst fehlerhafte Projekte zum Testen der Engine
- `docs/` Stand, Regelwerk, Vorlagen

## Stack
Next.js, Postgres, Claude Agent SDK, GitHub-App (nur lesen), Hetzner/Coolify-API, Cal.com, Lexware. Erste unterstützte Kundenstacks: Next.js/Node.

## Prüfbereiche (Ampel)
1 Geheimnisse · 2 Zugang und Rechte · 3 Daten und Datenschutz · 4 KI-Anbindung · 5 Code und Bausteine (Code-Ampel). 6 Betrieb · 7 Unterlagen stehen getrennt als „Was noch fehlt“ und fließen nicht in die Code-Ampel.

## Ergebnisse
1 Gut aufgestellt · 2 Behebbar · 3 Umbau nötig · 4 Akuter Fund · 5 Stack nicht unterstützt · 6 Nicht prüfbar · 7 Außerhalb des Angebots · 8 Zielumgebung passt nicht. Details und Maßnahmen: `docs/livedock-stand.md`, Abschnitt 4.

## Aktueller Schritt
Schritt 1: Check-Engine als CLI, ohne Portal und Datenbank. Erfolg: Auf allen Testprojekten stimmen die Funde, keine Fehlalarme.

Stand: Stack-Erkennung steht (`engine/`, `npm test`, 9 Tests grün). Alle 5 Code-Bereiche stehen noch auf „offen“. Nächste Module: gitleaks (Bereich 1), semgrep (2, 5), osv-scanner (5), Claude-Auswertung (2, 3, 4).
Testprojekte vor jedem Lauf mit `bash testprojekte/materialize.sh /tmp/livedock-fixtures` erzeugen.
