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

Stand: Stack-Erkennung und Bereich 1 (Geheimnisse) stehen (`engine/`, `npm test`, 23 Tests grün). Bereiche 2 bis 5 stehen noch auf „offen“.
Bereich 1 nutzt einen eingebauten Detektor (nur sichere Muster: Anbieter-Schlüssel, Passwörter in Datenbank-URLs, private Schlüssel, eingecheckte `.env`). gitleaks ließ sich in der Cloud-Umgebung nicht installieren (Netzwerk gesperrt); ein Adapter kann später hinter `scanSecrets()` eingehängt werden.
Kundensicht ist Standard (keine Datei/Zeile), `--intern` zeigt Belege nur für Sebastian.
Nächste Module: semgrep (2, 5), osv-scanner (5), Claude-Auswertung (2, 3, 4).
Testprojekte vor jedem Lauf mit `bash testprojekte/materialize.sh /tmp/livedock-fixtures` erzeugen.

## Offen: in der Cloud-Umgebung nicht prüfbar (nicht vergessen)
Gemessen am 09.11.2026: gitleaks nicht installierbar (GitHub und Go-Proxy gesperrt), semgrep.dev und api.osv.dev nicht erreichbar. pip und npm gehen.
- **gitleaks** fehlt als zweite Schicht für Bereich 1. Vor dem ersten echten Check lokal oder auf dem livedock-Server gegen alle Testprojekte laufen lassen und mit dem eingebauten Detektor vergleichen.
- **osv-scanner** (Bausteine mit bekannten Lücken, Bereich 5) ist hier gar nicht möglich. Bereich 5 darf ohne diesen Teil nie „grün“ zeigen, sondern höchstens „teilweise geprüft“. Testprojekte brauchen dafür Lockfiles.
- **semgrep** geht per pip, aber nur mit eigenen Regeln (Registry gesperrt). Das ist ok, wir brauchen eigene Regeln ohnehin.
- **Produktion:** Der Server, auf dem die Engine später läuft, braucht ausgehenden Zugriff auf die Vulnerability-Datenbank (osv.dev oder lokale Kopie) und die EU-KI-Schnittstelle. Das ist eine Anforderung an die Server-Einrichtung, keine Einschränkung des Produkts.
