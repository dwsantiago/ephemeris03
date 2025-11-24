const express = require("express");
const koffi = require("koffi");

const app = express();
app.use(express.json());

// --- 1. CONFIGURAÇÃO DA LIB SWISS EPHEMERIS ---
const libPath = "/usr/local/lib/libswe.so";
const lib = koffi.load(libPath);

// Mapeamento das funções C
const swe_julday = lib.func('double swe_julday(int year, int month, int day, double hour, int flag)');
const swe_set_ephe_path = lib.func('void swe_set_ephe_path(const char *path)');
const swe_calc_ut = lib.func('int swe_calc_ut(double jd, int ipl, int iflag, _Out_ double *xx, _Out_ char *serr)');

// NOVA FUNÇÃO: swe_houses (Calcula Ascendente e Casas)
// Parâmetros: JD, Latitude, Longitude, Sistema de Casas ('P' = Placidus), Arrays de saída
const swe_houses = lib.func('int swe_houses(double jd, double lat, double lon, int hsys, _Out_ double *cusps, _Out_ double *ascmc)');

const SEPH_PATH = "/usr/local/share/ephe";
swe_set_ephe_path(SEPH_PATH);

// Lista de IDs dos Astros (Swiss Ephemeris)
const PLANETS = {
  0: "Sun", 1: "Moon", 2: "Mercury", 3: "Venus", 4: "Mars",
  5: "Jupiter", 6: "Saturn", 7: "Uranus", 8: "Neptune", 9: "Pluto",
  11: "North Node", 15: "Chiron"
};

app.get("/", (req, res) => res.send("API Astrológica Full Power 🚀"));

// --- 2. ROTA MESTRA: /chart ---
app.get("/chart", (req, res) => {
  try {
    // Agora pedimos lat/lon do local!
    const { year, month, day, hour, lat, lon } = req.query;

    if (!year || !month || !day || !hour || !lat || !lon) {
      return res.status(400).json({ error: "Use: ?year=2025&month=11&day=24&hour=12.0&lat=-23.55&lon=-46.63" });
    }

    // 1. Calcula Data Juliana
    const jd = swe_julday(parseInt(year), parseInt(month), parseInt(day), parseFloat(hour), 1);
    
    // 2. Calcula Posições dos Planetas (Loop)
    const bodies = {};
    const iflag = 256 | 2; // Speed + SwissEph
    const resultBuffer = new Float64Array(6);
    const errBuffer = Buffer.alloc(256);

    for (const [id, name] of Object.entries(PLANETS)) {
      swe_calc_ut(jd, parseInt(id), iflag, resultBuffer, errBuffer);
      bodies[name] = {
        lon: resultBuffer[0], // O que importa para o signo
        speed: resultBuffer[3] // Se negativo = Retrógrado
      };
    }

    // 3. Calcula Casas e Ascendente (Depende do Local)
    const cusps = new Float64Array(13); // Casas 1-12
    const ascmc = new Float64Array(10); // 0=Asc, 1=MC
    
    // 'P' (código ASCII 80) = Sistema Placidus
    swe_houses(jd, parseFloat(lat), parseFloat(lon), 80, cusps, ascmc);

    res.json({
      meta: { jd, date: `${day}/${month}/${year}`, time: hour, loc: { lat, lon } },
      houses: {
        Ascendant: ascmc[0],
        MC: ascmc[1],
        House_1: cusps[1],
        // ... você pode adicionar as outras se quiser
      },
      bodies: bodies
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.listen(process.env.PORT || 3000, () => console.log("API no ar"));
