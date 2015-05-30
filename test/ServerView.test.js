"use strict";

var ServerView = require('../app/ServerView');
var http = require('http');
var Chai = require('chai');
var assert = Chai.assert;
var view;
var port = 8888;

describe("Initialization tests", function ()
{
	it("should have imported a valid module into ServerController", function()
	{
		assert.ok(ServerView);
		assert.isFunction(ServerView);
	});

	it("should have a valid object defined after constructor", function(done)
	{
		view = new ServerView();
		assert.isObject(view);
		done();
	});

	it("should initialize an HTTP listener on start", function(done)
	{
		view.start(port);
		var request = {host: 'localhost', port:port, path: "/"};
		http.get(request, function (response)
		{
			var body = "";
			response.on('data', function(data)
			{
				body += data;
			});
			response.on('end', function()
			{
				assert.ok(body);
				assert.notEqual(body, "");
				done();
			});
			response.on('error', function(error)
			{
				assert.notOk(error);
			});
		});
	});
});

describe("HTTP GET tests", function ()
{
	it("should get a valid document at /index.html", function(done)
	{
		var request = {host: 'localhost', port:port, path: "/index.html"};
		http.get(request, function (response)
		{
			var body = "";
			response.on('data', function(data)
			{
				body += data;
			});
			response.on('end', function()
			{
				assert.ok(body);
				assert.notEqual(body, "");
				done();
			});
			response.on('error', function(error)
			{
				assert.notOk(error);
			});
		});
	});

	it("should get a valid css document at /css/browser.css", function(done)
	{
		var request = {host: 'localhost', port:port, path: "/css/browser.css"};
		http.get(request, function (response)
		{
			var body = "";
			response.on('data', function(data)
			{
				body += data;
			});
			response.on('end', function()
			{
				assert.ok(body);
				assert.notEqual(body, "");
				done();
			});
			response.on('error', function(error)
			{
				assert.notOk(error);
			});
		});
	});

	it("should get a valid javascript document at /app/browser.js", function(done)
	{
		var request = {host: 'localhost', port:port, path: "/app/browser.js"};
		http.get(request, function (response)
		{
			var body = "";
			response.on('data', function(data)
			{
				body += data;
			});
			response.on('end', function()
			{
				assert.ok(body);
				assert.notEqual(body, "");
				done();
			});
			response.on('error', function(error)
			{
				assert.notOk(error);
			});
		});
	});
});

