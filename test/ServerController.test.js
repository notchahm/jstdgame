'use strict';

var ServerController = require('../app/ServerController');
var ServerModel = require('../app/ServerModel');
var WebSocket = require('ws');
var Net = require('net');
var Chai = require('chai');
var assert = Chai.assert;
var port = 8889;
var mvc = {};
mvc.model = new ServerModel(mvc);
mvc.model.start();

describe("Initialization tests", function ()
{
	it("should have imported a valid module into ServerController", function()
	{
		assert.ok(ServerController);
		assert.isFunction(ServerController);
	});

	it("should have a valid object defined after constructor", function(done)
	{
		mvc.controller = mvc.controller || new ServerController(mvc);
		assert.isObject(mvc.controller);
		done();
	});
	it("should be able to start listening given a port number", function(done)
	{
		mvc.controller.start(port);
		done();
	});
});

describe("Socket event tests", function ()
{
	var ws;
	it("should respond to a new connection with a socket that replies", function(done)
	{
		var reply_count = 0;
		ws = new WebSocket('ws://localhost:'+port);
		ws.on('open', function ()
		{
			ws.send("dummy_message", {mask: true});
		});
		ws.on('message', function (data, flags)
		{
			reply_count++;
			var message = JSON.parse(data);
			assert.isObject(message);
			if (reply_count === 1)
			{
				done();
			}
		});
		ws.on('error', function (error)
		{
			assert.equal(error, "no error");
			done();
		});
	});
	it("should respond to a closed connection", function(done)
	{
		ws.on('close', function ()
		{
			//console.log('disconnected');
			done();
		});
		ws.close();
	});
});

describe("Game-specific message tests", function ()
{
	var ws;
	var session_id;
	beforeEach(function(done)
	{
		ws = new WebSocket('ws://localhost:'+port);
		ws.on('open', function ()
		{
			done();
		});
	});
	afterEach(function(done)
	{
		ws.on('close', function ()
		{
			done();
		});
		ws.close();
	});
	it("should respond to a setup request with a setup reply and spawn messages", function(done)
	{
		var setup_count = 0;
		var spawn_count = 0;
		var setup_message =
		{
			method: 'SETUP',
			height: 400,
			width: 800
		};

		ws.on('message', function (data, flags)
		{
			var message = JSON.parse(data);
			assert.isString(message.session_id);
			session_id = message.session_id;
			assert.isString(message.action);
			if (message.action === "setup")
			{
				assert.equal(message.height,128);
				assert.equal(message.width,256);
				setup_count++;
			}
			else if (message.action === "spawn")
			{
				assert.isString(message._id);
				assert.isString(message.type);
				assert.isNumber(message.xpos);
				assert.isNumber(message.ypos);
				assert.isNumber(message.xvel);
				assert.isNumber(message.yvel);
				assert.isNumber(message.hit_points);
				spawn_count++;
			}
			if (setup_count === 1 && spawn_count >= 3)
			{
				done();
			}
		});
		ws.send(JSON.stringify(setup_message), {mask: true});
	});
	it("should respond to a resume request with a resume reply and replace messages", function(done)
	{
		var resume_count = 0;
		var replace_count = 0;
		var resume_message =
		{
			method: 'RESUME',
			session_id: session_id
		};

		ws.on('message', function (data, flags)
		{
			var message = JSON.parse(data);
			assert.isString(message.session_id);
			assert.isString(message.action);
			if (message.action === "resume")
			{
				assert.equal(message.height,128);
				assert.equal(message.width,256);
				resume_count++;
			}
			else if (message.action === "replace")
			{
				assert.isString(message._id);
				assert.isString(message.type);
				assert.isNumber(message.xpos);
				assert.isNumber(message.ypos);
				assert.isNumber(message.xvel);
				assert.isNumber(message.yvel);
				assert.isNumber(message.hit_points);
				replace_count++;
			}
			if (resume_count === 1 && replace_count >= 3)
			{
				done();
			}
		});
		ws.send(JSON.stringify(resume_message), {mask: true});
	});
	it("should respond to a bogus resume request with a resume_fail reply", function(done)
	{
		var resume_count = 0;
		var resume_message =
		{
			method: 'RESUME',
			session_id: 'bogus_session'
		};

		ws.on('message', function (data, flags)
		{
			var message = JSON.parse(data);
			assert.isString(message.session_id);
			assert.isString(message.action);
			if (message.action === "resume_fail")
			{
				done();
			}
		});
		ws.send(JSON.stringify(resume_message), {mask: true});
	});
	it("should respond to a mouse request with a mouse reply", function(done)
	{
		var mouse_message =
		{
			method: 'MOUSE',
			session_id: session_id,
            type: 0,
            button: 0,
            x: 0,
            y: 0 
		};
		ws.on('message', function (data, flags)
		{
			var message = JSON.parse(data);
			assert.isString(message.session_id);
			assert.isString(message.action);
			if (message.action === "mouse")
			{
				assert.equal(message.status, "OK");
				done();
			}
		});
		ws.send(JSON.stringify(mouse_message), {mask: true});
	});
});
