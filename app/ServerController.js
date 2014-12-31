// ServerController.js
// This contains the server-side controller for jstdgame.
// The ServerController uses websockets to relay communications with the
//  browser, interface with the database, and drive server-generated game events


var WebSocketServer = require('ws').Server;
var ObjectController = require('./ObjectController');

"use strict";

// This is the JavaScript controller object for the game
var server_controller = function ServerController(parent)
{
	//private members
	var m_this = this;
	var m_parent = parent;		//ref to top-level GameServer
	var m_port;					//listening port for websockets
	var m_server;				//WebSocketServer object
	var m_sessions = {};		//maps session ids to websocket objects
	var m_object_controller = new ObjectController(this, m_parent.model);

	//private methods

	// generic callback to send a response for any websocket requests
	var send_reply = function(request, response)
	{
		var message = JSON.stringify(response);
		console.log('sending reply %s', message);
		request.socket.send(message);
	}

	// checks the request type for incoming messages and routes them 
	// to the appropriate handler function
	var route_messages = function(socket, message)
	{
		var request = {};
		request.socket = socket;
		request.message = JSON.parse(message);
		if (request.message.method == 'SETUP')
		{
			new_session(request, send_reply);
		}
		else if (request.message.method == 'RESUME')
		{
			resume_session(request, send_reply);
		}
		else if (request.message.method == 'MOUSE')
		{
			handle_mouse(request, send_reply);
		}
		console.log('received %s', message);
	}

	// randomly generates a locally unique request id (32-bit),
	// checking for duplicates in the database and inserting if unique
	var generate_session_id = function(callback)
	{
		var unique_id = Math.floor(Math.random() * 0xffffffff).toString(16);
		var session_object = {id: unique_id};
		m_parent.model.count('sessions', session_object, function(error, count)
		{
			if (count != 0)
				generate_session_id(callback);
			else
			{
				m_parent.model.insert('sessions', session_object, 
				function(error, results)
				{
					callback(unique_id);
				});
			}
		});
	}

	var spawn_initial_objects = function(session_id, dimensions)
	{
		var init_pos = [dimensions.width/2, dimensions.height/2];
		var init_vel = [0,0];
		m_object_controller.spawn(session_id, "base", init_pos, init_vel);
		init_pos = [dimensions.width/2, 0];
		init_vel = [0, 20];
		m_object_controller.spawn(session_id, "foe", init_pos, init_vel);
		init_pos = [0, dimensions.height/2];
		init_vel = [20, 0];
		m_object_controller.spawn(session_id, "foe", init_pos, init_vel);
	}

	// for setup requests, we need to generate a new session objects
	// and insert them into the database
	var new_session = function(request, callback)
	{
		//create unique session id
		var response = {};
		generate_session_id(function(session_id)
		{
			m_sessions[session_id] = { socket: request.socket, id: session_id };
			response.session_id = session_id;
			response.action = "setup";
			callback(request, response);
			var dimensions_object =
			{
				session_id: session_id,
				width: request.message.width,
				height: request.message.height
			};
			m_parent.model.insert('dimensions', dimensions_object, function()
			{
				spawn_initial_objects(session_id, request.message);
			});

		});
	}

	// Assosicates session_id with the socket connection and 
	//  finds existing session objects and resume updating
	var resume_session = function(request, callback)
	{
		var session_id = request.message.session_id;
		m_sessions[session_id] = { socket: request.socket, id: session_id };
		var session_object = {id: session_id};
		m_parent.model.count('objects', session_object, function(error, count)
		{
			var response = { session_id: session_id, action: "resume" };
			if (error || count < 1)
			{
				response.action = "resume_fail";
			}
			else
			{
				m_object_controller.resume(session_id);
			}
			callback(request, response);
		});
	}

	// Handles user mouse events from the browser
	var handle_mouse = function(request, callback)
	{
		var response = {status: "OK", action: "mouse" };
		m_object_controller.check_hits(request.message);
		callback(request, response);
	}

	//public methods

	// Called from parent to initialize socket communications and handlers
	this.start = function(port)
	{
		m_port = port;
		m_server = new WebSocketServer({port: port});
		console.log('WebSocket server listing on port ' + m_port);
		m_server.on('connection', function(socket)
		{
			socket.on('message', function(message)
			{
				route_messages(socket, message);
			});
			socket.on('close', function()
			{
				console.log('connection closed');
				for (var session_index in m_sessions)
				{
					if (m_sessions[session_index].socket == socket)
					{
						m_object_controller.disconnect(session_index);
						delete m_sessions[session_index];
					}
				}
			});
		});
	}

	// Called from children controllers to send update messages to the client
	this.send_update = function(session_id, update)
	{
		var message = JSON.stringify(update);
		if (session_id in m_sessions)
		{
			m_sessions[session_id].socket.send(message, function(error)
			{
				if (error)
				{
					console.log(error);
				}
			});
		}
	}

}

module.exports = server_controller;
