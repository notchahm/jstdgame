// browser.js
// This contains the client-side javascript code for jstdgame.
// The code is split up into a model, view, and controller class, all contained
//  within a global parent object, following the MVC paradigm

//This contains all of the data objects for the game
var BrowserModel = function (parent)
{
	var m_model = this;
	var m_parent = parent;
	var m_objects = {};
	var m_mouse = {"xpos":-1,"ypos":-1,"radius":5};
	var m_client_dimensions = {};
	var m_server_dimensions = {};
	var m_scale = {};

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

	this.getObjectById = function(object_id)
	{
		return m_objects[object_id];
	}

	this.addObject = function(object)
	{
		m_objects[object._id] = object;
		return m_objects[object._id];
	}

	this.removeObject = function(object)
	{
		delete m_objects[object._id];
	}

	this.updateObjectPos = function(object)
	{
		if (m_objects[object._id])
		{
			m_objects[object._id].xpos = object.xpos;
			m_objects[object._id].ypos = object.ypos;
			m_objects[object._id].xvel = object.xvel;
			m_objects[object._id].yvel = object.yvel;
			m_objects[object._id].lastUpdate = Date.now();
		}
	}

	this.updateObjectHit = function(object)
	{
		if (m_objects[object._id])
		{
			m_objects[object._id].hit_points = object.hit_points;
		}
	}

	this.translateObject = function(object_id, delta_x, delta_y, time)
	{
		if (m_objects[object_id])
		{
			m_objects[object_id].xpos += delta_x;
			m_objects[object_id].ypos += delta_y;
			m_objects[object_id].lastUpdate = time;
		}
	}

	this.clearObjects = function()
	{
		m_objects = [];
	}

	this.setClientDimensions = function(width, height)
	{
		m_client_dimensions.width = width;
		m_client_dimensions.height = height;
		if (m_server_dimensions.width)
		{
			m_scale.x = m_client_dimensions.width/m_server_dimensions.width;
		}
		if (m_server_dimensions.height)
		{
			m_scale.y = m_client_dimensions.height/m_server_dimensions.height;
		}
	}

	this.setServerDimensions = function(width, height)
	{
		m_server_dimensions.width = width;
		m_server_dimensions.height = height;
		if (m_client_dimensions.width)
		{
			m_scale.x = m_client_dimensions.width/m_server_dimensions.width;
		}
		if (m_client_dimensions.height)
		{
			m_scale.y = m_client_dimensions.height/m_server_dimensions.height;
		}
	}

	this.getServerDimensions = function()
	{
		return m_server_dimensions;
	}

	this.getScale = function()
	{
		return m_scale;
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
	var m_session_id;
	var m_connection = new WebSocket(m_ws_url);

	//private methods
	// This starts an animation loop that cycles at browser refesh intervals
	var animate = function()
	{
		requestAnimationFrame( animate );
		var scale = m_model.getScale();
		for (var model_index in m_model.getObjects())
		{
			var object = m_model.getObjects()[model_index];
			if (object.lastUpdate)
			{
				var current_time = Date.now();
				var time_delta = (current_time - object.lastUpdate)/1000;
				var delta_x = object.xvel * time_delta; 
				var delta_y = object.yvel * time_delta; 
				m_model.translateObject(object._id, delta_x, delta_y, current_time);
			}
		}
		handleTick();
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
	var handleTick = function()
	{
		m_view.update(m_model);
		handleRedraw();
	}

	var handleNewConnection = function(event)
	{
		if (m_session_id == null)
		{
			var setup_message = 
			{
				method: 'SETUP',
				height: window.innerHeight,
				width: window.innerWidth 
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
	}

	var handleMessage = function(event)
	{
		var message = JSON.parse(event.data);
		if (message.hasOwnProperty('action'))
		{
			//m_model.clearObjects();
			var object = message;
			if (object.action == "setup" || object.action == "resume")
			{
				m_session_id = message.session_id;
				m_model.setServerDimensions(object.width, object.height);
				m_view.centerCamera(object.width, object.height);
				writeCookies();
			}
			else if (object.action == "resume_fail")
			{
				deleteCookies();
				var setup_message =
				{
					method: 'SETUP',
					height: window.innerHeight,
					width: window.innerWidth
				};
				m_connection.send(JSON.stringify(setup_message));
			}
			else if (object.action == "spawn" || object.action == "replace")
			{
				var new_object = m_model.addObject(object);
				m_view.addObjectView(new_object);
			}
			else if (object.action == "destroy")
			{
				var model_obj = m_model.getObjectById(object._id);
				if (model_obj)
					object.mesh = model_obj.mesh;
				m_model.removeObject(object);
				m_view.removeObjectView(object);
			}
			else if (object.action == "update_pos")
			{
				m_model.updateObjectPos(object);
			}
			else if (object.action == "update_hit")
			{
				m_model.updateObjectHit(object);
			}
			else
			{
				console.log(object);
			}
		}
	}

	var handleDisconnect = function(event)
	{
		console.log('connection closed');
		if (event.code == 1006)
		{
			console.log('connection refused?');
		}
	}

	var handleSocketError = function(event)
	{
		console.log('socket error');
		console.log(event);
	}

	var handleRedraw = function()
	{
		m_view.draw(m_model);
	}

	// This is where key press events are handled
	var handleKey = function(KeyEvent)
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
	var handleMouse = function(MouseEvent)
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
		var scale = m_model.getScale();
		xpos = xpos * elementClicked.width / elementClicked.offsetWidth;
		ypos = ypos * elementClicked.height / elementClicked.offsetHeight;
		xpos = Math.floor(xpos/scale.x);
		ypos = m_model.getServerDimensions().height - Math.floor(ypos/scale.y);

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

	var handleResize = function(resize_event)
	{
		m_model.setClientDimensions(window.innerWidth, window.innerHeight);
		m_view.resize(window.innerWidth, window.innerHeight);
		handleRedraw();
	}

	var handleDOMLoaded = function(loaded_event)
	{
		m_model.setClientDimensions(window.innerWidth, window.innerHeight);
		m_view.init();
		waitForResources();
		animate();
	}

	var registerBrowserEventHandlers = function()
	{
		//user input handlers
		document.addEventListener('keydown', handleKey, false);
		document.addEventListener('mousedown', handleMouse, false);

		//disable context menu on right click
		document.oncontextmenu = function() {return false;};

		document.addEventListener("DOMContentLoaded", handleDOMLoaded, false);

		//pass on resize events to appropriate screen
		window.onresize = handleResize;
	}

	var waitForResources = function()
	{
		//TODO: Wait for all resources (e.g. images, sounds) to finish loading before handling stuff
		//		Display a "Loading..." splash screen while this is happening
	}

	m_connection.onopen = handleNewConnection;
	m_connection.onmessage = handleMessage;
	m_connection.onerror = handleSocketError;
	m_connection.onclose = handleDisconnect;
	registerBrowserEventHandlers();
	readCookies();
}

// Handles display of game in browser
var BrowserView = function(parent)
{
	// Initialize private members
	var m_view = this;
	var m_scene = new THREE.Scene();
	var m_renderer = new THREE.WebGLRenderer();
	var m_camera;
	var m_game_div;

	this.init = function()
	{
		m_game_div = document.getElementById("game_div");
		if (!m_game_div)
		{
			m_game_div = document.createElement('div');
			m_game_div.setAttribute("id", "game_div");
			document.body.appendChild(m_game_div);
		}

		m_renderer.setSize( window.innerWidth, window.innerHeight );
		m_game_div.appendChild( m_renderer.domElement );
	}

	this.centerCamera = function(width, height)
	{
		var fov = 70
		var dist = height/Math.tan(fov * Math.PI/180) * 2; 
		var aspect_ratio = width / height;
		//m_camera = new THREE.PerspectiveCamera(fov, aspect_ratio, 0.1, 1000);
		m_camera = new THREE.OrthographicCamera(-width/2, width/2, height/2, -height/2, 0.1, 1000);
		m_camera.position.x = width/2;
		m_camera.position.y = height/2;
		m_camera.position.z = dist;

		var point_light = new THREE.PointLight(0xFFFFFF);
		point_light.position.x = width/2+50;
		point_light.position.y = height/2+50;
		point_light.position.z = 50;
		m_scene.add(point_light);
		var ambient_light = new THREE.AmbientLight( 0x404040 ); // soft white light
		m_scene.add( ambient_light );
	}

	this.addObjectView = function(object)
	{
		var geometry;	
		var material;
		if (object.image_file == 'sphere.png')
		{
			var radius = object.width/2.
			var segments = 32;
			var rings = 32;
			geometry = new THREE.SphereGeometry(radius, segments, rings);
			material = new THREE.MeshLambertMaterial( { color: 0xffffff });
		}
		else
		{
			var width = object.width/2;
			var height = object.height/2;
			var depth = object.width/2;
			geometry = new THREE.BoxGeometry(width, height, depth);
			material = new THREE.MeshLambertMaterial( { color: 0x0033ff });
		}
		//var material = new THREE.MeshBasicMaterial( { color: 0xffffff } );
		object.mesh = new THREE.Mesh( geometry, material );
		m_scene.add(object.mesh);
	}

	this.removeObjectView = function(object)
	{
		m_scene.remove(object.mesh);
	}

	this.update = function(model)
	{
		var objects = model.getObjects();
		for (var object_id in objects)
		{
			var object_mesh = objects[object_id].mesh;
			object_mesh.position.x = objects[object_id].xpos;
			object_mesh.position.y = objects[object_id].ypos;
			object_mesh.rotation.x += 0.01;
			object_mesh.rotation.y += 0.01;
			//console.log(object_mesh.position.x, object_mesh.position.y);
		}
	}

	this.resize = function()
	{
		if (m_game_div)
			m_renderer.setSize(m_game_div.clientWidth, m_game_div.clientHeight);
	}

	this.draw = function()
	{
		if (m_camera)
			m_renderer.render(m_scene, m_camera);
	}
}

function BrowserGame()
{
	this.model = new BrowserModel(this);
	this.view = new BrowserView(this);
	this.controller = new BrowserController(this);
}

// Global reference to top-level object
var g_game = new BrowserGame();
