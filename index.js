const express = require("express");
const koffi = require("koffi");

const app = express();
app.use(express.json());

// 1. Carrega a biblioteca compilada
// O Dockerfile coloca ela em /usr/local/lib
const libPath = "/usr/local/lib/libswe.so";
const lib = koffi.load(libPath);

// 2. Define as funções C
// swe_julday: Retorna double, recebe ints e double
const swe_julday = lib.func('double swe_julday(int year, int month, int day, double hour, int flag)');

// swe_set_ephe_path: Retorna void, recebe string
const swe_set_ephe_path = lib.func('void swe_set_ephe_path(const char *path)');

// swe_calc_ut: Retorna int (flags), recebe double, int, int, ponteiro de resultado, ponteiro de erro
// _Out_ indica para o Koffi que esses ponteiros serão escritos pela função C
const swe_calc_ut = lib.func('int swe_calc_ut(double jd, int ipl, int iflag, _Out_ double *xx, _Out_ char *serr)');

// Configura o caminho das efemérides (igual antes)
const SEPH_PATH = "/usr/local/share/ephe";
swe_set_ephe_path(SEPH_PATH);

app.get("/", (req, res) => {
  res.send("Swiss Ephemeris API online ✓ (Powered by Koffi ☕)");
});

app.get("/positions", (req, res) => {
  try {
    const { year, month, day, hour, id } = req.query;

    if (!year || !month || !day || !hour || !id) {
        return res.status(400).json({ error: "Faltam parâmetros. Use: year, month, day, hour, id" });
    }

    // Calcula Dia Juliano
    const jd = swe_julday(
      parseInt(year),
      parseInt(month),
      parseInt(day),
      parseFloat(hour),
      1 // SE_GREG_CAL
    );

    // Flags: Speed (256) + SwissEph (2)
    const iflag = 256 | 2; 

    // Aloca memória para os resultados
    // array de 6 doubles (lon, lat, dist, speed_lon, speed_lat, speed_dist)
    const resultBuffer = new Float64Array(6); 
    // buffer de erro (256 bytes)
    const errorBuffer = Buffer.alloc(256);

    // Chama a função
    const retFlag = swe_calc_ut(jd, parseInt(id), iflag, resultBuffer, errorBuffer);

    if (retFlag < 0) {
        // Lê a string de erro do buffer C
        // Koffi decode lê até o null terminator
        const errorMsg = koffi.decode(errorBuffer, "char", 256);
        return res.status(500).json({ error: "Erro na Swiss Ephemeris", details: errorMsg });
    }

    res.json({
      jd,
      target_id: parseInt(id),
      data: {
        lon: resultBuffer[0],
        lat: resultBuffer[1],
        dist: resultBuffer[2],
        speed_lon: resultBuffer[3],
        speed_lat: resultBuffer[4],
        speed_dist: resultBuffer[5]
      }
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT}`);
});
