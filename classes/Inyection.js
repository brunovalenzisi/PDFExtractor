class Inyection {
#chromatograms=[];;
#id;
#date
#hour;
#vial;
#vol;
#dataFileName;
#methodFileName;
#batchFileName;
#batchFileName;
#reportFileName;
#analista;
#sampleName;

constructor(nInyeccion){
this.#id=nInyeccion;
}


addChromatogram(chromatogram){
    this.#chromatograms.push(chromatogram)
}
getchromatograms(){
    return this.#chromatograms;
}

getId(){
    return this.#id;
}
setDate(date){
this.#date=date;
}
getDate(){
    return this.#date;
}

setHour(hour){
    this.#hour=hour;
}

getHour(){
    return this.#hour;
}

setVial(vial){
    this.#vial=vial;
}

getVial(){
    return this.#vial;
}

setVol(vol){
    this.#vol=vol;
}

getVol(){
    return this.#vol;
}

setDataFileName(dataFileName){
    this.#dataFileName=dataFileName;
}

getDataFileName(){
    return this.#dataFileName;
}

setMethodFileName(methodFileName){
    this.#methodFileName=methodFileName;
}

getMethodFileName(){
    return this.#methodFileName;
}

setBatchFileName(batchFileName){
    this.#batchFileName=batchFileName;
}

getBatchFileName(){
    return this.#batchFileName;
}

setBatchFileName(batchFileName){
    this.#batchFileName=batchFileName;
}

getBatchFileName(){
    return this.#batchFileName;
}

setReportFileName(reportFileName){
    this.#reportFileName=reportFileName;
}

getReportFileName(){
    return this.#reportFileName;
}

setAnalista(analista){
    this.#analista=analista;
}

getAnalista(){
    return this.#analista;
}

setSampleName(sampleName){
    this.#sampleName=sampleName;
}

getSampleName(){
    return this.#sampleName;
}
}