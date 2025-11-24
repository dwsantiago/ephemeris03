const express = require("express");
const koffi = require("koffi");
const GeoTZ = require("geo-tz");
const moment = require("moment-timezone");

const app = express();
app.use(express.json());

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

app.get("/", (req, res) => res.send("API Astrológica Mundial Online 🌍"));

// --- 2. ROTA INTELIGENTE: /chart ---
app.get("/chart", (req, res) => {
  try {
    // Recebemos hora local e coordenadas
    const { year, month, day, hour, lat, lon } = req.query;

    if (!year || !month || !day || !hour || !lat || !lon) {
      return res.status(400).json({ error: "Faltam parâmetros." });
    }

    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);
    
    // 1. DESCOBRIR O FUSO HORÁRIO AUTOMATICAMENTE
    // O geo-tz retorna algo como ['America/Sao_Paulo'] ou ['Europe/Paris']
    const timezoneList = GeoTZ.find(latNum, lonNum);
    const timezoneName = timezoneList[0]; // Pega o primeiro (mais provável)

    if (!timezoneName) {
      throw new Error("Não foi possível determinar o fuso horário para este local.");
    }

    // 2. CONVERTER HORA LOCAL -> UTC (Considerando histórico de verão daquele ano)
    // hour vem decimal (ex: 14.5 para 14:30). Vamos separar.
    const hourInt = Math.floor(parseFloat(hour));
    const minuteInt = Math.round((parseFloat(hour) - hourInt) * 60);

    // Cria o objeto data no fuso LOCAL
    const localDate = moment.tz({
      year: parseInt(year),
      month: parseInt(month) - 1, // Moment usa mês 0-11
      day: parseInt(day),
      hour: hourInt,
      minute: minuteInt
    }, timezoneName);

    // Converte para UTC
    const utcDate = localDate.clone().utc();

    // Extrai os componentes UTC exatos (o dia pode ter mudado!)
    const yearUTC = utcDate.year();
    const monthUTC = utcDate.month() + 1; // Volta para 1-12
    const dayUTC = utcDate.date();
    const hourDecimalUTC = utcDate.hour() + (utcDate.minute() / 60.0) + (utcDate.second() / 3600.0);

    // 3. CÁLCULO SUIÇO (AGORA COM UTC PRECISO)
    const jd = swe_julday(yearUTC, monthUTC, dayUTC, hourDecimalUTC, 1);
    
    // Configurações do cálculo
    const iflag = 256 | 2; // Speed + SwissEph
    const resultBuffer = new Float64Array(6);
    const errBuffer = Buffer.alloc(256);
    const bodies = {};

    // Loop Planetas
    for (const [id, name] of Object.entries(PLANETS)) {
      swe_calc_ut(jd, parseInt(id), iflag, resultBuffer, errBuffer);
      bodies[name] = {
        lon: resultBuffer[0],
        speed: resultBuffer[3]
      };
    }

    // Loop Casas (Usa Lat/Lon locais e JD UTC)
    const cusps = new Float64Array(13);
    const ascmc = new Float64Array(10);
    swe_houses(jd, latNum, lonNum, 80, cusps, ascmc); // 'P' = Placidus

    res.json({
      meta: { 
        input_local: { date: `${day}/${month}/${year}`, time: hour, lat: latNum, lon: lonNum },
        timezone: timezoneName,
        utc_calculated: { date: `${dayUTC}/${monthUTC}/${yearUTC}`, time: hourDecimalUTC }
      },
      houses: {
        Ascendant: ascmc[0],
        MC: ascmc[1],
        House_1: cusps[1]
      },
      bodies: bodies
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("API rodando"));
