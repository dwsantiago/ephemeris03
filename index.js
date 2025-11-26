const express = require("express");
const koffi = require("koffi");
const GeoTZ = require("geo-tz");
const moment = require("moment-timezone");
const morgan = require("morgan");

const app = express();
app.use(express.json());
app.use(morgan("dev")); // Logs no console

// --- 0. SEGURANÇA (MIDDLEWARE DE AUTENTICAÇÃO) ---
const authMiddleware = (req, res, next) => {
  // A senha pode vir no Header 'x-api-key' OU na URL '?key=senha'
  const clientKey = req.headers['x-api-key'] || req.query.key;
  
  // A senha verdadeira deve estar nas Variáveis de Ambiente do Render
  // Se não tiver configurada, usa "senha123" como fallback (só para teste)
  const serverKey = process.env.API_SECRET || "senha123";

  if (!clientKey || clientKey !== serverKey) {
    return res.status(401).json({ error: "🔒 Acesso negado. Chave de API inválida." });
  }

  next(); // Pode passar
};

// Aplica a segurança em TODAS as rotas abaixo
app.use(authMiddleware);

// --- 1. CARREGAMENTO DA SWISS EPHEMERIS (VIA KOFFI) ---
const libPath = "/usr/local/lib/libswe.so";
const lib = koffi.load(libPath);

// Mapeamento das funções C
const swe_julday = lib.func('double swe_julday(int year, int month, int day, double hour, int flag)');
const swe_set_ephe_path = lib.func('void swe_set_ephe_path(const char *path)');
const swe_calc_ut = lib.func('int swe_calc_ut(double jd, int ipl, int iflag, _Out_ double *xx, _Out_ char *serr)');
const swe_houses = lib.func('int swe_houses(double jd, double lat, double lon, int hsys, _Out_ double *cusps, _Out_ double *ascmc)');

const SEPH_PATH = "/usr/local/share/ephe";
swe_set_ephe_path(SEPH_PATH);

const PLANETS = {
  0: "Sun", 1: "Moon", 2: "Mercury", 3: "Venus", 4: "Mars",
  5: "Jupiter", 6: "Saturn", 7: "Uranus", 8: "Neptune", 9: "Pluto",
  11: "North Node", 15: "Chiron"
};

app.get("/", (req, res) => res.send("API Protegida Online 🔐"));

// --- 2. ROTA INTELIGENTE: /chart ---
app.get("/chart", (req, res) => {
  try {
    const { year, month, day, hour, lat, lon } = req.query;

    if (!year || !month || !day || !hour || !lat || !lon) {
      return res.status(400).json({ error: "Faltam parâmetros." });
    }

    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);
    
    // 1. Fuso Horário
    const timezoneList = GeoTZ.find(latNum, lonNum);
    const timezoneName = timezoneList[0]; 

    if (!timezoneName) throw new Error("Fuso horário não encontrado.");

    // 2. Hora Local -> UTC
    const hourInt = Math.floor(parseFloat(hour));
    const minuteInt = Math.round((parseFloat(hour) - hourInt) * 60);

    const localDate = moment.tz({
      year: parseInt(year),
      month: parseInt(month) - 1,
      day: parseInt(day),
      hour: hourInt,
      minute: minuteInt
    }, timezoneName);

    const utcDate = localDate.clone().utc();
    const yearUTC = utcDate.year();
    const monthUTC = utcDate.month() + 1;
    const dayUTC = utcDate.date();
    const hourDecimalUTC = utcDate.hour() + (utcDate.minute() / 60.0) + (utcDate.second() / 3600.0);

    // 3. Cálculo Suíço
    const jd = swe_julday(yearUTC, monthUTC, dayUTC, hourDecimalUTC, 1);
    const iflag = 256 | 2; 
    const resultBuffer = new Float64Array(6);
    const errBuffer = Buffer.alloc(256);
    const bodies = {};

    for (const [id, name] of Object.entries(PLANETS)) {
      swe_calc_ut(jd, parseInt(id), iflag, resultBuffer, errBuffer);
      bodies[name] = { lon: resultBuffer[0], speed: resultBuffer[3] };
    }

    const cusps = new Float64Array(13);
    const ascmc = new Float64Array(10);
    swe_houses(jd, latNum, lonNum, 80, cusps, ascmc); 

    res.json({
      meta: { 
        timezone: timezoneName,
        utc_calculated: { date: `${dayUTC}/${monthUTC}/${yearUTC}`, time: hourDecimalUTC }
      },
      houses: { Ascendant: ascmc[0], MC: ascmc[1], House_1: cusps[1] },
      bodies: bodies
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("API Segura rodando"));
