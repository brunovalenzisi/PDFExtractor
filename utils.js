const { parse, format } = require("date-fns");
const { es } = require("date-fns/locale");
const XLSX = require("xlsx");

function estructurarPdfData(pdfData) {
  let blocks = [];
  let index = 0;

  pdfData.Pages.forEach((page) => {
    page.Texts.forEach((text) => {
      text.R.forEach((r) => {
        if (decodeURIComponent(r.T) != "") {
          blocks.push({
            index: index,
            pos: text.y,
            block: decodeURIComponent(r.T),
          });
          index++;
        }
      });
    });
  });
  blocks = blocks.sort((a, b) => a.pos - b.pos);
  let lines = [];
  let currentLine = blocks[0].pos;
  let currentIndex = 0;
  lines[currentIndex] = [];
  blocks.forEach((block) => {
    if (block.pos == currentLine) {
      lines[currentIndex].push(block.block);
    } else {
      currentLine = block.pos;
      currentIndex++;
      lines[currentIndex] = [];
      lines[currentIndex].push(block.block);
    }
  });

  lines = lines.map((line) => line.join("").replace(/\s+/g, " "));

  return lines;
}

function parseChromatogram(lines) {
  const normalizeText = (text) => text.replace(/├│|┬Á/g, "µL").trim(); // Reemplazo de caracteres especiales

  const data = {
    "Data File Name": "",
    "Method File Name": "",
    "Batch File Name": "",
    "Report File Name": "",
    Analista: "",
    "Sample Name": "",
    "Data Acquired": "",
    "Data Processed": "",
    Vial: "",
    "Vol. Inyección": "",
    Peaks: [],
  };

  let peaks = [];
  let isPeakSection = false;

  lines.forEach((line, index) => {
    line = normalizeText(line);

    if (line.includes("Data File Name"))
      data["Data File Name"] = line.match(/C:\\.*$/)[0] || "";
    else if (line.includes("Method File Name"))
      data["Method File Name"] = line.match(/C:\\.*$/)[0] || "";
    else if (line.includes("Batch File Name"))
      data["Batch File Name"] = line.match(/C:\\.*$/)[0] || "";
    else if (line.includes("Report File Name"))
      data["Report File Name"] = line.match(/C:\\.*$/)[0] || "";
    else if (line.includes("Analista"))
      data["Analista"] = line.split(":")[1]?.trim() || "";
    else if (line.includes("Data Acquired"))
      data["Data Acquired"] =
        parseDate(line.match(/\d{2}\/\d{2}\/\d{4}.*$/)?.[0]?.trim()) || "";
    else if (line.includes("Data Processed"))
      data["Data Processed"] =
        parseDate(line.match(/\d{2}\/\d{2}\/\d{4}.*$/)?.[0]?.trim()) || "";
    else if (line.includes("Vial"))
      data["Vial"] = line.split(":")[1]?.trim() || "";
    else if (line.includes("Vol. Inyección"))
      data["Vol. Inyección"] = line.split(":")[1]?.trim() || "";
    else if (index > 0 && lines[index - 1].includes("Analista"))
      data["Sample Name"] = line.trim();
    else if (line.includes("Peak#"))
      isPeakSection = true; // Marca el inicio de los picos
    else if (isPeakSection && line.trim() !== "") {
      // Extraer datos de picos
      const peakData = line.trim().split(/\s+/);
      if (peakData.length >= 7) {
        let name = "";
        let posName = peakData.length - 6;
        for (let i = 0; i < posName; i++) {
          name += peakData[1 + i];
        }
        peaks.push({
          "Peak#": peakData[0],
          Name: name,
          "Ret. Time": peakData[1 + posName],
          Area: peakData[2 + posName],
          "Theoretical Plate": peakData[3 + posName],
          Tailing: peakData[4 + posName],
          Resolution: peakData[5 + posName] || "--",
        });
      }
    }
  });

  data["Peaks"] = peaks;
  return data;
}

