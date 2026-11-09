# 03-zugriff-fehlt · erwartetes Ergebnis

**Gesamt:** 🟡 Behebbar (Ergebnis 2). Go-Live-Paket mit Festpreis. Kein Umbau-Auslöser: Die Struktur ist sauber, es fehlen Schutzschichten.

| Bereich | Erwartet | Hinweis |
|---|---|---|
| 1 Geheimnisse | 🟢, 0 Funde | Keine Werte im Code, `.env` ignoriert |
| 2 Zugang und Rechte | 🔴, 3 Funde (hoch) | (a) Schnittstellen ohne Login-Prüfung, (b) Tabellen ohne Zugriffsregeln, (c) Service-Key umgeht alle Regeln |
| 3 Daten und Datenschutz | 🟡 bis 🔴, 1 Fund | Namen, E-Mails, Notizen gehen an OpenAI (USA) |
| 4 KI-Anbindung | 🟡, 2 Funde | Nutzereingabe ungefiltert im Prompt, kein Limit (Kostenrisiko) |
| 5 Code und Bausteine | 🟡, 1 Fund | Eingaben ungeprüft (Body wird direkt in die Datenbank geschrieben) |
| 6 / 7 (getrennt) | fehlt | |

**Gruppierung:** Die drei Funde in Bereich 2 dürfen im Ergebnis zu **einem Fund „Zugriffsschutz fehlt“** zusammengefasst werden. Zählt nicht als Fehlalarm.

**Kein Umbau-Auslöser:** Login existiert zwar nicht in der Route, aber es gibt keinen Hinweis auf einen Neuaufbau, nur auf fehlende Prüfungen. Würde die Engine hier „Umbau nötig“ ausgeben, ist das ein Fehler (teuerste Fehlentscheidung laut Stand, Abschnitt 4).

**Ausgabe-Regeln:** Keine Datei und Zeile, keine Lösungshinweise, nur Kategorie, Auswirkung und grober Bereich („Datenbank“, „KI-Anbindung“).
