const express = require("express");
const swisseph = require("swisseph");
const path = require("path");

const app = express();
app.use(express.json());

// Configura o caminho da lib e dos arquivos ephemeris
swisseph.swe_set_ephe_path(path.join(__dirname, "ephe"));

app.get("/", (req, res) => {
  res.send("API de Efemérides Suíças rodando via Render!");
});

app.get("/ephemeris", (req, res) => {
  try {
    const { year, month, day, hour, lat, lon } = req.query;

    if (!year || !month || !day || !hour || !lat || !lon) {
      return res.status(400).json({
        error: "Parâmetros ausentes. Envie year, month, day, hour, lat, lon."
      });
    }

    const julday = swisseph.swe_julday(
      parseInt(year),
      parseInt(month),
      parseInt(day),
      parseFloat(hour),
      swisseph.SE_GREG_CAL
    );

    const flags = swisseph.SEFLG_SWIEPH;

    swisseph.swe_calc_ut(julday, swisseph.SE_SUN, flags, (body) => {
      res.json({
        julday,
        sun: {
          longitude: body.longitude,
          latitude: body.latitude,
          distance: body.distance
        }
      });
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno." });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log("Servidor rodando na porta " + port);
});
