var Scene = require('../components/scene');

var video, videoImage, videoImageContext, videoTexture;

// Set up video
video = document.createElement( 'video' );
video.src = "videos/darkknight.mp4";
video.load(); // must call after setting/changing source

videoImage = document.createElement( 'canvas' );
videoImage.width = 600;
videoImage.height = 250;

videoImageContext = videoImage.getContext( '2d' );
// background color if no video present
videoImageContext.fillStyle = '#FFFFFF';
videoImageContext.fillRect( 0, 0, videoImage.width, videoImage.height );
videoTexture = new THREE.Texture( videoImage );
videoTexture.minFilter = THREE.LinearFilter;
videoTexture.magFilter = THREE.LinearFilter;

var Video = {
	init: function() {
		// Scene.camera.position.set(0, 60, 25);
		// Scene.camera.lookAt(new THREE.Vector3(0, 70, -1));

		// var skyBoxGeometry = new THREE.BoxGeometry( 10000, 10000, 10000 );
		// var skyBoxMaterial = new THREE.MeshBasicMaterial( { color: 0x4466ff, side: THREE.BackSide } );
		// var skyBox = new THREE.Mesh( skyBoxGeometry, skyBoxMaterial );
		// Scene.scene.add(skyBox);

		var movieHeight = 100;
		var movieMaterial = new THREE.MeshBasicMaterial( { map: videoTexture, overdraw: true, side:THREE.DoubleSide } );
		// the geometry on which the movie will be displayed;
		// 	movie image will be scaled to fit these dimensions.
		// var movieMaterial = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
		var movieGeometry = new THREE.PlaneGeometry( 240*2, 100*2, 4, 4 );
		var movieScreen = new THREE.Mesh( movieGeometry, movieMaterial );
		movieScreen.position.set(0, 100, 0);
		Scene.scene.add(movieScreen);

		video.play();
	},

	video: video,
	videoImage: videoImage,
	videoImageContext: videoImageContext,
	videoTexture: videoTexture
}

module.exports = Video;