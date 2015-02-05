var noop = function(){};
var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');
var utils = require('./utils');

var Mailer = function(options){
  this.options = options||{};
  this.transport = nodemailer.createTransport(smtpTransport(this.options));
};

Mailer.prototype.send = function(options, callback){
  var config = this.options||{};
  if(typeof(options)==='string'){
    options = {
      body: options
    };
    options.subject = options.body.substr(0, 100);
  }
  callback = callback || options.callback || noop;
  var opts = utils.extend(true, {}, options, this.options);
  this.transport.sendMail(opts, callback);
};

module.exports = {
  Mailer: Mailer
};
