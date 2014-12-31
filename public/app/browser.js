// browser.js
// This contains the client-side javascript code for jstdgame.
// The code is split up into a model, view, and controller class, all contained
//  within a global parent object, following the MVC paradigm

// Global reference to top-level object
var g_game = null;

// Initilize the global game object when the page is ready
$(document).ready(function()
{
	g_game = new BrowserGame();
});

//This contains all of the data objects for the game
var BrowserModel = function (parent)
{
	var m_parent = parent;
	var m_objects = {};
	var m_mouse = {"xpos":-1,"ypos":-1,"radius":5};

	//public methods
	this.setMousePos = function(xpos, ypos)
	{
		m_mouse.xpos = xpos;
		m_mouse.ypos = ypos;
	}
	this.getMouse = function()
	{
		return m_mouse;
	}
	this.getObjects = function()
	{
		return m_objects;
	}
	this.getObjectIndexFromName = function(object_name)
	{
		var object_index = -1;
		for (object_index = 0; object_index < m_objects.length; object_index++)
		{
			if (m_objects[object_index].name == object_name)
				return object_index;
		}
		return -1;	//not found
	}
	this.addObject = function(object)
	{
		object.image = new Image();
		object.image.onload = function()
		{
			object.loaded = true;
		}
		object.image.src = 'dist/img/' + object.image_file;
		m_objects[object.name] = object;
	}
	this.removeObject = function(object)
	{
		delete m_objects[object.name];
	}
	this.updateObject = function(object)
	{
		m_objects[object.name].xpos = object.xpos;
		m_objects[object.name].ypos = object.ypos;
		m_objects[object.name].xvel = object.xvel;
		m_objects[object.name].yvel = object.yvel;
	}
	this.clearObjects = function()
	{
		m_objects = [];
	}
}

//Handles various events driven by browser or communication with server
var BrowserController = function(parent)
{
	// private members
	var m_controller = this;
	var m_parent = parent;
	var m_model = parent.model;
	var m_view = parent.view;
	var m_ws_url = 'ws://' + location.hostname + ':8889';
	var m_connection = new WebSocket(m_ws_url);
	var m_session_id;

	//private methods
	// This starts an animation loop that cycles at browser refesh intervals
	var animate = function()
	{
		requestAnimationFrame( animate );
		m_controller.handleTick();
	}

	var readCookies = function()
	{
		var cookies_array = document.cookie.split(';');
		for(var cookie_index=0; cookie_index<cookies_array.length; cookie_index++)
		{
			var cookie = cookies_array[cookie_index].trim();
			if (cookie.indexOf('session_id')==0)
				m_session_id = cookie.substring('session_id'.length+1,cookie.length);
		}
	}

	var writeCookies = function()
	{
		if (m_session_id != null)
		{
			var date_object = new Date();
			date_object.setTime(date_object.getTime()+(365*24*60*60*1000));
			var expires = "expires="+date_object.toGMTString();
			document.cookie = "session_id=" + m_session_id + "; " + expires;
		}
	}

	var deleteCookies = function()
	{
		document.cookie = "session_id=;expires=Thu, 01 Jan 1970 00:00:01 GMT";
	}

	//public methods
	this.handleTick = function()
	{
		this.handleRedraw();
	}


	this.init = function()
	{
		readCookies();
		m_connection.onopen = function(event)
		{
			if (m_session_id == null)
			{
				canvas = $('#game_canvas')[0];
				var setup_message = 
				{
					method: 'SETUP',
					height: canvas.height,
					width: canvas.width
				};
				m_connection.send(JSON.stringify(setup_message));
			}
			else
			{
				var resume_message = 
				{
					method: 'RESUME',
					session_id: m_session_id
				}
				m_connection.send(JSON.stringify(resume_message));
			}
		};
		m_connection.onmessage = function(event)
		{
			var message = JSON.parse(event.data);
			if (message.hasOwnProperty('action'))
			{
				//m_model.clearObjects();
				var object = message;
				if (object.action == "setup")
				{
					m_session_id = message.session_id;
					writeCookies();
				}
				else if (object.action == "resume_fail")
				{
					deleteCookies();
					canvas = $('#game_canvas')[0];
					var setup_message =
					{
						method: 'SETUP',
						height: canvas.height,
						width: canvas.width
					};
					m_connection.send(JSON.stringify(setup_message));
				}
				else if (object.action == "spawn")
				{
					m_model.addObject(object);
				}
				else if (object.action == "destroy")
				{
					m_model.removeObject(object);
				}
				else if (object.action == "update")
				{
					m_model.updateObject(object);
				}
			}
		};

		this.waitForResources();
		this.registerBrowserEventHandlers();
//		this.view.draw(this.model);
		animate();
	}

	this.handleRedraw = function()
	{
		m_view.draw(m_model);
	}

	// This is where key press events are handled
	this.handleKey = function(KeyEvent)
	{
		var key_pressed = String.fromCharCode(KeyEvent.which)
		var message_string = "event_type=key_press&char=" + key_pressed;
		console.log(message_string);
		var key_press_message = 
		{
			session_id: m_session_id,
			method: 'KEY',
			key: key_pressed 
		};
		m_connection.send(JSON.stringify(key_press_message));
	}

	// This is where mouse click/touchscreen events are handled
	this.handleMouse = function(MouseEvent)
	{
		var xpos;
		var ypos;
		if (!MouseEvent) MouseEvent = window.event;
		var elementClicked = MouseEvent.target;
		if (MouseEvent.offsetX || MouseEvent.offsetY)
		{
			xpos = MouseEvent.offsetX;
			ypos = MouseEvent.offsetY;
		}
		else if (MouseEvent.pageX || MouseEvent.pageY)
		{
			xpos = MouseEvent.pageX-elementClicked.offsetLeft;
			ypos = MouseEvent.pageY-elementClicked.offsetTop;
		}
		else if (MouseEvent.clientX || MouseEvent.clientY)
		{
			xpos = MouseEvent.clientX-elementClicked.offsetLeft;
			ypos = MouseEvent.clientY-elementClicked.offsetTop;
		}
		xpos = Math.floor(xpos * elementClicked.width / elementClicked.offsetWidth);
		ypos = Math.floor(ypos * elementClicked.height / elementClicked.offsetHeight);

		var message_string = "event_type=" + MouseEvent.type + "&mouse_x=" + xpos + "&mouse_y=" +ypos;
		console.log(message_string);
		var mouse_message = 
		{
			session_id: m_session_id,
			method: 'MOUSE',
			type: MouseEvent.type,
			button: MouseEvent.which,
			x: xpos,
			y: ypos
		};
		m_connection.send(JSON.stringify(mouse_message));
		m_model.setMousePos(xpos,ypos);
	}

	this.registerBrowserEventHandlers = function()
	{

		//Assign this object's handler methods to jQuery's event handlers
		$(document).keypress(this.handleKey);
		$(document).mousedown(function(mouse_event) { m_controller.handleMouse(mouse_event) });
		//$(document).mouseup(function(mouse_event) { m_controller.handleMouse(mouse_event) });
		//$(document).mousemove(function(mouse_event) { m_controller.handleMousemouse_event() });

		//disable context menu on right click
		document.oncontextmenu = function() {return false;};

		//pass on resize events to appropriate screen
		window.onresize=(function() { m_controller.handleRedraw() });
	}
	this.waitForResources = function()
	{
		//TODO: Wait for all resources (e.g. images, sounds) to finish loading before handling stuff
		//		Display a "Loading..." splash screen while this is happening
	}
}

