var config = require('./lib/config');
var HipChat = require('./lib/hipchat').HipChat;
var Mailer = require('./lib/email').Mailer;
var hc = new HipChat(config.hipchat);
var mailer = new Mailer(config.email);
var Handlebars = require('handlebars');
var utils = require('./lib/utils');
var async = require('async');

Handlebars.registerHelper('inspect', function(obj, url) {
  return new Handlebars.SafeString(JSON.stringify(obj));
});

var Hapi = require('hapi');

var tails = config.tails||[];

var compileTemplates = function(source){
  var templates = {};
  Object.keys(source).forEach(function(key){
    if(typeof(source[key])==='string'){
      return templates[key] = Handlebars.compile(source[key]);
    }
    templates[key] = compileTemplates(source[key]);
  });
  return templates;
};

var events = (function(){
  var events = {};
  Object.keys(config.events).forEach(function(key){
    events[key] = compileTemplates(config.events[key]);
  });
  return events;
})();

var sendHipchat = function(options, callback){
  var template = options.template;
  var args = options.args;
  var msg;

  if(typeof(template)==='object'){
    msg = utils.extend(true, {}, template);
    Object.keys(msg).forEach(function(key){
      if(typeof(template[key])==='function'){
        msg[key] = template[key](args);
      }
    });
  }
  if(typeof(template)==='string'){
    msg = template(args);
  }

  if(!msg){
    return callback({error: 'Template is not valid!'});
  }
  return hc.send(msg, function(err, status){
      if(status){
        status.response = msg.message||msg;
        status.room = msg.room_id||config.hipchat.room_id;
        status.color = msg.color||config.hipchat.color;
        status.from = msg.from||msg.sender||config.hipchat.from||config.email.sender;
      }
      return callback(err, status);
    });
};

var sendEmail = function(options, callback){
  var template = options.template;
  var args = options.args;
  var msg;

  if(typeof(template)==='object'){
    msg = utils.extend(true, {}, template);
    Object.keys(msg).forEach(function(key){
      if(typeof(template[key])==='function'){
        msg[key] = template[key](args);
      }
    });
  }
  if(typeof(template)==='string'){
    msg = template(args);
  }

  if(!msg){
    return callback({error: 'Template is not valid!'});
  }
  return mailer.send(msg, function(err, status){
    if(status){
      status.subject = msg.subject;
      status.html = msg.html;
      status.text = msg.text;
      status.room = msg.room_id||config.hipchat.room_id;
      status.color = msg.color||config.hipchat.color;
      status.to = msg.to||config.email.to;
      status.from = msg.from||config.email.from;
    }
    return callback(err, status);
  });
};

var hipchatHandler = function(request, reply){
  var payload = request.payload;
  var msg = payload;
  var template = (events[(request.payload.event||'default').toLowerCase()]||events.default).hipchat;
  if(!template){
    return reply('No hipchat message specified for event "'+(request.payload.event||'default')+'"');
  }
  var args = request.payload.data||request.payload;
  args.tail = args.tail || tails[~~(Math.random()*tails.length)];

  sendHipchat({
    template: template,
    args: args
  }, function(err, status){
    return reply(err||status);
  });
};

var emailHandler = function(request, reply){
  var payload = request.payload;
  var msg = payload;
  var template = (events[(request.payload.event||'default').toLowerCase()]||events.default).email;
  if(!template){
    return reply('No email specified for event "'+(request.payload.event||'default')+'"');
  }
  var args = request.payload.data||request.payload;
  args.tail = args.tail || tails[~~(Math.random()*tails.length)];

  sendEmail({
    template: template,
    args: args
  }, function(err, status){
    return reply(err||status);
  });
};

var notificationHandler = function(request, reply){
  var payload = request.payload;
  var msg = payload;
  var templates = (events[(request.payload.event||'default').toLowerCase()]||events.default);
  var args = request.payload.data||request.payload;
  args.tail = args.tail || tails[~~(Math.random()*tails.length)];

  var tasks = {};
  if(templates.email){
    tasks.email = function(cb){
      sendEmail({
        template: templates.email,
        args: args
      }, function(err, status){
        return cb(null, err||status);
      });
    };
  }

  if(templates.hipchat){
    tasks.hipchat = function(cb){
      sendHipchat({
        template: templates.hipchat,
        args: args
      }, function(err, status){
        return cb(null, err||status);
      });
    };
  }

  async.parallel(tasks, function(err, res){
    return reply(err||res);
  });
};

var server = new Hapi.Server();
server.connection({ port: config.web.port });

server.start(function(){
    console.log('Server running at:', server.info.uri);
  });

server.on('request-error', function(info, err){
  console.log(err);
  if(err.stack){
    console.log(err.stack);
  }
});

server.route([
    {
      method: 'POST',
      path: '/api/v1/hipchat',
      handler: hipchatHandler
    },
    {
      method: 'POST',
      path: '/api/v1/email',
      handler: emailHandler
    },
    {
      method: 'POST',
      path: '/api/v1/notification',
      handler: notificationHandler
    },
  ]);
