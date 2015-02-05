var config = require('./lib/config');
var HipChat = require('./lib/hipchat').HipChat;
var hc = new HipChat(config.hipchat);
var Handlebars = require('handlebars');
var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');
var utils = require('./lib/utils');

Handlebars.registerHelper('inspect', function(obj, url) {
  return new Handlebars.SafeString(JSON.stringify(obj));
});

var Hapi = require('hapi');

var tails = config.tails;

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

var hipchatHandler = function(request, reply){
  var payload = request.payload;
  var msg = payload;
  var template = (events[(request.payload.event||'default').toLowerCase()]||events.default).hipchat;
  if(template){
    var args = request.payload.data||request.payload;
    args.tail = args.tail || tails[~~(Math.random()*tails.length)];
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
  }
  return hc.send(msg, function(err, status){
      if(status){
        status.response = msg.message||msg;
      }
      return reply(err||status);
    });
};

var server = new Hapi.Server();
server.connection({ port: config.web.port });

server.start(function () {
    console.log('Server running at:', server.info.uri);
  });

server.route([
    {
      method: 'POST',
      path: '/api/v1/hipchat',
      handler: hipchatHandler
    },
    {
      method: 'POST',
      path: '/api/v1/notification',
      handler: hipchatHandler
    },
  ]);
