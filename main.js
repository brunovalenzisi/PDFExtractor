const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const PDFParser = require("pdf2json");
const XLSX = require("xlsx");
const { estructurarPdfData, parseChromatogram } = require("./utils.js");
const { compareAsc, format } = require("date-fns");
let inyections = [];

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1240,
    height: 800,
    webPreferences: {
      preload: __dirname + "/preload.js", // Cargar el preload
      contextIsolation: true,
      enableRemoteModule: false,
    },
  });

  win.loadFile("index.html");
};

app.whenReady().then(createWindow);

ipcMain.handle("select-files", async () => {
  const { filePaths } = await dialog.showOpenDialog({
    properties: ["openFile", "multiSelections"],
    filters: [{ name: "PDFs", extensions: ["pdf"] }],
  });

  return filePaths; // Devuelve las rutas al renderer
});

// 📌 Manejar eventos de procesamiento
ipcMain.handle("process-files", async (event, files) => {
  inyections = [];
  const writePromises = files.map((file, index) => {
    const pdfParser = new PDFParser(this, 1);

    return new Promise((resolve, reject) => {
      pdfParser.on("pdfParser_dataError", (errData) => {
        console.error(errData.parserError);
        reject(errData.parserError);
      });

      pdfParser.on("pdfParser_dataReady", async (pdfData) => {
        try {
          const lines = estructurarPdfData(pdfData);

          const structuredData = parseChromatogram(lines);
          inyections.push(structuredData);
          resolve();
        } catch (error) {
          reject(error);
        }
      });

      pdfParser.loadPDF(file);
    });
  });

  await Promise.all(writePromises);
  await generarXcell(inyections, "Resultados.xlsx");
});

// Función para ajustar automáticamente el ancho de las columnas
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

  // Asigna los anchos a las columnas
  ws["!cols"] = columnWidths;
}

async function generarXcell(inyections, filename) {
  inyections = inyections.sort((a, b) =>
    compareAsc(a["Data Acquired"], b["Data Acquired"])
  );

  inyections.forEach((iny) => {
    iny["Data Acquired"] = format(iny["Data Acquired"], "yyyy-MM-dd HH:mm:ss");
    iny["Data Processed"] = format(iny["Data Processed"], "yyyy-MM-dd HH:mm:ss");
  });


  let inyectionsData = inyections.map((item) => {
    const { Peaks, ...generalData } = item;
    return generalData;
  });



  const wb = XLSX.utils.book_new();

  const wsChrom = XLSX.utils.json_to_sheet(inyectionsData);
 

  // Ajusta el ancho de las columnas antes de agregar las hojas
  autoAdjustColumnWidth(wsChrom);
  

  XLSX.utils.book_append_sheet(wb, wsChrom, "Secuencia");
 

  // Agrupar todos los picos por el nombre del pico
  const groupedPeaks = {};

  inyections.forEach((item) => {
    item.Peaks.forEach((peak) => {
      const peakName = peak["Name"];
      if (!groupedPeaks[peakName]) {
        groupedPeaks[peakName] = [];
      }
      groupedPeaks[peakName].push({"Sample Name":item["Sample Name"],...peak});
    });
  });

  // Crear una hoja por cada grupo de picos (por nombre de pico)
  Object.keys(groupedPeaks).forEach((peakName) => {
    const peakGroupData = groupedPeaks[peakName].map((peak) => ({
      "Sample Name": peak["Sample Name"],
      "Ret. Time": peak["Ret. Time"],
      "Area": peak["Area"],
      "Theoretical Plate": peak["Theoretical Plate"],
      "Tailing": peak["Tailing"],
      "Resolution": peak["Resolution"] || "--"
    }));

    const peakSheet = XLSX.utils.json_to_sheet(peakGroupData);
    autoAdjustColumnWidth(peakSheet); // Ajustar el ancho de las columnas de cada hoja de pico

    // Agregar la hoja de picos agrupados por nombre
    XLSX.utils.book_append_sheet(wb, peakSheet, `${peakName}`);
  });

  // Escribir el archivo Excel
  XLSX.writeFile(wb, filename);
}







