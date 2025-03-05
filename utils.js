const{ parse, format }= require("date-fns");
const{ es }= require("date-fns/locale");


function estructurarPdfData(pdfData) {
    let blocks = [];
    let index=0;

    pdfData.Pages.forEach((page) => {
       page.Texts.forEach((text)=>{
        text.R.forEach((r)=>{
            if(decodeURIComponent(r.T)!=""){
                blocks.push({index:index,pos:text.y,block:decodeURIComponent(r.T)});
                index++; 
            }
        })
       })
    })
    blocks=blocks.sort((a,b)=>a.pos-b.pos);
    let lines=[];
    let currentLine=blocks[0].pos;
    let currentIndex=0;
    lines[currentIndex] = [];
    blocks.forEach((block)=>{
        if(block.pos==currentLine){
            lines[currentIndex].push(block.block);
        }
        else{
            currentLine=block.pos;
            currentIndex++;
            lines[currentIndex]=[];
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
      "Analista": "",
      "Sample Name": "",
      "Data Acquired": "",
      "Data Processed": "",
      "Vial": "",
      "Vol. Inyección": "",
      "Peaks": []
    };
  
    let peaks = [];
    let isPeakSection = false;
  
    lines.forEach((line, index) => {
      line = normalizeText(line);
  
      if (line.includes("Data File Name")) data["Data File Name"] = line.match(/C:\\.*$/)[0] || "";
      else if (line.includes("Method File Name")) data["Method File Name"] = line.match(/C:\\.*$/)[0] || "";
      else if (line.includes("Batch File Name")) data["Batch File Name"] = line.match(/C:\\.*$/)[0] || "";
      else if (line.includes("Report File Name")) data["Report File Name"] = line.match(/C:\\.*$/)[0] || "";
      else if (line.includes("Analista")) data["Analista"] = line.split(":")[1]?.trim() || "";
      else if (line.includes("Data Acquired")) data["Data Acquired"] = parseDate(line.match(/\d{2}\/\d{2}\/\d{4}.*$/)?.[0]?.trim()) || "";
      else if (line.includes("Data Processed")) data["Data Processed"] =parseDate(line.match(/\d{2}\/\d{2}\/\d{4}.*$/)?.[0]?.trim())  || "";
      else if (line.includes("Vial")) data["Vial"] = line.split(":")[1]?.trim() || "";
      else if (line.includes("Vol. Inyección")) data["Vol. Inyección"] = line.split(":")[1]?.trim() || "";
      else if (index > 0 && lines[index - 1].includes("Analista")) data["Sample Name"] = line.trim(); 
      else if (line.includes("Peak#")) isPeakSection = true; // Marca el inicio de los picos
      else if (isPeakSection && line.trim() !== "") {
        // Extraer datos de picos
        const peakData = line.trim().split(/\s+/);
        if (peakData.length >= 6) {
          peaks.push({
            "Peak#": peakData[0],
            "Name": peakData[1],
            "Ret. Time": peakData[2],
            "Area": peakData[3],
            "Theoretical Plate": peakData[4],
            "Tailing": peakData[5],
            "Resolution": peakData[6] || "--"
          });
        }
      }
    });
  
    data["Peaks"] = peaks;
    return data;
  }


  function parseDate(rawDate){
    if (rawDate){
      let fecha = parse(rawDate, "dd/MM/yyyy hh:mm:ss a", new Date(), { locale: es });
      return (fecha);
      
    }

    
  }



module.exports = { estructurarPdfData,parseChromatogram };




