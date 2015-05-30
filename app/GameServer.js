// game_server.js
// This contains the server-side javascript object for jstdgame.
// It initializes and stores the three components in an MVC architecture

var ServerModel = require('./ServerModel');
var ServerView = require('./ServerView');
var ServerController = require('./ServerController');

// This is the top-level JavaScript object for the game
function GameServer(port)
{
	"use strict";

    this.model = new ServerModel(this);
	this.model.start();
    this.view = new ServerView(this);
	this.view.start(port);
    this.controller = new ServerController(this);
	this.controller.start(port + 1);
}

module.exports =  new GameServer(8888);

