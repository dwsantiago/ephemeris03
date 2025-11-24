const express = require("express");
const ffi = require("ffi-napi");
const ref = require("ref-napi");
const path = require("path");

const app = express();
app.use(express.json());

const sweLib = ffi.Library("libswe", {
  swe_set_ephe_path: ["void", ["string"]],
  swe_julday: ["double", ["int", "int", "int", "double", "int"]],
  swe_calc_ut: ["int", ["double", "int", "double*", "char*", "int"]],
});

const SEPH_PATH = "/usr/local/share/ephe";
sweLib.swe_set_ephe_path(SEPH_PATH);

app.get("/", (req, res) => {
  res.send("Swiss Ephemeris API online ✓");
});

app.get("/positions", (req, res) => {
  try {
    const { year, month, day, hour, id } = req.query;
    const jd = sweLib.swe_julday(
      parseInt(year),
      parseInt(month),
      parseInt(day),
      parseFloat(hour),
      1
    );

    const result = new Float64Array(6);
    const serr = Buffer.alloc(256);

    sweLib.swe_calc_ut(jd, parseInt(id), result, serr, 256);

    res.json({
      jd,
      data: {
        lon: result[0],
        lat: result[1],
        dist: result[2],
      },
      error: serr.toString().trim(),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log("API rodando na porta", process.env.PORT || 3000);
});
