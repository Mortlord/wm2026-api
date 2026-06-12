const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// football-data.org Konfiguration
const API_TOKEN = process.env.FOOTBALL_DATA_TOKEN;
const API_BASE = 'https://api.football-data.org/v4';
const COMPETITION = 'WC'; // FIFA World Cup

// Free Tier: 10 Requests/Minute. Wir machen 2 Requests pro Refresh
// (standings + matches), alle 5 Minuten ist also sehr sicher.
const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 Minuten

// In-Memory-Cache. Kein Volume notwendig: bei Neustart wird der Cache
// beim ersten refreshCache() sofort neu befuellt.
let cache = {
  standings: null,
  matches: null,
  updatedAt: null,
  error: null,
};

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: { 'X-Auth-Token': API_TOKEN || '' },
  timeout: 15000,
});

async function refreshCache() {
  if (!API_TOKEN) {
    console.error('FOOTBALL_DATA_TOKEN ist nicht gesetzt. Bitte als Umgebungsvariable in Railway hinterlegen.');
    cache.error = 'FOOTBALL_DATA_TOKEN fehlt auf dem Server.';
    return;
  }

  try {
    console.log('Aktualisiere Daten von football-data.org...');

    const [standingsRes, matchesRes] = await Promise.all([
      apiClient.get(`/competitions/${COMPETITION}/standings`),
      apiClient.get(`/competitions/${COMPETITION}/matches`),
    ]);

    cache = {
      standings: standingsRes.data.standings || [],
      matches: matchesRes.data.matches || [],
      updatedAt: new Date().toISOString(),
      error: null,
    };

    console.log(`Cache aktualisiert: ${cache.matches.length} Spiele, ${cache.standings.length} Tabellen.`);
  } catch (err) {
    console.error('Fehler beim Abrufen von football-data.org:', err.message);
    if (err.response && err.response.status === 429) {
      cache.error = 'Rate-Limit erreicht (zu viele Anfragen). Naechster Versuch in einigen Minuten.';
    } else if (err.response && err.response.status === 403) {
      cache.error = 'Zugriff verweigert (403). Pruefe den API-Token.';
    } else {
      cache.error = `Fehler beim Abrufen: ${err.message}`;
    }
    // alte cache.standings/matches bleiben erhalten, falls vorhanden,
    // damit die App weiter den letzten erfolgreichen Stand zeigen kann
  }
}

app.use(cors());
app.use(express.json());

// Gibt den kompletten Cache zurueck (Standings + Matches)
app.get('/api/data', (req, res) => {
  res.json(cache);
});

// Manuelles Refresh-Trigger (z.B. fuer Tests)
app.post('/api/refresh', async (req, res) => {
  await refreshCache();
  res.json(cache);
});

app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'WM 2026 Data API (football-data.org Proxy, in-memory cache)',
    lastUpdate: cache.updatedAt,
    hasError: !!cache.error,
  });
});

app.listen(PORT, () => {
  console.log(`WM2026 Data API laeuft auf Port ${PORT}`);
  refreshCache();
  setInterval(refreshCache, REFRESH_INTERVAL_MS);
});
