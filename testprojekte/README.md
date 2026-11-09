# Testprojekte für die Check-Engine

Zweck: Die Engine muss auf bekannten Fällen genau die erwarteten Funde liefern, nicht mehr und nicht weniger. Jedes Projekt hat eine `EXPECTED.md` mit den erwarteten Funden je Prüfbereich und dem erwarteten Gesamtergebnis.

| # | Projekt | Inhalt | Erwartetes Ergebnis |
|---|---|---|---|
| 01 | `sauber` | Next.js, Supabase mit Zugriffsregeln, Login, EU-KI, keine Schlüssel, aktuelle Bausteine | 🟢 Gut aufgestellt (kein Fund, Positives; Betrieb/Unterlagen fehlen) |
| 02 | `schluessel-offen` | Echter-aussehender Test-Schlüssel im Code und `.env` im Repo, sonst ok | 🚨 Akuter Fund (maskiert), Rest 🟡/🟢 |
| 03 | `zugriff-fehlt` | Daten ohne Zugriffsregeln, Schnittstellen ohne Login-Prüfung, KI-Eingaben ungefiltert, US-KI-Dienst | 🟡 Behebbar (1 hoch, mehrere mittel) |
| 04 | `umbau-noetig` | Kein Login, keine Rollen, Kundendaten, alles in einer Datei | 🔴 Umbau nötig |
| 05 | `elistio` (Sebastians eigenes Projekt, nur Kopie, kein Kundencode) | realer Fall | offen, manuell bewerten |
| 06 | `stack-fremd` | Python/Django | ⚙️ Stack nicht unterstützt |
| 07 | `leer` | leeres Repo | ❓ Nicht prüfbar |
| 08 | `alte-bausteine` | Zwei veraltete Bausteine mit Lockfile, sonst leer. Prüft den Lücken-Abgleich (braucht Netz: `npm run test:live` in `engine/`) | 🟡 Behebbar, Bereich 5 rot |

## Regeln für Testprojekte
- Alle Schlüssel sind **Fälschungen** im Format echter Schlüssel (z. B. `sk-TESTONLY…`), nie echte.
- Keine echten Personendaten.
- Jedes Projekt ist klein (unter 30 Dateien), damit Läufe schnell und billig bleiben.
- Änderungen an `EXPECTED.md` nur bewusst und mit Begründung im Commit.

## Vor jedem Testlauf
Der gefälschte Schlüssel in 02 liegt nicht im Repository (GitHub Push Protection blockiert ihn). Er wird eingesetzt durch:

`bash testprojekte/materialize.sh /tmp/livedock-fixtures`

Die Engine läuft immer gegen den Ausgabeordner, nie gegen `testprojekte/` selbst.

## Messgrößen
- **Trefferquote:** erwartete Funde, die gefunden werden
- **Fehlalarme:** Funde, die nicht erwartet waren. Ziel: 0 im Ergebnis, das der Kunde sieht.
- **Stabilität:** gleiches Projekt dreimal prüfen, gleiches Ergebnis
