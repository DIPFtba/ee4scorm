const fs = require("fs");
const AdmZip = require('adm-zip');
const path = require("path");
const _ = require("lodash");

class Item{
        
    constructor(zip, itemName){                
        
        if(!zip || !itemName){
            throw new Error(`Item: missing parameters`);
        }
        this.zipFile = null;
        this.itemName = !!itemName ? itemName : "";
        this.data = {};
        
        this.includeDirs = new Set(["resources", "system-resources", "external-resources"]);
        this.essentialFiles = [];
        
        this.parse(zip, itemName);
    }

    getName(){
        return _.clone(this.itemName);
    }
    
    getData(){
        return _.clone(this.data);        
    }
    
    parse(zip, itemName){

        let jsonFile = !!zip.getEntry(itemName+".json") ? zip.getEntry(itemName+".json") : zip.getEntry("config.json");
        if(!jsonFile)
            throw new Error(`Invalid item "${itemName}" does not contain a valid config file`);

        let jsonData =  JSON.parse(zip.readAsText(jsonFile)); 
        if(_.isObject(jsonData)){
            this.itemName = jsonData?.name ? jsonData.name : itemName;
            this.zipFile = zip;
            this.data = jsonData;
            this.version = jsonData.runtimeCompatibilityVersion;

            this.essentialFiles.push(jsonFile.name);

            if(zip.getEntry("internal.json"))
                this.essentialFiles.push("internal.json");

            let stimulusFile = "stimulus.json";
            if(zip.getEntry(stimulusFile)){
                this.essentialFiles.push(stimulusFile);
                let stimulusData = JSON.parse(zip.readAsText(zip.getEntry(stimulusFile)));
                if(_.isObject(stimulusData)){
                    if(_.isArray(stimulusData.resources))
                        stimulusData.resources.forEach(e => {
                            if(_.isString(e.pathInZip)){
                                // this.essentialFiles.push(path.normalize(e.pathInZip).replaceAll('/', '\\'));
                                this.essentialFiles.push(e.pathInZip.replace(/\\/gi, '/'));
                            }
                        });
                }
            }
        }
        else
            throw new Error(`Invalid item ${itenName}: cant parse ${jsonFile.name}`);

        zip.getEntries().forEach(function(entry) {
            // let dir = path.dirname(entry.entryName);
            // let dir = path.dirname(entry.entryName).split(path.sep)[0];
            let dir = path.dirname(entry.entryName).split("/")[0];
            if(this.includeDirs.has(dir)){
            // let _path = path.normalize(entry.entryName).replaceAll('/', '\\');
            let _path = entry.entryName;
                if(this.essentialFiles.indexOf(_path) < 0)
                    this.essentialFiles.push(_path);
            }
        }.bind(this));
    }

    getTaoConfig(){        
        return {
            name: this.itemName,
            version: this.version,
            tasks: this.data["tasks"].map(e => {
                if(!e["name"] || isNaN(e["itemWidth"]) || isNaN(e["itemHeight"]))
                    throw new Error(`Invalid item ${this.itenName}: does not contain valid task definitions`);
                return _.assign({}, {name: e["name"], width: e["itemWidth"], height: e["itemHeight"]});
            })
        };
    }

    getFileList(){
        return _.clone(this.essentialFiles);
    }

    //create a new zip file only including essential files / resources
    extractEssentials(dir_out){
        
        if(!fs.existsSync(dir_out))
            return false;

        let _path = path.join(dir_out, this.itemName);
        for(let i of this.essentialFiles){
            let entry = this.zipFile.getEntry(i);
            // console.log(i);
            if(!!entry)
                this.zipFile.extractEntryTo(entry, _path, true, true);
            else
                console.error('zip entry doesnt exist: ' + i);
        }
    }
}


class ItemManager{
        
