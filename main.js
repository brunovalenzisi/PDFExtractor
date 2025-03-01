const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const PDFParser = require("pdf2json");
const XLSX = require("xlsx");
const fs = require("fs/promises");  // Usamos la versión promesa de fs
const { estructurarPdfData,parseChromatogram } = require("./utils.js");
let inyections=[];


const createWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: __dirname + "/preload.js", // Cargar el preload
      contextIsolation: true, 
      enableRemoteModule: false
    }
  });

  win.loadFile("index.html");
};

app.whenReady().then(createWindow);

ipcMain.handle("select-files", async () => {
  const { filePaths } = await dialog.showOpenDialog({
    properties: ["openFile", "multiSelections"],
    filters: [{ name: "PDFs", extensions: ["pdf"] }]
  });

  return filePaths;  // Devuelve las rutas al renderer
});

// 📌 Manejar eventos de procesamiento
ipcMain.handle("process-files", async (event, files) => {
  const writePromises = files.map((file, index) => {
    const pdfParser = new PDFParser(this, 1);

    return new Promise((resolve, reject) => {
      pdfParser.on("pdfParser_dataError", (errData) => {
        console.error(errData.parserError);
        reject(errData.parserError);
      });

      pdfParser.on("pdfParser_dataReady", async (pdfData) => {
        try {
          
          const lines=estructurarPdfData(pdfData);

          const structuredData = parseChromatogram(lines);
          console.log(structuredData)
          inyections.push(structuredData);
          resolve();
        } catch (error) {
          reject(error);
        }
      });

      pdfParser.loadPDF(file);
    });
  });

  // Esperamos que todos los archivos se procesen antes de continuar
  await Promise.all(writePromises);
  await generarXcell(inyections,"Resultados.xlsx");
});


async function generarXcell(inyections,filename){
  const peaksData = [];
  
  const inyectionsData = inyections.map(item => {
    const { Peaks, ...generalData } = item;
    return generalData;
  });

  inyections.forEach(item => {
    const parentId = item["Sample Name"];
    item.Peaks.forEach(peak => {
      peaksData.push({
        "Sample Name": parentId, // Identificador del cromatograma
        ...peak
      });
    });
  });

  const wsChrom = XLSX.utils.json_to_sheet(inyectionsData);
  const wsPeaks = XLSX.utils.json_to_sheet(peaksData);

  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, wsChrom, "Cromatogramas");
  XLSX.utils.book_append_sheet(wb, wsPeaks, "Picos");
  
  XLSX.writeFile(wb,filename);




};



