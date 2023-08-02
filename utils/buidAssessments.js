const fs = require("fs");
const path = require("path");
const _ = require("lodash");
const AdmZip = require('adm-zip');
const { ItemManager, Item } = require("./Item");

function getConfig(basepath){
    
    if(!fs.existsSync(basepath))
        return false;

    let conf = {};
    let mgr = null;

    let zipfile = fs.readdirSync(basepath)
    .filter(filename => {
        return filename.indexOf(".zip") > 0;
    });

    if(zipfile.length>0){                    
        mgr = new ItemManager(basepath);
        conf = mgr.getNagarroConfig();
    }

    return {conf: conf, itmmgr: mgr}
}




let basepath = path.join(__dirname, "..", "public", "items");
console.log(basepath);
const {conf, itmmgr} = getConfig(basepath);
itmmgr.extractEssentials(path.join(__dirname, "..", "public", "items"));
fs.writeFileSync(path.join(__dirname, "..", "public", "assessments", "config.json"), JSON.stringify(conf));