function parseDate(rawDate) {
  if (rawDate) {
    let fecha = parse(rawDate, "dd/MM/yyyy hh:mm:ss a", new Date(), {
      locale: es,
    });
    return fecha;
  }
}

function crearHojaPorLote(inyections, wb) {
  let lots = {};
  inyections.forEach((iny) => {
    const nameParts = iny["Sample Name"].split(" ");
    let type = nameParts[0].replace(/\d+/g, "");
    let lot = nameParts[1];

    if (nameParts[2]) {
      if (lots[type + "-" + nameParts[1]]) {
        lots[type + "-" + nameParts[1]].push(iny);
      } else {
        lots[type + "-" + nameParts[1]] = [];
        lots[type + "-" + nameParts[1]].push(iny);
      }
    } else {
      if (lots[type]) {
        lots[type].push(iny);
      } else {
        lots[type] = [];
        lots[type].push(iny);
      }
    }
  });
  Object.keys(lots).forEach((key) => {
    const sheetData = [];
    const headers = ["Peaks"];

    sheetData.push(headers);

    lots[key].forEach((entry) => {
      if (entry.Peaks && entry.Peaks.length > 0) {
        entry.Peaks.forEach((peak) => {
          sheetData.push([JSON.stringify(peak)]);
        });
      } else {
        sheetData.push(["No peaks"]);
      }
    });

    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
    autoAdjustColumnWidth(worksheet);
    XLSX.utils.book_append_sheet(wb, worksheet, key);
  });
}

function crearHojaPorPico(inyections, wb) {
  const groupedPeaks = {};

  inyections.forEach((item) => {
    item.Peaks.forEach((peak) => {
      const peakName = peak["Name"];
      if (!groupedPeaks[peakName]) {
        groupedPeaks[peakName] = [];
      }
      groupedPeaks[peakName].push({
        "Sample Name": item["Sample Name"],
        ...peak,
      });
    });
  });

  // Crear una hoja por cada grupo de picos (por nombre de pico)
  Object.keys(groupedPeaks).forEach((peakName) => {
    const peakGroupData = groupedPeaks[peakName].map((peak) => ({
      "Sample Name": peak["Sample Name"],
      "Ret. Time": peak["Ret. Time"],
      Area: peak["Area"],
      "Theoretical Plate": peak["Theoretical Plate"],
      Tailing: peak["Tailing"],
      Resolution: peak["Resolution"] || "--",
    }));

    const peakSheet = XLSX.utils.json_to_sheet(peakGroupData);
    autoAdjustColumnWidth(peakSheet);
    XLSX.utils.book_append_sheet(wb, peakSheet, `${peakName}`);
  });
}

function autoAdjustColumnWidth(ws) {
  const range = XLSX.utils.decode_range(ws["!ref"]); // Obtiene el rango de celdas
  const columns = range.e.c + 1; // Número total de columnas
  const columnWidths = [];

  // Recorre todas las celdas y calcula el ancho máximo por columna
  for (let C = range.s.c; C <= range.e.c; C++) {
    let maxLength = 0;
    for (let R = range.s.r; R <= range.e.r; R++) {
      const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
      if (cell && cell.v) {
        maxLength = Math.max(maxLength, cell.v.toString().length); // Compara el largo de las celdas
      }
    }
    columnWidths.push({ wch: maxLength + 2 }); // +2 para dar un poco de espacio extra
  }

  ws["!cols"] = columnWidths;
}
function crearHojaSecuencia(inyections, wb) {
  let inyectionsData = inyections.map((item) => {
    const { Peaks, ...generalData } = item;
    return generalData;
  });

  const wsChrom = XLSX.utils.json_to_sheet(inyectionsData);

  // Ajusta el ancho de las columnas antes de agregar las hojas
  autoAdjustColumnWidth(wsChrom);

  XLSX.utils.book_append_sheet(wb, wsChrom, "Secuencia");
}

module.exports = {
  estructurarPdfData,
  parseChromatogram,
  crearHojaPorLote,
  crearHojaPorPico,
  crearHojaSecuencia,
};
