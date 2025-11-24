/**
 * Swiss Ephemeris API - Full
 * Routes:
 *  /positions?date=ISO&lat=&lon=
 *  /houses?date=ISO&lat=&lon&system=whole|placidus|equal (default=whole)
 *  /raw?date=ISO&lat=&lon&houses=system
 *  /temperament?date=ISO&lat=&lon
 *
 * Note: set EPHE_PATH env var or use ./ephe
 */
const express = require('express');
const swe = require('swisseph');
const morgan = require('morgan');

const EPHE_PATH = process.env.EPHE_PATH || (__dirname + '/ephe');
const PORT = process.env.PORT || 3000;

swe.swe_set_ephe_path(EPHE_PATH);

const app = express();
app.use(morgan('dev'));
app.disable('x-powered-by');

// helper: parse date to Julian Day (UT)
function parseToJD(dateStr) {
  const dt = new Date(dateStr);
  if (isNaN(dt.getTime())) throw new Error('Invalid date');
  const year = dt.getUTCFullYear();
  const month = dt.getUTCMonth() + 1;
  const day = dt.getUTCDate();
  const hour = dt.getUTCHours() + dt.getUTCMinutes()/60 + dt.getUTCSeconds()/3600 + dt.getUTCMilliseconds()/3600000;
  const jd = swe.swe_julday(year, month, day, hour, swe.SE_GREG_CAL);
  return jd;
}

const BODY_MAP = {
  sun: swe.SE_SUN,
  moon: swe.SE_MOON,
  mercury: swe.SE_MERCURY,
  venus: swe.SE_VENUS,
  mars: swe.SE_MARS,
  jupiter: swe.SE_JUPITER,
  saturn: swe.SE_SATURN,
  uranus: swe.SE_URANUS,
  neptune: swe.SE_NEPTUNE,
  pluto: swe.SE_PLUTO
};

function calcPlanets(jd) {
  const flags = swe.SEFLG_SWIEPH;
  const out = {};
  for (const [name, id] of Object.entries(BODY_MAP)) {
    try {
      const res = swe.swe_calc_ut(jd, id, flags);
      out[name] = { lon: res[0], lat: res[1], dist: res[2], speed_lon: res[3] || 0 };
    } catch (e) {
      out[name] = null;
    }
  }
  return out;
}

function calcHouses(jd, lat, lon, system) {
  try {
    const res = swe.swe_houses(jd, lat, lon, system);
    // bindings vary; normalize
    if (Array.isArray(res) && res.length >= 13) {
      return { asc: res[0], mc: res[1], houses: res.slice(2,14) };
    } else if (typeof res === 'object') {
      return { asc: res.ascendant || res[0] || null, mc: res.mc || null, houses: res.houses || null };
    } else {
      return null;
    }
  } catch (e) {
    return { error: String(e) };
  }
}

function lonToSign(lon) {
  const norm = ((lon % 360) + 360) % 360;
  const idx = Math.floor(norm / 30);
  const signs = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
  return { sign: signs[idx], deg: norm - idx*30, idx };
}
function signElement(sign) {
  const map = {
    Aries: 'Fire', Leo: 'Fire', Sagittarius: 'Fire',
    Taurus: 'Earth', Virgo:'Earth', Capricorn:'Earth',
    Gemini:'Air', Libra:'Air', Aquarius:'Air',
    Cancer:'Water', Scorpio:'Water', Pisces:'Water'
  };
  return map[sign] || 'Earth';
}

// simple temperament calculation: count elements from Sun,Moon,Asc and planets (weighted)
function calcTemperament(planets, ascLon) {
  const elements = { Fire:0, Earth:0, Air:0, Water:0 };
  const add = (lon, weight=1) => {
    const s = lonToSign(lon).sign;
    const e = signElement(s);
    elements[e] += weight;
  };
  // Sun, Moon, Asc
  if (planets.sun) add(planets.sun.lon, 3);
  if (planets.moon) add(planets.moon.lon, 2.5);
  if (ascLon !== undefined && ascLon !== null) add(ascLon, 3);
  // other planets lower weight
  ['mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto'].forEach(p=>{
    if (planets[p]) add(planets[p].lon, 1);
  });
  // normalize to percentages
  const total = elements.Fire + elements.Earth + elements.Air + elements.Water;
  const result = {};
  for (const k of Object.keys(elements)) {
    result[k] = Math.round((elements[k]/total)*1000)/10; // 1 decimal
  }
  return result;
}

// routes
app.get('/positions', (req, res) => {
  try {
    const { date, lat, lon } = req.query;
    if (!date || !lat || !lon) return res.status(400).json({ error: 'Missing params' });
    const jd = parseToJD(date);
    const planets = calcPlanets(jd);
    return res.json({ date, lat: parseFloat(lat), lon: parseFloat(lon), planets });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
});

app.get('/houses', (req, res) => {
  try {
    const { date, lat, lon, system='W' } = req.query;
    if (!date || !lat || !lon) return res.status(400).json({ error: 'Missing params' });
    const jd = parseToJD(date);
    const houses = calcHouses(jd, parseFloat(lat), parseFloat(lon), system);
    return res.json({ date, lat: parseFloat(lat), lon: parseFloat(lon), houses });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
});

app.get('/raw', (req, res) => {
  try {
    const { date, lat, lon, system='W' } = req.query;
    if (!date || !lat || !lon) return res.status(400).json({ error: 'Missing params' });
    const jd = parseToJD(date);
    const planets = calcPlanets(jd);
    const houses = calcHouses(jd, parseFloat(lat), parseFloat(lon), system);
    return res.json({ date, lat: parseFloat(lat), lon: parseFloat(lon), planets, houses });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
});

app.get('/temperament', (req, res) => {
  try {
    const { date, lat, lon, system='W' } = req.query;
    if (!date || !lat || !lon) return res.status(400).json({ error: 'Missing params' });
    const jd = parseToJD(date);
    const planets = calcPlanets(jd);
    const houses = calcHouses(jd, parseFloat(lat), parseFloat(lon), system);
    const asc = houses && houses.asc ? houses.asc : null;
    const temp = calcTemperament(planets, asc);
    return res.json({ date, lat: parseFloat(lat), lon: parseFloat(lon), temperament: temp, planets, houses });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
});

app.get('/health', (req,res) => res.json({ status:'ok', ephe_path: EPHE_PATH }));

app.listen(PORT, () => console.log('Swiss Ephemeris API listening on', PORT));