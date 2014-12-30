// ServerModel.js
// This contains the server-side model component of jstdgame
// The data/model is implemented using MongoDB as persistent
//  storage for game objects in the backend


var mongodb = require('mongodb').MongoClient;
var object_model = require('./ObjectModel');

"use strict";

// This is the top-level JavaScript object for the game
var server_model = function ServerModel(parent)
{
	//private members
	var m_parent = parent;
	var m_db;
	var m_db_uri = 'mongodb://localhost/jstdgame';
	var m_objects;

	//public methods
	this.start = function()
	{
		mongodb.connect(m_db_uri, function(error, database)
		{
 			if (error) throw error;
			console.log('Connected to mongo db at ' + m_db_uri);
			m_db = m_db || database;
			m_objects = new object_model(this, m_db);
		});
	};

	this.insert = function(collection, value, callback)
	{
		var collection = m_db.collection(collection);
		collection.insert(value, callback);
	};

	this.count = function(collection, criteria, callback)
	{
		var collection = m_db.collection(collection);
		collection.count(criteria, callback);
	}

	this.find = function(collection, criteria, callback)
	{
		var collection = m_db.collection(collection);
		collection.find(criteria).toArray(callback);
	};

	this.update = function(collection, criteria, update, callback)
	{
		var collection = m_db.collection(collection);
		collection.update(criteria, update, callback);
	};

	this.remove = function(collection, criteria, callback)
	{
		var collection = m_db.collection(collection);
		collection.remove(criteria, callback);
	};

	this.clear = function(collection, callback)
	{
		var collection = m_db.collection(collection);
		collection.drop();
		callback();
	};
}

module.exports = server_model;
