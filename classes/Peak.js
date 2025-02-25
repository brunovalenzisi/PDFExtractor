class Peak{
    #id;
    #name;
    #retTime;
    #area;
    #plates;
    #tailing;
    resolution;
    
    constructor(nPeak){
    this.#id=nPeak;
    }
    
    setId(id){
        this.#id=id;
    };
    
    getId(){
        return this.#id;
    };
    
    setName(name){
        this.#name=name;
    };
    
    getName(){
        return this.#name;
    };
    
    setRetTime(retTime){
        this.#retTime=retTime;
    };
    
    getRetTime(){
        return this.#retTime;
    };
    
    setArea(area){
        this.#area=area;
    };
    
    getArea(){
        return this.#area;
    };
    
    setPlates(plates){
        this.#plates=plates;
    };
    
    getPlates(){
        return this.#plates;
    };
    
    setTailing(tailing){
        this.#tailing=tailing;
    };
    
    getTailing(){
        return this.#tailing;
    };
    
    setResolution(resolution){
        this.resolution=resolution;
    }
    
    getResolution(){
        return this.resolution;
    }
    
    }

    module.exports = {Peak};