var Scene = require('../components/scene');
var MessagesStore = require('../store/MessagesStore');

var _bubbles = {}; // maintain all the bubbles for each client

function createNewBubble(x, y, z) {
	var element = document.createElement( 'div' );
	element.className = 'element';
	element.style.backgroundColor = 'rgba(0,127,127,' + ( Math.random() * 0.5 + 0.25 ) + ')';

	var bubble = document.createElement( 'div' );
	bubble.className = 'bubble';
	bubble.textContent = '...';
	element.appendChild( bubble );

	var object = new THREE.CSS3DObject( element );
	object.position.set(x, 150, z);
	object.lookAt(Scene.camera.position);

	object.visible = false;
	Scene.cssscene.add( object );
	
	return object;
}

var Bubble = {
	init: function() {
		MessagesStore.addClientListener(this._onUserAdd);
		MessagesStore.addMessageListener(this._onMessage);
	},

	_onUserAdd: function() {
		var location = MessagesStore.getLocation();
		var user = MessagesStore.getMostRecentUser();
		var bubble = createNewBubble(location['x'], location['y'], location['z']);
		_bubbles[user] = {"bubble": bubble};
	},

	_onMessage: function() {
		// make bubble visible
		var user = MessagesStore.getMostRecentUser();
		var message = MessagesStore.getLatestMessage(user);
		_bubbles[user]["bubble"].element.innerHTML = "<div class='bubble'>" + message + "</div>";
		_bubbles[user]["bubble"].visible = true;

		setTimeout(function(){ 
			_bubbles[user]["bubble"].visible = false;
		}, 10000);
	}
	
}	

module.exports = Bubble;