// ServerController.js
// This contains the server-side controller for jstdgame.
// The ServerController uses websockets to relay communications with the
//  browser, interface with the database, and drive server-generated game events

var WebSocketServer = require('ws').Server;
var ObjectController = require('./ObjectController');

// This is the JavaScript controller object for the game
var server_controller = function ServerController(parent)
{
	"use strict";

	//private members
	var m_this = this;
	var m_parent = parent;		//ref to top-level GameServer
	var m_port;					//listening port for websockets
	var m_server;				//WebSocketServer object
	var m_sessions = {};		//maps session ids to websocket objects
	var m_object_controller = new ObjectController(this, m_parent.model);
	var m_session_model = parent.model.get_session_model();

	//constants
	var BLOCKS_PER_COLUMN = 128;

	//private methods

	// generic callback to send a response for any websocket requests
	var send_reply = function(request, response)
	{
		var message = JSON.stringify(response);
//		console.log('sending reply %s', message);
		request.socket.send(message);
	};

	// checks the request type for incoming messages and routes them 
	// to the appropriate handler function
	var route_messages = function(socket, message)
	{
		var request = {};
		request.socket = socket;
		try
		{
			request.message = JSON.parse(message);
		}
		catch (e)
		{
			var response = {session_id: request.session_id, error: "invalid request mesage"};
			send_reply(request, response);
			return;
		}
		if (request.message.method === 'SETUP')
		{
			new_session(request, send_reply);
		}
		else if (request.message.method === 'RESUME')
		{
			resume_session(request, send_reply);
		}
		else if (request.message.method === 'MOUSE')
		{
			handle_mouse(request, send_reply);
		}
		//console.log('received %s', message);
	};

	// randomly generates a locally unique request id (32-bit),
	// checking for duplicates in the database and inserting if unique
	var generate_session = function(aspect_ratio, callback)
	{
		var unique_id = Math.floor(Math.random() * 0xffffffff).toString(16);
		var session_object =
		{
			id: unique_id,
			height: BLOCKS_PER_COLUMN,
			width: BLOCKS_PER_COLUMN * aspect_ratio
		};
		m_session_model.get_count(unique_id, function(error, count)
		{
			if (count !== 0)
			{
				generate_session(aspect_ratio, callback);
			}
			else
			{
				m_session_model.add( session_object, function(error, results)
				{
					if (!error && results.length > 0)
					{
						callback(session_object);
					}
				});
			}
		});
	};

	var spawn_initial_objects = function(session)
	{
		var session_id = session.id;
		var init_pos = [session.width/2, session.height/2];
		var init_vel = [0,0];
		m_object_controller.spawn(session_id, "base", init_pos, init_vel);
		init_pos = [session.width/2, 0];
		init_vel = [0, 3];
		m_object_controller.spawn(session_id, "foe", init_pos, init_vel);
		init_pos = [0, session.height/2];
		init_vel = [3, 0];
		m_object_controller.spawn(session_id, "foe", init_pos, init_vel);
	};

	// for setup requests, we need to generate a new session objects
	// and insert them into the database
	var new_session = function(request, callback)
	{
		//create unique session id
		var response = {};
		var aspect_ratio = request.message.width/request.message.height;
		generate_session(aspect_ratio, function(session_object)
		{
			m_sessions[session_object.id] = 
			{
				socket: request.socket, 
				id: session_object.id 
			};
			response.session_id = session_object.id;
			response.action = "setup";
			response.height = session_object.height;
			response.width = session_object.width;
			callback(request, response);
			spawn_initial_objects(session_object);

		});
	};

	// Assosicates session_id with the socket connection and 
	//  finds existing session objects and resume updating
	var resume_session = function(request, callback)
	{
		var session_id = request.message.session_id;
		m_sessions[session_id] = { socket: request.socket, id: session_id };
		m_session_model.get_by_id( session_id, function(error, result)
		{
            var response = result[0];
			if (error || response === undefined)
			{
				response = {session_id: session_id, action: "resume_fail"};
			}
			else
			{
				response.session_id = session_id;
				response.action = "resume";
				m_object_controller.resume(session_id);
			}
			callback(request, response);
		});
	};

	// Handles user mouse events from the browser
	var handle_mouse = function(request, callback)
	{
		var session_id = request.message.session_id;
		var response = {session_id: session_id, status: "OK", action: "mouse" };
		m_object_controller.check_hits(request.message);
		callback(request, response);
	};

	//public methods

	// Called from parent to initialize socket communications and handlers
	this.start = function(port)
	{
		m_port = port;
		m_server = new WebSocketServer({port: port});
//		console.log('WebSocket server listing on port ' + m_port);
		m_server.on('connection', function(socket)
		{
//			console.log('new connection');
			socket.on('message', function(message)
			{
				route_messages(socket, message);
			});
			socket.on('close', function()
			{
//				console.log('connection closed');
				for (var session_index in m_sessions)
				{
					if (m_sessions[session_index].socket === socket)
					{
						m_object_controller.disconnect(session_index);
						delete m_sessions[session_index];
					}
				}
			});
		});
	};

	// Called from children controllers to send update messages to the client
	this.send_update = function(session_id, update)
	{
		var message = JSON.stringify(update);
		if (session_id in m_sessions)
		{
			m_sessions[session_id].socket.send(message, function(error)
			{
//console.log(message);
				if (error)
				{
					console.log(error);
				}
			});
		}
	};

};

module.exports = server_controller;
