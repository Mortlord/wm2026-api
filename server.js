const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
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

const CACHE_FILE = path.join(__dirname, 'data', 'cache.json');

function ensureDataDir() {
  const dir = path.dirname(CACHE_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readCache() {
  ensureDataDir();
  try {
    return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
  } catch (e) {
    return { standings: null, matches: null, updatedAt: null, error: null };
  }
}

function writeCache(data) {
  ensureDataDir();
  fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2));
}

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: { 'X-Auth-Token': API_TOKEN || '' },
  timeout: 15000,
});

async function refreshCache() {
  if (!API_TOKEN) {
    console.error('FOOTBALL_DATA_TOKEN ist nicht gesetzt. Bitte als Umgebungsvariable in Railway hinterlegen.');
    const cache = readCache();
    cache.error = 'FOOTBALL_DATA_TOKEN fehlt auf dem Server.';
    writeCache(cache);
    return;
  }

  try {
    console.log('Aktualisiere Daten von football-data.org...');

    const [standingsRes, matchesRes] = await Promise.all([
      apiClient.get(`/competitions/${COMPETITION}/standings`),
      apiClient.get(`/competitions/${COMPETITION}/matches`),
    ]);

    const cache = {
      standings: standingsRes.data.standings || [],
      matches: matchesRes.data.matches || [],
      updatedAt: new Date().toISOString(),
      error: null,
    };

    writeCache(cache);
    console.log(`Cache aktualisiert: ${cache.matches.length} Spiele, ${cache.standings.length} Tabellen.`);
  } catch (err) {
    console.error('Fehler beim Abrufen von football-data.org:', err.message);
    const cache = readCache();
    if (err.response && err.response.status === 429) {
      cache.error = 'Rate-Limit erreicht (zu viele Anfragen). Naechster Versuch in einigen Minuten.';
    } else if (err.response && err.response.status === 403) {
      cache.error = 'Zugriff verweigert (403). Pruefe den API-Token.';
    } else {
      cache.error = `Fehler beim Abrufen: ${err.message}`;
    }
    writeCache(cache);
  }
}

app.use(cors());
app.use(express.json());

// Gibt den kompletten Cache zurueck (Standings + Matches)
app.get('/api/data', (req, res) => {
  const cache = readCache();
  res.json(cache);
});

// Manuelles Refresh-Trigger (z.B. fuer Tests)
app.post('/api/refresh', async (req, res) => {
  await refreshCache();
  res.json(readCache());
});

app.get('/', (req, res) => {
  const cache = readCache();
  res.json({
    status: 'ok',
    message: 'WM 2026 Data API (football-data.org Proxy)',
    lastUpdate: cache.updatedAt,
    hasError: !!cache.error,
  });
});

app.listen(PORT, () => {
  console.log(`WM2026 Data API laeuft auf Port ${PORT}`);
  refreshCache();
  setInterval(refreshCache, REFRESH_INTERVAL_MS);
});
