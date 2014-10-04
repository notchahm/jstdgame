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

// This is the top-level JavaScript object for the game
function BrowserGame()
{
	this.model = new BrowserModel(this);
	this.view = new BrowserView(this);
	this.controller = new BrowserController(this);
	this.controller.init();
}

//This contains all of the data objects for the game
function BrowserModel(parent)
{
	function GameObjectModel(index, name, type, image, xpos, ypos, xvel, yvel, width, height, hp)
	{
		//numerical index and string identifer of object
		this.index = index;
		this.name = name;

		//type of object -- e.g. base, tower, foe
		this.type = type;

		//position of object on canvas
		this.xpos = xpos;
		this.ypos = ypos;

		//velocity of object (change in position per tick)
		this.xvel = xvel;
		this.yvel = yvel;

		//the horizontal and vertical dimensions of the object on the canvas
		this.width = width;
		this.height = height;

		//hit points of object
		this.hit_points = hp;

		//the image file, loaded my name of image file
		this.image = new Image();
		this.image.src = "../dist/img/" + image;

	}
	this.parent = parent;
	this.objects = new Array();
	//temporary test data. This will eventually be generated on and fetched from the game server
	canvas = $('#game_canvas')[0];
	object_index = 0;
	this.objects.push(new GameObjectModel(object_index++,"base","base","sphere.png",canvas.width/2,canvas.height/2,0,0,50,50,10));
	this.objects.push(new GameObjectModel(object_index++,"foe1","foe","cube.png",canvas.width/2,0,0,1,50,50,10));
	this.objects.push(new GameObjectModel(object_index++,"foe2","foe","cube.png",0,canvas.height/2,1,0,50,50,10));
	this.mouse = {"xpos":-1,"ypos":-1,"radius":5};
	this.setMousePos = function(xpos, ypos)
	{
		this.mouse.xpos = xpos;
		this.mouse.ypos = ypos;
	}
	this.getMouse = function()
	{
		return this.mouse;
	}
	this.getObjects = function()
	{
		return this.objects;
	}
	this.getObjectIndexFromName = function(object_name)
	{
		var object_index = -1;
		for (object_index = 0; object_index < this.objects.length; object_index++)
		{
			if (this.objects[object_index].name == object_name)
				return object_index;
		}
		return -1;	//not found
	}
	this.removeObject = function(object_index)
	{
		this.objects.splice(object_index,1);
	}
}