    constructor(sourceDir, sortCallback){
    
        this.items = new Map();
        this.entryPoint = {item: "", task: ""};
        this.modifiers = new Map();
        
        if(!fs.existsSync(sourceDir))
            throw new Error (`invalid source directory: ${sourceDir}`);
                    
        let items = fs.readdirSync(sourceDir);
        if(!items.length)
            throw new Error (`empty directory: ${sourceDir}`);

        if(typeof sortCallback == "function"){
            items = items.sort(sortCallback);
        }
            
        let c = 0;
        for(let idx in items){
            let ref = path.join(sourceDir, items[idx]);
            if(fs.lstatSync(ref).isDirectory())
                continue;
            let name = path.basename(ref,".zip");
            var zip = new AdmZip(ref);
            let item = new Item(zip, name);
            this.items.set(name, item);
            if(c==0){
                this.setEntryPoint(name);
            }
            c++;
        }                    
    }
    
    setEntryPoint(_item){
        if(typeof _item == "undefined"){
            let conf = this.getTaoConfig();
            this.setEntryPoint(conf.items[0].name);
        }
        if(!this.items.has(_item)){
            return this;
        }
        let item = this.items.get(_item);
        this.entryPoint = {item: item.getName(), task: item.getData().tasks[0].name};
        return this;
    }

    setModifier(opt){

        if(!_.isObject(opt))
            return false;
        
        for(let i of Object.keys(opt)){

            if(i == "order" && _.isArray(opt[i]) && opt[i].length == this.items.size){
                for(let itemName of opt[i]){
                    if(!_.isString(itemName) || !this.items.has(itemName)){
                        throw new Error (`modifier order: param needs to be array of item-names`);
                    }
                }
                this.modifiers.set(i, {
                    fn: (conf, params) => {
                        let tmp = [];
                        for(let i of params[0]){
                            for(let j of conf.items){
                                if(j.name == i){
                                    tmp.push(j);
                                    break;
                                }
                            }
                        }
                        conf.items = tmp;
                        return conf;
                    },
                    params: [opt[i]]
                });
            }
        }
        return true;
    }

    getFileList(){
        if(!this.items.size)
            return null;
        let _tmp = new Map();
        this.items.forEach( i => {
            _tmp.set(i.getName(), i.getFileList());
        });
        return _tmp;
    }

    getTaoConfig(_mod){
        let mod = typeof _mod  == "boolean"  ?  _mod : true;
        if(!this.items.size)
            return null;
        let conf = {
            default: this.entryPoint,
            items: []
        }
        for(var [idx,i] of this.items){
            conf.items.push(i.getTaoConfig());
        }

        if(mod && this.modifiers.size){
            // for(let i of this.modifiers.get){
            this.modifiers.forEach( i =>{
                conf = i.fn(conf, i.params);
            });
        }
        
        return conf;
    }

    getNagarroConfig(_scope){
        let scope = typeof _scope  == "string"  ?  _scope : "A";
        if(!this.items.size)
            return null;
        let conf = {
            tasks: []
        }
        for(var [idx,i] of this.items){
            let item = i.getTaoConfig();
            conf.tasks = conf.tasks.concat(item.tasks.map((t) => {
                return {"item": item.name, "task": t.name, "scope": scope};
            }));
        }
        
        return conf;        
    }

    getItemConfig(_basePath){
        let basePath = !!_basePath ? _basePath : "../content/items/";
        let tmp = [];
        for(var [idx,i] of this.items){
            tmp.push ({
                "resourcePath": path.join(basePath, idx,  "resources").replaceAll('\\', '/')+"/",
                "externalResourcePath": path.join(basePath, idx, "external-resources").replaceAll('\\', '/')+"/",
                // "resourcePath": basePath + idx + "/resources/",   
                // "externalResourcePath": basePath + idx + "/external-resources/",
                "config": i.getData()
            });
        }
        return tmp;
    }

    extractEssentials(dir_out){
        this.items.forEach(i => i.extractEssentials(dir_out));
    }
}


module.exports = {Item, ItemManager};