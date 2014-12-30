// ServerView.js
// This contains the server-side view component of jstdgame
// The view is implemented as a static set of html/js/css 
//  documents that are served up the the requesting browser


var express = require('express');

"use strict";

// This is the top-level JavaScript object for the game
var server_view = function ServerView(parent)
{
	//private members
	var m_parent = parent
	var m_http_port = 8888;
	var m_app = express();

	//public methods
	this.start = function(port)
	{
		m_http_port = port;
		m_app.use('/', express.static(__dirname + '/../public'));
		console.log(__dirname + '/../public');
		m_app.listen(m_http_port);
		console.log('HTTP server listening on port ' + m_http_port);
	}
}

module.exports = server_view;