// Handles display of game in browser
var BrowserView = function(parent)
{
	// Initialize private members
	var m_canvas = $('#game_canvas')[0];
	var m_canvas_context = m_canvas.getContext("2d");
	var m_view = this;

	// Private methods
	// This draws the background of the canvas
	var drawBackground = function(model)
	{
		//For now, just clear the canvas with a black color as a default background
		m_canvas_context.fillStyle="#000000";
		//this.canvas_context.fillStyle="#CCCCCC";
		m_canvas_context.fillRect(0,0,m_canvas.width,m_canvas.height);
	}

	// This draws the game controls on the canvas
	var drawControls = function(model)
	{
		var mouse = model.getMouse();
		if (mouse.xpos >= 0 && mouse.ypos >=0)
		{
			m_canvas_context.strokeStyle="#00c000";
			m_canvas_context.beginPath();
			m_canvas_context.arc(mouse.xpos, mouse.ypos, mouse.radius, -1, 2 * Math.PI);
			m_canvas_context.stroke();
		}
	}

	// This draws the image corresponding to each sprite object at is corresponding position
	var drawObjects = function(model)
	{
		var objects = model.getObjects();
		for (var key in objects)
		{
			m_view.drawObject(objects[key]);
		}
	}

	//Public methods
	// This gets called to update the canvas whenever something has changed
	this.clear = function()
	{
		m_canvas_context.clearRect(0,0,m_canvas.width,m_canvas.height);
	}

	// This gets called to update the canvas whenever something has changed
	this.draw = function(model)
	{
		if (this != null)
		{
			//this.clear();
			drawBackground(model);
			drawControls(model);
			drawObjects(model);
		}
	}

	this.drawObject = function(object)
	{
		//console.log(object);
//		if (object.loaded == true)
		m_canvas_context.drawImage(object.image, object.xpos-(object.width/2), object.ypos-(object.height/2), object.width, object.height);
	}

}

// This is the top-level JavaScript object for the game
function BrowserGame()
{
	this.model = new BrowserModel(this);
	this.view = new BrowserView(this);
	this.controller = new BrowserController(this);
	this.controller.init();
}

