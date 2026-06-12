# WM 2026 Data API (football-data.org, in-memory Cache)

Kleiner Proxy/Cache-Server fuer WM-2026-Daten von football-data.org
(Competition-Code `WC`, v4 API). Die GitHub-Pages-App fragt nur diesen
Server ab; der Auth-Token bleibt geheim auf dem Server.

Diese Version braucht **kein Volume**. Der Cache liegt im Arbeitsspeicher
und wird bei jedem Start sofort neu von football-data.org geladen
(danach alle 5 Minuten). Bei einem Redeploy gibt es dadurch fuer ein
paar Sekunden leere Daten, das ist fuer diesen Anwendungsfall unkritisch.

## Endpoints

- `GET /api/data` -> liefert `{ standings, matches, updatedAt, error }`
  - `standings`: Array, ein Eintrag pro Gruppe (`group`, `table` mit
    Position, Team, Spiele, Punkten, Tordifferenz etc.)
  - `matches`: Array mit allen WM-Spielen (Gruppenphase + K.o.-Runden),
    inkl. `stage`, `group`, `status`, `score`, `utcDate`
- `POST /api/refresh` -> erzwingt sofortiges Neuladen (zum Testen)

## Setup auf Railway (als zusaetzlicher Service in bestehendem Projekt)

1. Account auf https://www.football-data.org/client/register erstellen
   (kostenlos, kein Kreditkartenbedarf). Token kommt per E-Mail.
   Falls ein Token bereits oeffentlich geteilt wurde: im Account-Bereich
   regenerieren!
2. Im bestehenden Railway-Projekt: "+ New" -> "GitHub Repo" -> dieses
   Repo auswaehlen. Railway erkennt Node automatisch (package.json).
3. **Umgebungsvariable setzen** (Service -> "Variables"):
   - `FOOTBALL_DATA_TOKEN` = dein Token
4. **Domain generieren** (Service -> "Settings" -> "Networking" ->
   "Generate Domain")
5. Diese URL in `index.html` bei `API_BASE` eintragen.

## Lokal testen

```bash
npm install
FOOTBALL_DATA_TOKEN=dein_token npm start
```

Dann im Browser/curl: http://localhost:3000/api/data
