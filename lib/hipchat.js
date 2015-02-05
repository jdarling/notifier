var request = require('request');
var noop = function(){};

var VALID_COLORS = [
  'green',
  'yellow',
  'red',
  'purple',
  'gray',
  'random'
];

var getValidColor = function(color){
  color = (color+'').toLowerCase();
  if(color === 'grey'){
    color = 'gray';
  }
  if(VALID_COLORS.indexOf(color)===-1){
    color = 'random';
  }
  return color;
};

var requiredFields = [
    'token',
    'room_id',
    'from',
    'message'
  ];
var getDataErrors = function(data){
  var errors = requiredFields.map(function(key){
    if(!data[key]){
      return new Error('Required field "'+key+'" not provided.');
    }
    return false;
  }).filter(function(v){
    return !!v;
  });
  return errors.length===0?false:errors;
};

var HipChat = function(options){
  this.options = options||{};
};

HipChat.prototype.send = function(options, callback){
  var config = this.options||{};
  if(typeof(options)==='string'){
    options = {
      message: options
    };
  }
  var authToken = (options.token||config.token);
  callback = callback || options.callback || noop;
  var data = {
    token: authToken,
    room_id: options.room||config.room,
    from: options.from||options.sender||config.from||config.sender,
    message: options.message,
    color: getValidColor(options.color||config.color||'random')
  };
  var errs = getDataErrors(data);
  if(errs){
    return callback(errs);
  }
  request({
    method: 'POST',
    url: 'https://api.hipchat.com/v1/rooms/message?format=json&auth_token='+authToken,
    form: data
  }, function(err, response, body){
    if(err){
      return callback(err);
    }
    try{
      body = JSON.parse(body);
    }catch(e){}
    return callback(err, body);
  });
};

module.exports = {
  VALID_COLORS: VALID_COLORS,
  HipChat: HipChat,
};
