// ObjectController.js
// This contains the server-side controller for jstdgame objects.

// This is the JavaScript controller for object-specific functions
var object_controller = function ObjectController(parent, model)
{
	"use strict";

	//private members
	var m_this = this;
	var m_parent = parent;	  //ref to top-level GameServer
	var m_object_model = model.get_object_model();
	var m_session_model = model.get_session_model();
	var m_intervals = {};

	//private methods
	var send = function(action, object_id, session_id)
	{
		m_object_model.get_by_id(object_id, function(error, result)
		{
			if (!error && result.length > 0)
			{
				var message = result[0];
				message.action = action;
				m_parent.send_update(session_id, message);
			}
		});
	};

	// callback to update xpos of object on interval based on xvel
	var update_xpos = function(object)
	{
		m_session_model.get_by_id(object.session_id, function(error, result)
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
			m_object_model.update_x(object, function(error, result)
			{
				if (!error && result.length > 0)
				{
					//send update event to client
					send("update_pos", object._id, object.session_id);
				}
			});
		});
	};

	// callback to update ypos of object on interval based on yvel
	var update_ypos = function(object)
	{
		m_session_model.get_by_id(object.session_id, function(error, result)
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
			m_object_model.update_y(object, function()
			{
				if (!error && result.length > 0)
				{
					//send spawn event to client
					send("update_pos", object._id, object.session_id);
				}
			});
		});
	};

	//register scheduled changes based on velocity
	var start_updates = function(object)
	{
		object.update_xpos = update_xpos;
		object.update_ypos = update_ypos;

		var object_intervals = [];
		if (object.xvel !== 0)
		{
			var x_ms = Math.floor(1000/Math.abs(object.xvel));
			var x_timer_id = setInterval(object.update_xpos, x_ms, object);
			object_intervals.push(x_timer_id);
		}
		if (object.yvel !== 0)
		{
			var y_ms = Math.floor(1000/Math.abs(object.yvel));
			var y_timer_id = setInterval(object.update_ypos, y_ms, object);
			object_intervals.push(y_timer_id);
		}
		if (object_intervals.length > 0)
		{
			m_intervals[object._id] = object_intervals;
		}
	};

	//cancel scheduled changes for specified object
	var stop_updates = function(object)
	{
		var object_intervals = m_intervals[object._id];
		if (object_intervals)
		{
			for (var timer_index=0; timer_index < object_intervals.length; timer_index++)
			{
				clearInterval(object_intervals[timer_index]);
			}
			delete m_intervals[object._id];
		}
	};

	// decrements hit points of specified objected by specified damage
	var handle_hit = function (clicked_object, damage)
	{
		clicked_object.hit_points -= damage;
		m_object_model.update_hp(clicked_object, function(error)
		{
			if (error)
			{
				console.log(error);
				return;
			}
			if (clicked_object.hit_points <= 0)
			{
				m_this.destroy(clicked_object._id, clicked_object.session_id);
			}
			else
			{
				//send update event to client
				send("update_hit", clicked_object._id, clicked_object.session_id);
			}
		});
	};

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
		if (type === "base")
		{
			object.image_file = "sphere.png";
			object.width = 10;
			object.height = 10;
			object.hit_points = 10;
		}
		else if (type === "foe")
		{
			object.image_file = "cube.png";
			object.width = 5;
			object.height = 5;
			object.hit_points = 5;
		}

		m_object_model.get_count(session_id, type, function(error, count)
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
				if (error || results.length === 0)
				{
					if (error.code === 11000)
					{
						object.name = type + "_" + count++;
						//recurse
						m_object_model.add(object, insert_callback);
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
					send("spawn", object._id, object.session_id);
				}
			};
			m_object_model.add(object, insert_callback);
		});
	};

	// finds objects associated with the given session_id and resumes updating
	this.resume = function(session_id)
	{
		m_object_model.get_by_session(session_id, function(error, results)
		{
			if (error)
			{
				console.log('Find error: ' + error);
			}
			for (var object_index=0; object_index<results.length; object_index++)
			{
				var object = results[object_index];

				//begin updating
				start_updates(object);
				send("replace", object._id, object.session_id);
			}
		});
	};

	// checks database for objects matching criteria for a click, then calls
	//  the appropriate handle_hit function
	this.check_hits = function(mouse_event)
	{
		var session_id = mouse_event.session_id;
		var xpos = mouse_event.x;
		var ypos = mouse_event.y;
		m_object_model.get_by_session(session_id, function(error, results)
		{
			if (error)
			{
				console.log('Find error: ' + error);
			}
			for (var object_index=0; object_index<results.length; object_index++)
			{
				var object = results[object_index];
				if (xpos >= object.xpos - object.width/2 &&
					xpos < object.xpos + object.width/2 &&
					ypos >= object.ypos - object.height/2 &&
					ypos < object.ypos + object.height/2)
				{
					var damage = 1;
					handle_hit(object, damage);
				}
			}
		});
	};

	// halts updates for objects matching specified session_id
    this.disconnect = function(session_id)
    {
        m_object_model.get_by_session(session_id, function(error, results)
        {
            if (error)
			{
                console.log('Find error: ' + error);
			}
			for (var object_index=0; object_index<results.length; object_index++)
            {
                var object = results[object_index];
				stop_updates(object);
			}
		});
	};

	// removes object matching specified parameters from database
	this.destroy = function(object_id, session_id)
	{
		m_object_model.get_by_id(object_id, function(error, result)
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
				m_object_model.remove(object_id, function(error, result)
				{
					if (!error && result.length > 0)
					{
						//send destroy event to client
						destroyed_object.action = "destroy";
						m_parent.send_update(session_id, destroyed_object);
					}
				});
			}
		});
	};
};

module.exports = object_controller;