//Handles various events driven by browser or communication with server
function BrowserController(parent)
{
	function GameObjectController(parent, model)
	{
		this.parent = parent;
		this.model = model;

		//this method seems appropriate from an Object-oriented standpoint, but 
		// the drawing gets handled within the view and this is left uncalled
		this.draw = function()
		{
			this.parent.view.drawObject(this.model);
		}
		//check to see if a mouse click event should trigger an action for this object
		this.handleClick = function(xpos, ypos)
		{
			if (xpos >= this.model.xpos - this.model.width/2 && xpos < this.model.xpos + this.model.width/2 &&
				ypos >= this.model.ypos - this.model.height/2 && ypos < this.model.ypos + this.model.height/2)
			{
				if (this.model.type == "foe")
				{
					this.handleHit(1);
				}
			}
		}
		this.handleHit = function(damage)
		{
			this.model.hit_points -= damage;
			console.log(this.model.hit_points);
			if (this.model.hit_points <= 0)
			{
				this.parent.destroyObjectByName(this.model.name);
			}
		}
	}

	this.parent = parent;
	this.model = parent.model;
	this.view = parent.view;
	this.objects = new Array();

	var controller = this;
	// This starts an animation loop that cycles at browser refesh intervals
	function animate()
	{
		requestAnimationFrame( animate );
		controller.handleTick();
	}

	this.handleTick = function()
	{
		this.model.objects.forEach(function(object)
		{
			//update object positons accoring to their velocities
			object.xpos += object.xvel;
			object.ypos += object.yvel;
			//update object velocity when detecting collisions/out-of-bounds
			if (object.ypos < 0 || object.ypos > $('#game_canvas')[0].height)
			{
				object.yvel *= -1;
			}
			if (object.xpos < 0 || object.xpos > $('#game_canvas')[0].width)
			{
				object.xvel *= -1;
			}
			
		});
		this.handleRedraw();
	}


	this.init = function()
	{
		this.model.objects.forEach(function(object)
		{
			controller.objects.push(new GameObjectController(controller,object));
		});
		this.waitForResources();
		this.registerBrowserEventHandlers();
//		this.view.draw(this.model);
		animate();
	}

	this.handleRedraw = function()
	{
		this.view.draw(this.model);
	}

	// This is where key press events are handled
	this.handleKey = function(KeyEvent)
	{
		var key_pressed = String.fromCharCode(KeyEvent.which)
		var message_string = "event_type=key_press&char=" + key_pressed;
		console.log(message_string);
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
		this.model.setMousePos(xpos,ypos);
		this.checkHits(xpos,ypos);
		this.handleRedraw();
	}

	//checks position against each object to see whether a click was within the object's bounding box
	this.checkHits = function(xpos, ypos)
	{
		this.objects.forEach(function(object)
		{
			object.handleClick(xpos,ypos);
		});
	}

	this.destroyObjectByName = function(object_name)
	{
		var object_index = this.model.getObjectIndexFromName(object_name);
		this.objects.splice(object_index,1);
		this.model.removeObject(object_index);
	}

	this.registerBrowserEventHandlers = function()
	{

		//Assign this object's handler methods to jQuery's event handlers
		$(document).keypress(this.handleKey);
		$(document).mousedown(function(mouse_event) { controller.handleMouse(mouse_event) });
		//$(document).mouseup(function(mouse_event) { controller.handleMouse(mouse_event) });
		//$(document).mousemove(function(mouse_event) { controller.handleMousemouse_event() });

		//disable context menu on right click
		document.oncontextmenu = function() {return false;};

		//pass on resize events to appropriate screen
		window.onresize=(function() { controller.handleRedraw() });
	}
	this.waitForResources = function()
	{
		//TODO: Wait for all resources (e.g. images, sounds) to finish loading before handling stuff
		//		Display a "Loading..." splash screen while this is happening
	}
}

// Handles display of game in browser
function BrowserView()
{
	// Initialize members
	this.canvas = $('#game_canvas')[0];
	this.canvas_context = this.canvas.getContext("2d");
	var view = this;

	// This gets called to update the canvas whenever something has changed
	this.clear = function()
	{
		this.canvas_context.clearRect(0,0,this.canvas.width,this.canvas.height);
	}

	// This gets called to update the canvas whenever something has changed
	this.draw = function(model)
	{
		if (this != null)
		{
			//this.clear();
			this.drawBackground(model);
			this.drawControls(model);
			this.drawObjects(model);
		}
	}

	// This draws the background of the canvas
	this.drawBackground = function(model)
	{
		//For now, just clear the canvas with a black color as a default background
		this.canvas_context.fillStyle="#000000";
		//this.canvas_context.fillStyle="#CCCCCC";
		this.canvas_context.fillRect(0,0,this.canvas.width,this.canvas.height);
	}

	// This draws the game controls on the canvas
	this.drawControls = function(model)
	{
		var mouse = model.getMouse();
		if (mouse.xpos >= 0 && mouse.ypos >=0)
		{
			this.canvas_context.strokeStyle="#00c000";
			this.canvas_context.beginPath();
			this.canvas_context.arc(mouse.xpos, mouse.ypos, mouse.radius, -1, 2 * Math.PI);
			this.canvas_context.stroke();
		}
	}

	// This draws the image corresponding to each sprite object at is corresponding position
	this.drawObjects = function(model)
	{
		model.objects.forEach(function(object)
		{
			view.drawObject(object);
		});
	}

	this.drawObject = function(object)
	{
			this.canvas_context.drawImage(object.image, object.xpos-(object.width/2), object.ypos-(object.height/2), object.width, object.height);
	}
}
