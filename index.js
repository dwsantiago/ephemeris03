const express = require("express");
const { exec } = require("child_process");

const app = express();

app.get("/", (req, res) => {
  res.send("Swiss Ephemeris funcionando via swetest!");
});

// Exemplo: /sun?year=2025&month=11&day=20&hour=12.5
app.get("/sun", (req, res) => {
  const { year, month, day, hour } = req.query;

  if (!year || !month || !day || !hour) {
    return res.json({ error: "Envie year, month, day, hour" });
  }

  const date = `${year}.${month}.${day}`;
  const cmd = `swetest -b${date} -ut${hour} -p0 -head`;

  exec(cmd, (err, stdout) => {
    if (err) return res.json({ error: err.toString() });

    const parts = stdout.trim().split(/\s+/);

    res.json({
      planet: "Sun",
      longitude: parts[1],
      latitude: parts[2],
      distance: parts[3],
    });
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log("Rodando na porta " + port);
});
✅ 2. Edite seu package.json
Use isso:

json
Copiar código
{
  "name": "ephemeris-api",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "express": "^4.18.2"
  }
}
