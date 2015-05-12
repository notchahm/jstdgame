// game_server.js
// This contains the server-side javascript object for jstdgame.
// It initializes and stores the three components in an MVC architecture


var ServerModel = require('./ServerModel');

"use strict";

var model = new ServerModel(this);
model.start(function()
{
	model.clear('objects');
	model.clear('sessions');
	model.clear('dimensions');
	process.exit();
});
