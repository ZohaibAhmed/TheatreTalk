# TheatreTalk - Discuss while watching a movie.

## Demo

If you don't want to clone this demo, you can visit http://theatretalk.zohaibahmed.com and use the app. Once there, you can use the mouse to look around. If there are other users present, you will see them as cubes (yay equality!). To speak to them, just talk into your mic, append your phrase with the word *say*. 

## Architecture

This app uses multiple technologies, the small websocket server is written in node/express, the front end uses three.js. The front-end architecture follows the Flux architecture. 

## Notes

* Chrome will ask you to constantly accept permissions for the mic. In order to make that smooth, you need to deploy this app with HTTPS.

## Setup

* Clone the repo
* From the root directory run: npm install
* Start the engine! node server.js
