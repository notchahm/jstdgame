// ObjectController.js
// This contains the server-side controller for jstdgame objects.

"use strict";

// This is the JavaScript controller for object-specific functions
var object_controller = function ObjectController(parent, model)
{
	//private members
	var m_this = this;
	var m_parent = parent;	  //ref to top-level GameServer
	var m_model = model;

	//private methods
	var send = function(action, name, session_id)
	{
		var criteria = 
		{
			session_id: session_id,
			name: name
		}
		m_model.find('objects', criteria, function(error, result)
		{
			if (!error && result.length > 0)
			{
				var message = result[0];
				message.action = action;
				m_parent.send_update(session_id, message);
			}
		});
	}

	// callback to update xpos of object on interval based on xvel
	var update_xpos = function(object)
	{
		var criteria = {session_id: object.session_id};
		m_model.find('dimensions', criteria , function(error, result)
		{
			if (object.xpos < 0 || 
				object.xpos > result[0].width)
			{
				object.xvel *= -1;
			}
			if (object.xvel > 0)
			{
				object.xpos++;
			}
			else if (object.xvel < 0)
			{
				object.xpos--;
			}
			criteria.name = object.name;
			var set = { $set: { xpos: object.xpos, xvel: object.xvel } };
			m_model.update('objects', criteria, set, function(error, result)
			{
				//send update event to client
				send("update", object.name, object.session_id);
			});
		});
	}

	// callback to update ypos of object on interval based on yvel
	var update_ypos = function(object)
	{
		var criteria = {session_id: object.session_id};
		m_model.find('dimensions', criteria, function(error, result)
		{
			if (object.ypos < 0 || 
				object.ypos > result[0].height)
			{
				object.yvel *= -1;
			}
			if (object.yvel > 0)
			{
				object.ypos++;
			}
			else if (object.yvel < 0)
			{
				object.ypos--;
			}
			criteria.name = object.name;
			var set = { $set: { ypos: object.ypos, yvel: object.yvel } };
			m_model.update('objects', criteria, set, function(error, result)
			{
				//send spawn event to client
				send("update", object.name, object.session_id);
			});
		});
	}

	//register scheduled changes based on velocity
	var start_updates = function(object)
	{
		object.update_xpos = update_xpos;
		object.update_ypos = update_ypos;

		object.intervals = new Array();
		if (object.xvel != 0)
		{
			var x_ms = 1000/object.xvel;
			var x_timer_id = setInterval(object.increment_xpos, x_ms, object);
			object.intervals.push(x_timer_id);
		}
		if (object.yvel != 0)
		{
			var y_ms = 1000/object.yvel;
			var y_timer_id = setInterval(object.increment_ypos, y_ms, object);
			object.intervals.push(y_timer_id);
		}
	}

	//cancel scheduled changes for specified object
	var stop_updates = function(object)
	{
		for (var timer_index in object.intervals)
		{
			clearInterval(object.intervals[timer_index]);
		}
		object.intervals = [];
	}

	// decrements hit points of specified objected by specified damage
	var handle_hit = function (clicked_object, damage)
	{
		clicked_object.hit_points -= damage;
		var criteria = { _id : clicked_object._id };
		var set = { $set: { hit_points: clicked_object.hit_points } };
		m_model.update('objects', criteria, set, function(error, result)
		{
			if (error)
			{
				console.log(error);
				return;
			}
			if (clicked_object.hit_points <= 0)
			{
				m_this.destroy(clicked_object.name, clicked_object.session_id);
			}
			else
			{
				//send update event to client
				send("update", object.name, object.session_id);
			}
		});
	}

	//public methods

	// creates and initializes new object associated with the given session_id
	this.spawn = function(session_id, type, start_pos, start_vel)
	{
		//create and initialize object
		var object =
		{
			session_id: session_id,
			type: type,
			xpos: start_pos[0],
			ypos: start_pos[1],
			xvel: start_vel[0],
			yvel: start_vel[1]
		};

		//Use inheritance to create specific initializers for different types
		if (type == "base")
		{
			object.image_file = "sphere.png";
			object.width = 50;
			object.height = 50;
			object.hit_points = 10;
		}
		else if (type == "foe")
		{
			object.image_file = "cube.png";
			object.width = 50;
			object.height = 50;
			object.hit_points = 10;
		}

		var criteria = {session_id: session_id, type: type};
		m_model.count('objects', criteria, function(error, count)
		{
			if (error)
			{
				console.log(error);
				return;
			}
			object.name = type + "_" + count;

			//insert created object into database
			var insert_callback = function(error, results)
			{
				if (error)
				{
					if (error.code == 11000)
					{
						object.name = type + "_" + count++;
						//recurse
						m_model.insert('objects', object, insert_callback);
					}
					else
					{
						console.log(error);
					}
				}
				else
				{
					//begin updating
					start_updates(object);

					//send spawn event to client
					send("spawn", object.name, object.session_id);
				}
			}
			m_model.insert('objects', object, insert_callback);
		});


	}

	// finds objects associated with the given session_id and resumes updating
	this.resume = function(session_id)
	{
		var criteria =
		{
			session_id: session_id
		}
		m_model.find('objects', criteria, function(error, results)
		{
			if (error)
				console.log('Find error: ' + error);
			for (var object_index in results)
			{
				var object = results[object_index];

				//begin updating
				start_updates(object);
			}
		});
	}

	// checks database for objects matching criteria for a click, then calls
	//  the appropriate handle_hit function
	this.check_hits = function(mouse_event)
	{
		var session_id = mouse_event.session_id;
		var xpos = mouse_event.x;
		var ypos = mouse_event.y;
		var criteria =
		{
			session_id: session_id
//			xpos: { $lte : xpos + object.width/2, $gt : xpos - object.width/2 }
//			ypos: { $lte : ypos + object.height/2, $gt : ypos - object.width/2 }
			//type: "foe"
		}
		m_model.find('objects', criteria, function(error, results)
		{
			if (error)
				console.log('Find error: ' + error);
			for (var object_index in results)
			{
				var object = results[object_index];
				if (xpos >= object.xpos - object.width/2 &&
					xpos < object.xpos + object.width/2 &&
					ypos >= object.ypos - object.height/2 &&
					ypos < object.ypos + object.height/2)
				{
					var damage = 1;
					m_this.handle_hit(object, damage);
				}
			}
		});
	}

	// halts updates for objects matching specified session_id
    this.disconnect = function(session_id)
    {
        var criteria =
        {
            session_id: session_id
        }
        m_model.find('objects', criteria, function(error, results)
        {
            if (error)
                console.log('Find error: ' + error);
            for (var object_index in results)
            {
                var object = results[object_index];
				stop_updates(object);
			}
		});
	}

	// removes object matching specified parameters from database
	this.destroy = function(name, session_id)
	{
		var criteria = 
		{
			session_id: session_id,
			name: name
		}
		m_model.find('objects', criteria, function(error, result)
		{
			if (error)
			{
				console.log(error);
				return;
			}
			if (result.length > 0)
			{
				var destroyed_object = result[0];
				stop_updates(destroyed_object);
	
				//remove destroyed object from database
				m_model.remove('objects', criteria, function(error, result)
				{
					//send destroy event to client
					destroyed_object.action = "destroy";
					m_parent.send_update(session_id, destroyed_object);
				});
			}
		});
	}
}

module.exports = object_controller;
