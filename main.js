const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const PDFParser = require("pdf2json");
const fs = require("fs/promises");  // Usamos la versión promesa de fs

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
          const rawText = await pdfParser.getRawTextContent();
          await fs.writeFile(`./test${index}.txt`, rawText); // Usamos fs.promises.writeFile
          console.log(`Archivo test${index}.txt guardado correctamente.`);
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
});
