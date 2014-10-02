// game_server.js
// This contains the server-side javascript code for jstdgame.
// Currently this simply uses express to serve static content, but more will
//  be done here later


var os = require('os')
var express = require('express');

"use strict";

var port = 8888;
var app = express();
//app.use(body_parser.urlencoded({extended:false})); // to support URL-encoded bodies
app.use('/', express.static(__dirname + '/public'));
app.listen(port);
console.log('info', 'Listening on port ' + port);
