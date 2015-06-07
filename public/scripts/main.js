var scene = require('./components/scene');
var client = require('./components/client');
var video = require('./components/video');
var bubble = require('./components/bubble');
var messageStore = require('./store/MessagesStore');

scene.init();
client.init();
bubble.init();
video.init();

window.scene = scene.cssscene;
window.camera = scene.camera;

var clock = new THREE.Clock();

// The render loop
function render() {
	var delta = clock.getDelta();
	scene.camControls.update(delta);

	if (video.video) {
		if ( video.video.readyState === video.video.HAVE_ENOUGH_DATA ) {
			video.videoImageContext.drawImage( video.video, 0, 0 );
			if ( video.videoTexture ) 
				video.videoTexture.needsUpdate = true;
		}
	}

	requestAnimationFrame( render );
	scene.renderer.render( scene.scene, scene.camera );
	scene.cssrenderer.render( scene.cssscene, scene.camera );
}
render();


// Listen for keyboard events
function onkey(event) {
	event.preventDefault();
	if (event.keyCode == 80) { // p (pause)
		// Toggle camera look speed on/off
		(scene.camControls.lookSpeed > 0.0) ? scene.camControls.lookSpeed = 0.0 : scene.camControls.lookSpeed = 0.2;	
	} 
};
window.addEventListener("keydown", onkey, true);