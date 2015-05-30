// SessionModel.js
// This contains the server-side model component of jstdgame
// The data/model is implemented using MongoDB as persistent
//  storage for game objects in the backend

// This handles data storage and maniuplation for object-related objects
var session_model = function SessionModel(parent)
{
	"use strict";

	//private members
	var m_parent = parent;
	var m_db;
	var m_collection;

	this.set_database = function(database)
	{
		m_db = database;
		m_collection = m_db.collection('sessions');
	};

	this.add = function(object, callback)
	{
		m_collection.insert(object, callback);
	};

	this.remove = function(object_id, callback)
	{
		var criteria = {_id: object_id};
		m_collection.remove(criteria, callback);
	};

	this.get_count = function(session_id, callback)
	{
		var criteria = { id: session_id };
		m_collection.count(criteria, callback);
	};

	this.get_by_id = function(session_id, callback)
	{
		var criteria = { id: session_id };
		m_collection.find(criteria).toArray(callback);
	};

	this.clear = function(collection, callback)
	{
		m_collection.drop();
		callback();
	};

};

module.exports = session_model;
