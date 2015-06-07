var express = require('express');
var app = express();

// Stack of locations where users can sit... Note, for simplicities sake, this is kept to a maximum of 5.
var locations = [
              {'x': -350, 'y': 0, 'z': 500},
              {'x': 350, 'y': 0, 'z': 500},
              {'x': -350, 'y': 0, 'z': 800},
              {'x': 350, 'y': 0, 'z': 800},
              {'x': 0, 'y': 0, 'z': 800}
            ];

var users = {};

app.use(express.static('public'));

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("access-control-allow-methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

var server = app.listen('3000', function () {
  var host = server.address().address
  var port = server.address().port
  console.log('Listening at http://%s:%s', host, port)
});
var io = require('socket.io')(server);

app.get('/', function (req, res) {
  res.sendfile('./index.html');
});

io.on('connection', function (socket) {
  var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
      return v.toString(16);
  });

  if (locations.length > 0) {
    var location = locations.pop();
    users[uuid] = location;

    io.emit('uuid', { "uuid": uuid, "location": location });
  }

  socket.emit('currentUsers', users); 

  socket.on('message', function (data) {
    io.emit('incoming', data);
  });
});