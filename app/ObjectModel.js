// ServerModel.js
// This contains the server-side model component of jstdgame
// The data/model is implemented using MongoDB as persistent
//  storage for game objects in the backend


var mongodb = require('mongodb').MongoClient;

"use strict";

// This handles data storage and maniuplation for object-related objects
var object_model = function ObjectModel(parent, db)
{
	//private members
	var m_parent = parent;
	var m_db = db;
	var m_collection = m_db.collection('objects');

	this.insert = function(value, callback)
	{
		m_collection.insert(value, callback);
	};

	this.count = function(collection, criteria, callback)
	{
		m_collection.count(criteria, callback);
	};

	this.find = function(collection, criteria, callback)
	{
		m_collection.find(criteria).toArray(callback);
	};

	this.update = function(collection, criteria, update, callback)
	{
		m_collection.update(criteria, update, callback);
	};

	this.remove = function(collection, criteria, callback)
	{
		m_collection.remove(criteria, callback);
	};

	this.clear = function(collection, callback)
	{
		m_collection.drop();
		callback();
	};

}

module.exports = object_model;
