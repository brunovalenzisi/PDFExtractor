const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const PDFParser = require("pdf2json");
const XLSX = require("xlsx");
const fs = require("fs/promises");  // Usamos la versión promesa de fs
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
          const rawText = await pdfParser.getRawTextContent();
          const structuredData = parseChromatogram(rawText);
          inyections.push(structuredData);
          //await fs.writeFile(`./structuredData${index}.txt`, rawText)
          //await fs.writeFile(`./structuredData${index}.json`, JSON.stringify(structuredData, null, 2))
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

function parseChromatogram(content) {
  const data = {
    "Data File Name": (content.match(/Data File Name\s*:\s*(.*?)(?=\s*Method File Name)/s) || [])[1]?.trim() || "",
    "Method File Name": (content.match(/Method File Name\s*:\s*(.*?)(?=\s*Batch File Name)/s) || [])[1]?.trim() || "",
    "Batch File Name": (content.match(/Batch File Name\s*:\s*(.*?)(?=\s*Report File Name)/s) || [])[1]?.trim() || "",
    "Report File Name": (content.match(/Report File Name\s*:\s*(.*?)(?=\s*Analista)/s) || [])[1]?.trim() || "",
    "Analista": (content.match(/Analista\s*:\s*(.*?)(?=\s*PDA)/s) || [])[1]?.trim() || "",
    "Sample Name": (content.match(/\n([^\n]*)\s*min/) || [])[1]?.trim() || "",
    "Data Acquired": (content.match(/Data Acquired:\s*(.*?)(?=\s*Data Processed)/s) || [])[1]?.trim() || "",
    "Data Processed": (content.match(/Data Processed:\s*(.*?)(?=\s*Vial)/s) || [])[1]?.trim() || "",
    "Vial": (content.match(/Vial\s*:\s*(\d+)/s) || [])[1]?.trim() || "",
    "Vol. Inyección": (content.match(/Vol. Inyección\s*:\s*(\d+\s*μL)/s) || [])[1]?.trim() || "",
  };
  
  const peaks = [];
  //"PDA Channel": (content.match(/PDA Ch1 (\d+nm)/s) || [])[1]?.trim() || "",
  const peakNumbers = (content.match(/Peak#\s*([\d\s]+)(?=\s*Name)/s) || [])[1]?.trim().split(/\s+/) || [];
  const peakNames = (content.match(/Name\s*\n*([\w\s-]+)(?=\s*Ret\. Time)/s) || [])[1]?.trim().split(/\s+/) || [];
  const retTimes = (content.match(/Ret. Time\s*([\d,.\s]+)(?=\s*Area)/s) || [])[1]?.trim().split(/\s+/) || [];
  const areas = (content.match(/Area\s*([\d,.\s]+)(?=\s*Theoretical Plate)/s) || [])[1]?.trim().split(/\s+/) || [];
  const theoreticalPlates = (content.match(/Theoretical Plate\s*([\d,.\s]+)(?=\s*Tailing)/s) || [])[1]?.trim().split(/\s+/) || [];
  const tailings = (content.match(/Tailing\s*([\d,.\s]+)(?=\s*Resolution)/s) || [])[1]?.trim().split(/\s+/) || [];
  const Resolutions = (content.match(/Resolution\s*([\s\S]*?)(?=\s*Data Acquired)/s) || [])[1]?.trim().split(/\s+/) || [];

  for (let i = 0; i < peakNumbers.length; i++) {
    peaks.push({
      "Peak#": peakNumbers[i] || "",
      "Name": peakNames[i] || "",
      "Ret. Time": retTimes[i] || "",
      "Area": areas[i] || "",
      "Theoretical Plate": theoreticalPlates[i] || "",
      "Tailing": tailings[i] || "",
      "Resolution": Resolutions[i] || "",
    });
  }

  data["Peaks"] = peaks;

  return data;
}
