// ServerModel.js
// This contains the server-side model component of jstdgame
// The data/model is implemented using MongoDB as persistent
//  storage for game objects in the backend


var mongodb = require('mongodb').MongoClient;
var ObjectModel = require('./ObjectModel');
var SessionModel = require('./SessionModel');

// This is the top-level JavaScript object for the game
var server_model = function ServerModel(parent)
{
	"use strict";

	//private members
	var m_parent = parent;
	var m_db;
	var m_db_uri = 'mongodb://localhost/jstdgame';
	var m_object_model = new ObjectModel(this);
	var m_session_model = new SessionModel(this);

	//public methods
	this.start = function(callback)
	{
		mongodb.connect(m_db_uri, function(error, database)
		{
 			if (error)
			{
				throw error;
			}
//			console.log('Connected to mongo db at ' + m_db_uri);
			m_db = m_db || database;
			m_object_model.set_database(database);
			m_session_model.set_database(database);
			var index = { session_id: 1, name: 1 };
			m_db.ensureIndex( 'objects', index, function(error, result)
			{
				if (error)
				{
					console.log(error);
				}
				if (callback)
				{
					callback();
				}
			});
		});
	};

	this.insert = function(collection, value, callback)
	{
		collection = m_db.collection(collection);
		collection.insert(value, callback);
	};

	this.count = function(collection, criteria, callback)
	{
		collection = m_db.collection(collection);
		collection.count(criteria, callback);
	};

	this.find = function(collection, criteria, callback)
	{
		collection = m_db.collection(collection);
		collection.find(criteria).toArray(callback);
	};

	this.update = function(collection, criteria, update, callback)
	{
		collection = m_db.collection(collection);
		collection.update(criteria, update, callback);
	};

	this.remove = function(collection, criteria, callback)
	{
		collection = m_db.collection(collection);
		collection.remove(criteria, callback);
	};

	this.clear = function(collection, callback)
	{
		collection = m_db.collection(collection);
		collection.drop();
		if (callback)
		{
			callback();
		}
	};

	this.get_session_model = function()
	{
		return m_session_model;
	};

	this.get_object_model = function()
	{
		return m_object_model;
	};
};

module.exports = server_model;
