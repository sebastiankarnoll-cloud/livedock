# 02-schluessel-offen · erwartetes Ergebnis

**Gesamt:** 🚨 Akuter Fund (Ergebnis 4), darunter normal weiter nach Ergebnis 2 oder 1. Sofortmeldung an Sebastian.

| Bereich | Erwartet | Hinweis |
|---|---|---|
| 1 Geheimnisse | 🔴, 2 Funde | (a) KI-Schlüssel fest im Code, (b) `.env` mit Datenbank-Zugang im Repository |
| 2 Zugang und Rechte | 🟢, 0 Funde | Login in der Route, RLS mit Policy |
| 3 Daten und Datenschutz | 🟡 oder 🟢 | Nur Kurstitel gehen an den KI-Dienst (OpenAI, USA): höchstens 1 Fund „Drittland-Dienst“, Konfidenz prüfen |
| 4 KI-Anbindung | 🟡, 1 Fund | OpenAI ohne EU-Region, kein Limit pro Nutzer |
| 5 Code und Bausteine | 🟢, 0 Funde | |
| 6 / 7 (getrennt) | fehlt | |

**Ausgabe-Regeln, die hier geprüft werden:**
- Der Schlüssel erscheint **nur maskiert** (`sk-…5678`), nirgends im Klartext (weder Ergebnis noch Log noch Zwischendatei).
- Die Datenbank-URL erscheint ohne Passwort.
- Im Schnellcheck-Ergebnis stehen weder Dateiname noch Zeile (Ausnahme: der Hinweis „Schlüssel im Code, sofort erneuern“ mit grobem Bereich).

**Hinweis:** Die Schlüssel sind Fälschungen im Format echter Schlüssel. Der KI-Schlüssel steht im Repository nur als Platzhalter und wird durch `testprojekte/materialize.sh` eingesetzt. Ob gitleaks ihn erkennt, wird beim ersten Lauf bestätigt, sonst Format anpassen.
