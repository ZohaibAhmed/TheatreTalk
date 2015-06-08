var MessageActions = require('../actions/MessageActions');

var scene = new THREE.Scene();
var cssscene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 10000);
var renderer = new THREE.WebGLRenderer();

var cssrenderer = new THREE.CSS3DRenderer();
cssrenderer.setSize( window.innerWidth, window.innerHeight );
cssrenderer.domElement.style.position = 'absolute';
cssrenderer.domElement.style.top = 0;

camera.position.z = 500;

var camControls = new THREE.FirstPersonControls(camera);
camControls.lookSpeed = 0.2;
camControls.movementSpeed = 30;
camControls.noFly = true;
camControls.lookVertical = true;
camControls.constrainVertical = true;
camControls.verticalMin = 1.0;
camControls.verticalMax = 2.0;

/** Handle Socket Connection for this Scene **/

var SERVER = "http://localhost:3000/"
var socket = io.connect(SERVER, {origins: '*', 'sync disconnect on unload': true});

socket.on('uuid', function (data) {
	if (!window.uuid) {
		// this is me.
		window.uuid = data['uuid'];
	} else {
		MessageActions.new_user(data);
	}
});

socket.on('currentUsers', function(data) {
	var user_ids = Object.keys(data);

	for (i = 0; i < user_ids.length; i++) {
		MessageActions.setup_user(user_ids[i], data[user_ids[i]]); // uuid, location
	}
});

socket.on('incoming', function(data) {
	if (window.uuid) {
		// Dispatch incoming action
		MessageActions.recieve(data);
	}
});

/** Handle Speech Recognition for this Scene **/

if (annyang) {
	var commands = {
		'say *phrase': function(tag) {
			// trigger an action with this tag
			if (window.uuid) {
				MessageActions.send(socket, tag);
			}
		}
	};
	annyang.debug();
	annyang.addCommands(commands);
	annyang.start();
}

/** Fallback way of sending messages: Call me using the dev tools **/
window.sendMessage = function(message) {
	MessageActions.send(socket, message);
}

var Scene = {
	init: function() {
		renderer.setSize( window.innerWidth, window.innerHeight );
		document.body.appendChild( renderer.domElement );
		document.body.appendChild( cssrenderer.domElement);
	},

	scene: scene,
	cssscene: cssscene,
	camera: camera,
	renderer: renderer,
	cssrenderer: cssrenderer,
	camControls: camControls
}

module.exports = Scene;
