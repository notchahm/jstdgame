// game_server.js
// This contains the server-side javascript object for jstdgame.
// It initializes and stores the three components in an MVC architecture


var ServerModel = require('./ServerModel');
var ServerView = require('./ServerView');
var ServerController = require('./ServerController');

"use strict";

// This is the top-level JavaScript object for the game
function GameServer(port)
{
    this.model = new ServerModel(this);
	this.model.start();
    this.view = new ServerView(this);
	this.view.start(port);
    this.controller = new ServerController(this);
	this.controller.start(port + 1);
}

var server = new GameServer(8888);
