# 04-umbau-noetig · erwartetes Ergebnis

**Gesamt:** 🟡 Behebbar (Ergebnis 2) **mit Hinweis für Sebastian** (`reviewHint`). Die Engine setzt „Umbau nötig“ (3) nie selbst (Stand, Abschnitt 4: teuerste Fehlentscheidung). Ab 6 schweren Funden gibt sie nur den Hinweis „bitte auf möglichen Umbau prüfen“. Die Entscheidung trifft Sebastian.

Das Projekt ist bewusst ein Umbau-Kandidat: alles in einer Datei, kein Login, keine Rollen, Kundendaten ohne Zugriffsregeln.

| Bereich | Erwartet | Hinweis |
|---|---|---|
| 1 Geheimnisse | 🟢, 0 Funde | Keine Werte im Code, `.env` ignoriert |
| 2 Zugang und Rechte | 🔴, 3 Funde (hoch) | Schnittstelle ohne Login-Prüfung, Tabellen ohne Zugriffsregeln, Service-Key in offener Schnittstelle |
| 3 Daten und Datenschutz | 🔴, 1 Fund (hoch) | Namen, E-Mails, Telefonnummern gehen an OpenAI (USA) |
| 4 KI-Anbindung | 🟡 | Nutzereingabe ungefiltert im Prompt, kein Limit (je 1 Fund, mittel) |
| 5 Code und Bausteine | 🔴, 3 Funde (hoch) + 1 mittel | eval mit Nutzereingabe, Systembefehl mit eingesetztem Wert, SQL aus zusammengesetztem Text, Body ungeprüft |

**Messgrößen:** mindestens 6 schwere Funde, `reviewHint` = ja, Ergebnis ist **nicht** „Umbau nötig“, kein akuter Fund.
