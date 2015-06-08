var Scene = require('../components/scene');
var MessagesStore = require('../store/MessagesStore');

/**
 * Add a new client (cube) to represent a new user.
 * @param {integer} x coordinate
 * @param {integer} y coordinate
 * @param {integer} z coordinate
 */
function addClient(x, y, z) {
	var geometry = new THREE.BoxGeometry( 50, 50, 50 );
	var material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
	var client = new THREE.Mesh( geometry, material );

	client.lookAt(Scene.camera.position);
	client.position.set(x, y, z);
	Scene.scene.add(client);
}

var Client = {
	/**
	 * Create listeners for new users
	 */
	init: function() {
		MessagesStore.addClientListener(this._onAdd);
	},

	/**
	 * Handle new users
	 */
	_onAdd: function() {
		var location = MessagesStore.getLocation();
		addClient(location['x'], location['y'], location['z']);
	}

}


module.exports = Client;