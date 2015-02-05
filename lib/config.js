var configFile = require('../config');
var fs = require('fs');
var extend = require('./utils').extend;

if(fs.existsSync('./.env')){
  var lines = fs.readFileSync('./.env').toString().split(/(\r\n|\n\r|\n|\r)/);
  lines.forEach(function(line){
    if(line && !/^\s*\#/i.test(line)){
      var parts = line.split('='),
        key = parts.shift(),
        value = parts.join('=');
      if(key){
        process.env[key]=value;
      }
    }
  });
}

var linkEnvValues = function(obj){
  var res = {};
  if(typeof(obj)!=='object'){
    return obj;
  }
  if(obj instanceof Array){
    var arr = [];
    obj.forEach(function(entry){
      arr.push(linkEnvValues(entry));
    });
    return arr;
  }
  if(typeof(obj.$env)==='string'){
    return process.env[obj.$env]||obj.$def;
  }
  var keys = Object.keys(obj);
  keys.forEach(function(key){
    res[key] = linkEnvValues(obj[key]);
  });
  return res;
};


var commandLineArgs = (function(){
  var name, tmp, values={};
  var reCmdLineStrip=/^(\-|\\|\/)*/i;
  for(i = 2; i < process.argv.length; i++){
    tmp = process.argv[i].replace(reCmdLineStrip, '').split('=');
    name = tmp.shift();
    if(tmp.length>0){
      val = tmp.join('=');
    }else{
      val = true;
    }
    tmp = values;
    names = name.split('.');
    while(names.length>1){
      name = names.shift();
      tmp = tmp[name]=tmp[name]||{};
    }
    tmp[names.shift()]=val;
  }
  return values;
})();

var env = commandLineArgs.env || commandLineArgs.mode || process.env.NODE_ENV;
var envLookup = {
  prd: 'production',
  dev: 'development',
  stg: 'stage',
  rel: 'release'
};
env = env?envLookup[env] || env:'development'

var config = configFile.default;
if(configFile[env]){
  config = extend(true, config, configFile[env]);
}

module.exports = config;
