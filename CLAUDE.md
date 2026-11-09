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

Stand: Stack-Erkennung, Bereiche 1 bis 5 und die Ergebnis-Regel stehen (`engine/`, `npm test`, 75 Tests grün, plus `npm run test:live` (3 Tests mit Netz), Engine 0.5.0). Auf den Testprojekten 01 bis 03 stimmen alle Funde und das Gesamtergebnis (1, 4 mit Basis 2, 2), keine Fehlalarme.
Alle Bereiche nutzen eigene, vorsichtige Regeln (nur sichere Funde, Konfidenz mindestens 0,8):
- Bereich 2 (`access.ts`): Schnittstelle ohne Login-Prüfung, Tabelle ohne Zugriffsregeln (RLS, nur Supabase), Service-Key in offener Schnittstelle oder als NEXT_PUBLIC-Variable. Nichts Prüfbares gefunden = „offen“, nie grün. Nicht abgedeckt: Login nur im Browser, Rollen/Mandanten innerhalb eines Logins.
- Bereich 3 (`data.ts`): Personenfelder (E-Mail, Telefon, Adresse, IBAN, Geburtsdatum, Vor-/Nachname) an KI-Dienst außerhalb der EU, E-Mail/Passwort im Log, Tracking ohne erkennbare Einwilligung. Nicht abgedeckt: Löschkonzept, Auftragsverarbeitung, Datenflüsse über Dritt-Bibliotheken.
- Bereich 4 (`ai.ts`): Nutzereingabe ungeprüft im Prompt, kein Limit pro Nutzer, KI-Dienst standardmäßig außerhalb der EU (nur wenn nicht schon in Bereich 3), KI-Schlüssel als NEXT_PUBLIC-Variable. Nicht abgedeckt: Antwortlänge (maxTokens), Ausgabe-Filter, Kostenobergrenzen beim Anbieter.
- Bereich 5 (`code.ts`): Body ungeprüft in die Datenbank, eval, Systembefehl und SQL aus zusammengesetztem Text, ungeprüftes HTML, abgeschaltete Zertifikatsprüfung. Dazu der Abgleich mit bekannten Lücken über `npm audit` (`deps.ts`): nur die Dateien package.json und package-lock.json werden in einen leeren Temp-Ordner kopiert, npm läuft dort mit `--ignore-scripts --package-lock-only`, nur Namen und Versionen gehen an registry.npmjs.org. **Grün nur mit Lockfile und erfolgreichem Abgleich.** Ohne Lockfile (Versionen geschätzt, Konfidenz 0,6, Funde werden verworfen), ohne Netz oder bei Fehler: höchstens „teilweise geprüft“. Nur Produktions-Bausteine (`--omit=dev`).
Ergebnis-Regel (`check.ts`): akuter Fund = 4 (mit `basis` darunter), sonst Funde = 2, keine Funde und Bereiche 1 bis 4 grün = 1, sonst kein Urteil (`null`). **„3 Umbau nötig“ setzt die Engine nie selbst**, ab 6 schweren Funden gibt sie nur `reviewHint` für Sebastian aus. Zusätzlich liefert sie `positives` (nur, was die Scans bestätigt haben).
Bereich 1 nutzt einen eingebauten Detektor (nur sichere Muster: Anbieter-Schlüssel, Passwörter in Datenbank-URLs, private Schlüssel, eingecheckte `.env`). gitleaks ließ sich in der Cloud-Umgebung nicht installieren (Netzwerk gesperrt); ein Adapter kann später hinter `scanSecrets()` eingehängt werden.
Kundensicht ist Standard (keine Datei/Zeile), `--intern` zeigt Belege nur für Sebastian.
Nächste Module: gitleaks-Vergleich (1, auf Sebastians Rechner/Server), Claude-Auswertung (2, 3, 4) für Fälle, die Regeln nicht sicher entscheiden.
Testprojekte vor jedem Lauf mit `bash testprojekte/materialize.sh /tmp/livedock-fixtures` erzeugen.

## Offen: in der Cloud-Umgebung nicht prüfbar (nicht vergessen)
Gemessen am 09.11.2026: gitleaks nicht installierbar (GitHub und Go-Proxy gesperrt), semgrep.dev und api.osv.dev nicht erreichbar. pip und npm gehen.
- **gitleaks** fehlt als zweite Schicht für Bereich 1. Vor dem ersten echten Check lokal oder auf dem livedock-Server gegen alle Testprojekte laufen lassen und mit dem eingebauten Detektor vergleichen.
- **Bausteine mit bekannten Lücken (Bereich 5)** laufen jetzt über `npm audit` und gehen in dieser Umgebung (npm-Registry erreichbar). osv-scanner (andere Datenquelle, mehr Stacks) bleibt hier nicht möglich und ist erst für weitere Stacks nötig. Offen: (a) **Entschieden (Sebastian, 09.11.2026): livedock läuft in Deutschland (Hetzner), KI nur EU, keine Abfragen in die USA.** Die Abfrage bei npm (USA) gilt nur für die Entwicklung mit Testprojekten. In Produktion muss der Abgleich über eine lokale Kopie der Lücken-Datenbank auf dem EU-Server laufen (täglich aktualisiert), damit keine Baustein-Namen von Kunden die EU verlassen. Echter Kundencode wird nie in dieser Cloud-Entwicklungsumgebung geprüft. Noch zu klären: welche EU-Einrichtung für die KI-Auswertung. Recherche 09.11.2026: Laut Anthropic (claude.com/regional-compliance) gibt es regionale Endpunkte in Europa über AWS Bedrock und Google Vertex, Azure „coming soon“; die direkte Anthropic-API hat dort keinen EU-only-Endpunkt. Drittquellen widersprechen sich, vor dem Bau Modellverfügbarkeit je Region direkt bei AWS/Google prüfen. Hinweis: AWS und Google sind US-Firmen (CLOUD Act), Mistral ist französisch. Empfehlung vorbehaltlich Prüfung: Claude über AWS Bedrock Frankfurt, Mistral als Alternative. Nicht eilig: Bereiche 1 bis 5 laufen ohne KI. (b) Schwelle prüfen: ohne Filter melden auch „sauber“ gebaute Projekte Lücken ohne verfügbaren Fix (gemessen: zod, postcss in Next.js). Erst nach Probelauf mit echtem Projekt entscheiden. (c) Testprojekte 01 bis 03 haben bewusst keine Lockfile; nur 08 prüft den Abgleich live.
- **semgrep** geht per pip, aber nur mit eigenen Regeln (Registry gesperrt). Das ist ok, wir brauchen eigene Regeln ohnehin.
- **Produktion:** Der Server, auf dem die Engine später läuft, steht in Deutschland (Hetzner) und braucht Zugriff auf die Quelle der lokalen Lücken-Datenbank (nur zum Aktualisieren, ohne Kundendaten) und die EU-KI-Schnittstelle und die EU-KI-Schnittstelle. Das ist eine Anforderung an die Server-Einrichtung, keine Einschränkung des Produkts.
