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
	function GameObject(name, image, xpos, ypos, xvel, yvel, width, height)
	{
		//string identifer of object
		this.name = name;

		//position of object on canvas
		this.xpos = xpos;
		this.ypos = ypos;

		//velocity of object (change in position per tick)
		this.xvel = xvel;
		this.yvel = yvel;

		//the horizontal and vertical dimensions of the object on the canvas
		this.width = width;
		this.height = height;

		//the image file, loaded my name of image file
		this.image = new Image();
		this.image.src = "../dist/img/" + image;

	}
	this.parent = parent;
	this.objects = new Array();
	//temporary test data
	canvas = $('#game_canvas')[0];
	this.objects.push(new GameObject("tower","sphere.png",canvas.width/2,canvas.height/2,0,0,50,50));
	this.objects.push(new GameObject("foe1","cube.png",canvas.width/2,0,0,1,50,50));
	this.objects.push(new GameObject("foe2","cube.png",0,canvas.height/2,1,0,50,50));
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
}

//Handles various events driven by browser or communication with server
function BrowserController(parent)
{
	this.parent = parent;
	this.model = parent.model;
	this.view = parent.view;

	var controller = this;
	// This starts an animation loop that cycles at browser refesh intervals
	function animate()
	{
		requestAnimationFrame( animate );
		controller.handleTick();
	}

	this.handleTick = function()
	{
		console.log("tick");
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
			
		});
		this.handleRedraw();
	}


	this.init = function()
	{
		this.view.draw(this.model);
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
		if (!MouseEvent) var MouseEvent = window.event;
		var elementClicked = MouseEvent.target;
		if (MouseEvent.offsetX || MouseEvent.offsetY)
		{
			xpos = Math.floor(MouseEvent.offsetX * elementClicked.width / elementClicked.offsetWidth);
			ypos = Math.floor(MouseEvent.offsetY * elementClicked.height / elementClicked.offsetHeight);
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

		var message_string = "event_type=" + MouseEvent.type + "&mouse_x=" + xpos + "&mouse_y=" +ypos;
		console.log(message_string);
		this.model.setMousePos(xpos,ypos);
		this.handleRedraw();
	}

	var event_handler = this;
	//Assign this object's handler methods to jQuery's event handlers
	$(document).keypress(this.handleKey);
	$(document).mousedown(function() { event_handler.handleMouse() });
	$(document).mouseup(function() { event_handler.handleMouse() });
	//$(document).mousemove(function() { event_handler.mouse() });

	//disable context menu on right click
	document.oncontextmenu = function() {return false;};

	//pass on resize events to appropriate screen
	window.onresize=(function() { event_handler.handleRedraw() });
}

// Handles display of game in browser
function BrowserView()
{
	// Initialize members
	this.canvas = $('#game_canvas')[0];
	this.canvas_context = this.canvas.getContext("2d");

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
		var context = this.canvas_context;
		model.objects.forEach(function(object)
		{
			context.drawImage(object.image, object.xpos-(object.width/2), object.ypos-(object.height/2), object.width, object.height);
		});
	}

}
