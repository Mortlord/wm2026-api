# WM 2026 Data API (football-data.org)

Kleiner Proxy/Cache-Server fuer WM-2026-Daten von football-data.org
(Competition-Code `WC`, v4 API). Die GitHub-Pages-App fragt nur diesen
Server ab; der Auth-Token bleibt geheim auf dem Server.

## Warum ein Proxy?

- Free Tier von football-data.org: 10 Requests/Minute. Der Server
  fragt nur alle 5 Minuten ab (2 Requests: standings + matches), egal
  wie viele Leute die App gleichzeitig nutzen.
- Der Token darf nicht im Frontend-Code stehen.

## Endpoints

- `GET /api/data` -> liefert `{ standings, matches, updatedAt, error }`
  - `standings`: Array, ein Eintrag pro Gruppe (`group`, `table` mit
    Position, Team, Spiele, Punkten, Tordifferenz etc.)
  - `matches`: Array mit allen WM-Spielen (Gruppenphase + K.o.-Runden),
    inkl. `stage`, `group`, `status`, `score`, `utcDate`
- `POST /api/refresh` -> erzwingt sofortiges Neuladen (zum Testen)

## Setup auf Railway

1. Account auf https://www.football-data.org/client/register erstellen
   (kostenlos, kein Kreditkartenbedarf). Token kommt per E-Mail.
2. **Falls der Token bereits einmal oeffentlich geteilt wurde (z.B. im
   Chat): im Account-Bereich regenerieren!**
3. Neues Railway-Projekt anlegen, diesen Ordner als Repo pushen/deployen
4. **Umgebungsvariable setzen** (Railway -> Service -> "Variables"):
   - `FOOTBALL_DATA_TOKEN` = dein Token
5. **Volume hinzufuegen** (Settings -> Volumes), Mount-Path: `/app/data`
   - Damit bleibt der Cache auch nach einem Redeploy erhalten
6. Nach dem Deploy bekommst du eine URL wie
   `https://wm2026-api-production.up.railway.app`

## Lokal testen

```bash
npm install
FOOTBALL_DATA_TOKEN=dein_token npm start
```

Dann im Browser/curl: http://localhost:3000/api/data

## index.html anpassen

In der `index.html` ganz oben:

```js
const API_BASE = 'https://DEINE-RAILWAY-URL.up.railway.app';
```
