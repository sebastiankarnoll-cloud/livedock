# 01-sauber · erwartetes Ergebnis

**Gesamt:** 🟢 Gut aufgestellt (Ergebnis 1). Kein Fund. „Was noch fehlt“ (Betrieb, Unterlagen) wird getrennt ausgewiesen.

| Bereich | Erwartet | Hinweis |
|---|---|---|
| 1 Geheimnisse | 🟢, 0 Funde | `.env` ignoriert, nur `.env.example` ohne Werte |
| 2 Zugang und Rechte | 🟢, 0 Funde | Login in Middleware und in jeder Route, RLS mit Policies |
| 3 Daten und Datenschutz | 🟢, 0 Funde | Keine Personendaten an Dritte, Löschung über Kaskade |
| 4 KI-Anbindung | 🟢, 0 Funde | EU-Anbieter (Mistral), Eingabe geprüft, Limit, `maxTokens` |
| 5 Code und Bausteine | 🟢, 0 Funde | zod-Prüfung, keine unsicheren Muster |
| 6 Betrieb (getrennt) | fehlt | kein Server, keine Backups |
| 7 Unterlagen (getrennt) | fehlt | kein AVV, keine Rechtstexte |

**Positives (mindestens 2):** Login vorhanden und serverseitig geprüft · Zugriffsregeln in der Datenbank · KI-Anbieter in der EU · keine Schlüssel im Code.

**Fehlalarm = jeder Fund in 1 bis 5.** Ziel: 0.

**Offen:** Kein Lockfile im Projekt, deshalb kann osv-scanner nur nach Ergänzung eines `package-lock.json` sinnvoll prüfen (Versionen sind illustrativ).
