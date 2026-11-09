# 08-alte-bausteine · erwartetes Ergebnis

**Gesamt:** 🟡 Behebbar (Ergebnis 2). Kleines Node-Projekt ohne Login, Datenbank und KI. Einziges Problem: zwei veraltete Bausteine mit bekannten Sicherheitslücken. Dieses Projekt prüft Bereich 5 (Abgleich mit der Lücken-Datenbank); es braucht Netz, deshalb läuft der Test nur mit `npm run test:live`.

| Bereich | Erwartet | Hinweis |
|---|---|---|
| 1 Geheimnisse | 🟢, 0 Funde | |
| 2 Zugang und Rechte | offen | keine Schnittstellen, keine Datenbank: nichts zu prüfen |
| 3 Daten und Datenschutz | 🟢, 0 Funde | |
| 4 KI-Anbindung | 🟢, 0 Funde | keine KI-Anbindung |
| 5 Code und Bausteine | 🔴, 1 Fund (hoch) | `minimist` 1.2.0 (kritisch) und `lodash` 4.17.15 (hoch) haben bekannte Lücken. Beide Lücken sind alt und bleiben in der Datenbank, der Test ist deshalb stabil. Gruppiert zu einem Fund „Bausteine mit bekannter Sicherheitslücke“. |

**Lockfile:** `package-lock.json` liegt bei, die Versionen sind damit exakt (Konfidenz hoch, Bereich 5 darf voll prüfen).

**Hinweis:** Dieses Projekt löst auf GitHub Meldungen zu Sicherheitslücken in Bausteinen aus (Dependabot). Das ist gewollt, es ist ein Testprojekt.
