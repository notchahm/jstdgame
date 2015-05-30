// ObjectModel.js
// This contains the server-side model component of jstdgame
// The data/model is implemented using MongoDB as persistent
//  storage for game objects in the backend


// This handles data storage and maniuplation for object-related objects
var object_model = function ObjectModel(parent)
{
	"use strict";

	//private members
	var m_parent = parent;
	var m_db;
	var m_collection;

	this.set_database = function(database)
	{
		m_db = database;
		m_collection = m_db.collection('objects');
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

	this.update_x = function(object, callback)
	{
		var criteria = {_id: object._id};
		var set = { $set: { xpos: object.xpos, xvel: object.xvel } };
		m_collection.update(criteria, set, callback);
	};

	this.update_y = function(object, callback)
	{
		var criteria = {_id: object._id};
		var set = { $set: { ypos: object.ypos, yvel: object.yvel } };
		m_collection.update(criteria, set, callback);
	};

	this.update_hp = function(object, callback)
	{
		var criteria = {_id: object._id};
		var set = { $set: { hit_points: object.hit_points } };
		m_collection.update(criteria, set, callback);
	};

	this.get_count = function(session_id, type, callback)
	{
		var criteria = {session_id: session_id, type: type};
		m_collection.count(criteria, callback);
	};

	this.get_by_id = function(object_id, callback)
	{
		var criteria = { _id: object_id };
		m_collection.find(criteria).toArray(callback);
	};

	this.get_by_session = function(session_id, callback)
	{
		var criteria = { session_id: session_id };
		m_collection.find(criteria).toArray(callback);
	};

	this.clear = function(collection, callback)
	{
		m_collection.drop();
		callback();
	};

};

module.exports = object_model;
