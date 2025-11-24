const express = require("express");
const ffi = require("ffi-napi");
const ref = require("ref-napi");

const app = express();
app.use(express.json());

// Definição da interface com a lib C (libswe)
const sweLib = ffi.Library("libswe", {
  // Define o caminho dos arquivos de efemérides
  swe_set_ephe_path: ["void", ["string"]],
  
  // Calcula Dia Juliano: (ano, mes, dia, hora, flag_gregoriano) -> double
  swe_julday: ["double", ["int", "int", "int", "double", "int"]],
  
  // Calcula posições: (jd, planeta_id, flags, array_resultado, string_erro) -> int (flags reais)
  // Nota: Mudei para 'pointer' para termos controle total do buffer de memória
  swe_calc_ut: ["int", ["double", "int", "int", "pointer", "pointer"]],
});

// Configura o caminho que definimos no Dockerfile
const SEPH_PATH = "/usr/local/share/ephe";
sweLib.swe_set_ephe_path(SEPH_PATH);

app.get("/", (req, res) => {
  res.send("Swiss Ephemeris API online ✓ - Escorpião no comando ♏");
});

app.get("/positions", (req, res) => {
  try {
    const { year, month, day, hour, id } = req.query;

    if (!year || !month || !day || !hour || !id) {
        return res.status(400).json({ error: "Faltam parâmetros. Use: year, month, day, hour, id" });
    }

    // Calcula o Dia Juliano
    const jd = sweLib.swe_julday(
      parseInt(year),
      parseInt(month),
      parseInt(day),
      parseFloat(hour),
      1 // 1 = Calendário Gregoriano
    );

    // Flags para o cálculo:
    // 2 (SEFLG_SWIEPH) = Usa efemérides suíças (precisão máxima)
    // 256 (SEFLG_SPEED) = Calcula velocidade também
    const iflag = 256 | 2; 

    // Aloca buffers de memória
    // resultBuffer: Array de 6 doubles (6 * 8 bytes = 48 bytes)
    // Índices: 0=Lon, 1=Lat, 2=Dist, 3=VelLon, 4=VelLat, 5=VelDist
    const resultBuffer = Buffer.alloc(48);
    const serrBuffer = Buffer.alloc(256); // Buffer para mensagem de erro

    // Chama a função C
    const retFlag = sweLib.swe_calc_ut(jd, parseInt(id), iflag, resultBuffer, serrBuffer);

    if (retFlag < 0) {
        // Se retornou negativo, deu erro na lib
        const errorMsg = ref.readCString(serrBuffer, 0);
        return res.status(500).json({ error: "Erro na Swiss Ephemeris", details: errorMsg });
    }

    // Lê os dados do buffer (Node usa Little Endian por padrão em x64)
    const longitude = resultBuffer.readDoubleLE(0);
    const latitude = resultBuffer.readDoubleLE(8);
    const distance = resultBuffer.readDoubleLE(16);
    const speed = resultBuffer.readDoubleLE(24);

    res.json({
      jd,
      target_id: parseInt(id),
      data: {
        lon: longitude,
        lat: latitude,
        dist: distance,
        speed: speed // Velocidade diária em graus
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
