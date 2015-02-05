var uuid = require('node-uuid').v4;
var TIMEOUT = 1000;

var dumpIgnore = ['logger', 'connection'];
var dumpError = function(error, options){
  var args = arguments.length>1?Array.prototype.slice.call(arguments, 1):[];
  var pkt = {msg: ''};
  args.forEach(function(arg, index){
    if(typeof(arg) === 'object'){
      return Object.keys(arg).forEach(function(key){
        var ignore = index === 0?dumpIgnore.indexOf(key) > -1:false;
        if((!ignore) && typeof(arg[key])!=='function'){
          pkt[key] = arg[key];
        }
      });
    }
    pkt.msg += arg + '\t';
  });
  pkt.msg = pkt.msg.trim();
  pkt.error = {
    message: error.toString?error.toString():error,
    collection: options.collectionName,
    environment: options.config.id
  }
  if(error.stack){
    pkt.error.stack = error.stack;
  }
  options.logger.error(pkt);
};

var watchCollection = function(options){
  var env = options.config.id;
  var handleResponse = function(rec, cursor, cursorFixId){
    if(rec.id===cursorFixId){
      return next(cursor, cursorFixId);
    }
    if(rec.level){
      options.sockets.broadcast('event', rec);
    }
    return next(cursor, cursorFixId);
  };

  var next = function(cursor, cursorFixId){
    if(options.closed){
      options.logger.info('Closing: '+options.config.id);
      return;
    }
    cursor.nextObject(function(err, record){
      if(err){
        //options.logger.error({environment: options.config.id, collection: options.collectionName, error: err});
        dumpError(err, options, {environment: options.config.id, collection: options.collectionName});
        return next(cursor, cursorFixId);
      }
      if(!record){
        //return process.nextTick(function(){
          return next(cursor, cursorFixId);
        //});
      }
      if(record.fixId){
        return process.nextTick(function(){
          return next(cursor, cursorFixId);
        });
      }
      return process.nextTick(function(){
        return handleResponse(record, cursor, cursorFixId);
      });
    });
  };

  options.collectionName = options.config.cappedCollection||('event-'+(options.config.collection||'logs'));
  options.connection.db.collection(options.collectionName, function(err, collection){
    if(err){
      //options.logger.error({environment: options.config.id, collection: options.collectionName, col: collection, error: err});
      dumpError(err, options, {environment: options.config.id, collection: options.collectionName, col: collection});
      return setTimeout(function(){
        return watchCollection(options);
      }, TIMEOUT);
    }

    var fixRecord = options.fixRecord || (options.fixRecord = {
                      fixId: uuid(),
                      inserted: new Date()
                    });
    collection.insert(fixRecord, function(err){
      if(err){
        return setTimeout(function(){
          return watchCollection(options);
        }, TIMEOUT);
      }
      collection.findOne({fixId: fixRecord.fixId}, function(err, doc){
        if(err){
          return setTimeout(function(){
            return watchCollection(options);
          }, TIMEOUT);
        }
        var filter = {$or: [{fixId: fixRecord.fixId}, {time: {$gte: new Date(doc.inserted)}}]};
        var opts = {tailable: true};
        collection.find(filter, opts, function(err, cursor){
          if(err){
            //options.logger.error({environment: options.config.id, collection: options.collectionName, col: collection, error: err});
            dumpError(err, options, {environment: options.config.id, collection: options.collectionName, col: collection});
            return setTimeout(function(){
              return watchCollection(options);
            }, TIMEOUT);
          }
          next(cursor, fixRecord.fixId);
        });
      });
    });
  });
  return options;
};

var waitForConnection = function(options){
  var connectTo = function connectTo(){
    options.logger.info('Logs Monitor Retry '+options.config.connectionString);
    return options.getConnection(options.config, function(err, connection){
      if(err){
        //options.logger.error({environment: options.config.id, collection: options.collectionName, connection: connection, error: err});
        dumpError(err, options, {environment: options.config.id, collection: options.collectionName, connection: connection});
      }
      options.connection = connection;
      return Monitor(options);
    });
  };
  if(options.closed){
    return options;
  }
  //setTimeout(connectTo, TIMEOUT);
  connectTo();
  return options;
};

var Monitor = function(options){
  var config = options.config;
  options.close = options.close || function(){
    options.closed = true;
  };
  if(options.closed){
    return options;
  }
  if(!options.connection){
    return process.nextTick(function(){
      return waitForConnection(options);
    });
  }
  return process.nextTick(function(){
    return watchCollection(options);
  });
};

module.exports = Monitor;
