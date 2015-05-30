"use strict";

var ServerModel = require('../app/ServerModel');
var Chai = require('chai');
var assert = Chai.assert;
var model;

describe("Initialization tests", function ()
{
	it("should have imported a valid module into ServerController", function()
	{
		assert.ok(ServerModel);
		assert.isFunction(ServerModel);
	});

	it("should have a valid object defined after constructor", function(done)
	{
		model = new ServerModel();
		assert.isObject(model);
		done();
	});

	it("should initialize a db connection upon start", function(done)
	{
		model.start(function()
		{
			done();
		});
	});
});

describe("Database operation tests", function ()
{
	var collection = "test";
	var bogus_criteria = { bogus : "value" };
	var random_key = Math.floor(Math.random() * 0xffffffff).toString(16);
	var random_value = Math.random();
	var random_doc = {};
	random_doc[random_key] = random_value;

	before(function(done)
	{
		model.clear(collection);
		done();
	});
	
	it("should insert a random document without error", function(done)
	{
		model.insert(collection, random_doc, function(error, insert_result)
		{
			assert.notOk(error);
			assert.equal(insert_result[0][random_key], random_value);
			done();
		});
	});

	it("should return the correct count for inserted doc", function(done)
	{
		model.count(collection, random_doc, function(error, count)
		{
			assert.notOk(error);
			assert.equal(count, 1);
			done();
		});
	});

	it("should return 0 for bogus criteria", function(done)
	{
		model.count(collection, bogus_criteria, function(error, count)
		{
			assert.notOk(error);
			assert.equal(count, 0);
			done();
		});
	});

	it("should find a valid existing document", function(done)
	{
		model.find(collection, random_doc, function(error, find_result)
		{
			assert.notOk(error);
			assert.equal(find_result[0][random_key], random_value);
			done();
		});
	});

	it("should callback with an empty array for a non-existing document", function(done)
	{
		model.find(collection, bogus_criteria, function(error, find_result)
		{
			assert.notOk(error);
			assert.deepEqual(find_result, []);
			done();
		});
	});

	it("should modify a valid existing document", function(done)
	{
		var update_fields = {};
		update_fields[random_key] = "updated_value";
		var set = { $set: update_fields };
        model.update(collection, random_doc, set, function(error, update_result)
		{
			assert.notOk(error);
			assert.ok(update_result);
			model.find(collection, {}, function(error, find_result)
			{
				assert.notOk(error);
				for (var find_index = 0; find_index < find_result.length; find_index++)
				{
					var entry = find_result[find_index];
					if (entry.hasOwnProperty(random_key))
					{
						assert.equal(entry[random_key], "updated_value");
					}
				}
				done();
			});
		});
	});

	it("should remove a valid existing document", function(done)
	{
		model.clear(collection);
		model.insert(collection, random_doc, function(error, insert_result)
		{
			assert.notOk(error);
			assert.equal(insert_result[0][random_key], random_value);
			model.remove(collection, random_doc, function(error, delete_result)
			{
				assert.notOk(error);
				assert.ok(delete_result);
				model.find(collection, random_doc, function(error, find_result)
				{
					assert.notOk(error);
					assert.deepEqual(find_result, []);
					done();
				});
			});
		});
	});

	it("should remove all documents from a table on a clear", function(done)
	{
		var test_doc = {key: "value"};
		model.insert(collection, test_doc, function(error, insert_result)
		{
			assert.notOk(error);
			assert.equal(insert_result[0].key, "value");
			model.count(collection, {}, function(error, count)
			{
				assert.notOk(error);
				assert.notEqual(count,0);
				model.clear(collection, function(error)
				{
					model.count(collection, {}, function(error, count)
					{
						assert.notOk(error);
						assert.equal(count,0);
						done();
					});
				});
			});
		});
	});
});

describe("Get children tests", function ()
{
	it("should return a valid object from get_session_model", function(done)
	{
		var session_model = model.get_session_model();
		assert.isObject(session_model);
		done();
    });

	it("should return a valid object from get_object_model", function(done)
	{
		var object_model = model.get_object_model();
		assert.isObject(object_model);
		done();
    });
});
