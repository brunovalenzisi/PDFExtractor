const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const PDFParser = require("pdf2json");
const XLSX = require("xlsx");
const {
  estructurarPdfData,
  parseChromatogram,
  crearHojaPorPico,
  crearHojaSecuencia,
  crearHojaPorLote,
} = require("./utils.js");
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

async function generarXcell(inyections, filename) {
  inyections = inyections.sort((a, b) =>
    compareAsc(a["Data Acquired"], b["Data Acquired"])
  );

  inyections.forEach((iny) => {
    iny["Data Acquired"] = format(iny["Data Acquired"], "yyyy-MM-dd HH:mm:ss");
    iny["Data Processed"] = format(
      iny["Data Processed"],
      "yyyy-MM-dd HH:mm:ss"
    );
  });
  const wb = XLSX.utils.book_new();

  crearHojaSecuencia(inyections, wb);
  crearHojaPorPico(inyections, wb);
  crearHojaPorLote(inyections, wb);

  XLSX.writeFile(wb, filename);
}
