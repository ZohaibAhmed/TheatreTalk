var Scene = require('../components/scene');
var MessagesStore = require('../store/MessagesStore');

function addClient(x, y, z) {
	var geometry = new THREE.BoxGeometry( 50, 50, 50 );
	var material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
	var client = new THREE.Mesh( geometry, material );

	client.lookAt(Scene.camera.position);
	client.position.set(x, y, z);
	Scene.scene.add(client);
}

var Client = {
	init: function() {
		// Add this as a listener to change
		MessagesStore.addClientListener(this._onAdd);
	},

	_onAdd: function() {
		var location = MessagesStore.getLocation();
		addClient(location['x'], location['y'], location['z']);
	}

}


module.exports = Client;