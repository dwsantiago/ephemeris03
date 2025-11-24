const express = require("express");
const { exec } = require("child_process");

const app = express();

app.get("/", (req, res) => {
  res.send("Swiss Ephemeris API online (usando swetest)");
});

app.get("/planet", (req, res) => {
  const { planet = "0", year, month, day, hour } = req.query;

  if (!year || !month || !day || !hour) {
    return res.json({ error: "Envie year, month, day, hour" });
  }

  const date = `${year}.${month}.${day}`;
  const cmd = `swetest -b${date} -ut${hour} -p${planet} -head`;

  exec(cmd, (err, stdout) => {
    if (err) return res.json({ error: err.toString() });

    const parts = stdout.trim().split(/\s+/);

    res.json({
      planet,
      longitude: parts[1],
      latitude: parts[2],
      distance: parts[3]
    });
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log("Rodando na porta " + port);
});
