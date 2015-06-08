(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * Copyright (c) 2014-2015, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

module.exports.Dispatcher = require('./lib/Dispatcher')

},{"./lib/Dispatcher":2}],2:[function(require,module,exports){
/*
 * Copyright (c) 2014, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule Dispatcher
 * @typechecks
 */

"use strict";

var invariant = require('./invariant');

var _lastID = 1;
var _prefix = 'ID_';

/**
 * Dispatcher is used to broadcast payloads to registered callbacks. This is
 * different from generic pub-sub systems in two ways:
 *
 *   1) Callbacks are not subscribed to particular events. Every payload is
 *      dispatched to every registered callback.
 *   2) Callbacks can be deferred in whole or part until other callbacks have
 *      been executed.
 *
 * For example, consider this hypothetical flight destination form, which
 * selects a default city when a country is selected:
 *
 *   var flightDispatcher = new Dispatcher();
 *
 *   // Keeps track of which country is selected
 *   var CountryStore = {country: null};
 *
 *   // Keeps track of which city is selected
 *   var CityStore = {city: null};
 *
 *   // Keeps track of the base flight price of the selected city
 *   var FlightPriceStore = {price: null}
 *
 * When a user changes the selected city, we dispatch the payload:
 *
 *   flightDispatcher.dispatch({
 *     actionType: 'city-update',
 *     selectedCity: 'paris'
 *   });
 *
 * This payload is digested by `CityStore`:
 *
 *   flightDispatcher.register(function(payload) {
 *     if (payload.actionType === 'city-update') {
 *       CityStore.city = payload.selectedCity;
 *     }
 *   });
 *
 * When the user selects a country, we dispatch the payload:
 *
 *   flightDispatcher.dispatch({
 *     actionType: 'country-update',
 *     selectedCountry: 'australia'
 *   });
 *
 * This payload is digested by both stores:
 *
 *    CountryStore.dispatchToken = flightDispatcher.register(function(payload) {
 *     if (payload.actionType === 'country-update') {
 *       CountryStore.country = payload.selectedCountry;
 *     }
 *   });
 *
 * When the callback to update `CountryStore` is registered, we save a reference
 * to the returned token. Using this token with `waitFor()`, we can guarantee
 * that `CountryStore` is updated before the callback that updates `CityStore`
 * needs to query its data.
 *
 *   CityStore.dispatchToken = flightDispatcher.register(function(payload) {
 *     if (payload.actionType === 'country-update') {
 *       // `CountryStore.country` may not be updated.
 *       flightDispatcher.waitFor([CountryStore.dispatchToken]);
 *       // `CountryStore.country` is now guaranteed to be updated.
 *
 *       // Select the default city for the new country
 *       CityStore.city = getDefaultCityForCountry(CountryStore.country);
 *     }
 *   });
 *
 * The usage of `waitFor()` can be chained, for example:
 *
 *   FlightPriceStore.dispatchToken =
 *     flightDispatcher.register(function(payload) {
 *       switch (payload.actionType) {
 *         case 'country-update':
 *           flightDispatcher.waitFor([CityStore.dispatchToken]);
 *           FlightPriceStore.price =
 *             getFlightPriceStore(CountryStore.country, CityStore.city);
 *           break;
 *
 *         case 'city-update':
 *           FlightPriceStore.price =
 *             FlightPriceStore(CountryStore.country, CityStore.city);
 *           break;
 *     }
 *   });
 *
 * The `country-update` payload will be guaranteed to invoke the stores'
 * registered callbacks in order: `CountryStore`, `CityStore`, then
 * `FlightPriceStore`.
 */

  function Dispatcher() {
    this.$Dispatcher_callbacks = {};
    this.$Dispatcher_isPending = {};
    this.$Dispatcher_isHandled = {};
    this.$Dispatcher_isDispatching = false;
    this.$Dispatcher_pendingPayload = null;
  }

  /**
   * Registers a callback to be invoked with every dispatched payload. Returns
   * a token that can be used with `waitFor()`.
   *
   * @param {function} callback
   * @return {string}
   */
  Dispatcher.prototype.register=function(callback) {
    var id = _prefix + _lastID++;
    this.$Dispatcher_callbacks[id] = callback;
    return id;
  };

  /**
   * Removes a callback based on its token.
   *
   * @param {string} id
   */
  Dispatcher.prototype.unregister=function(id) {
    invariant(
      this.$Dispatcher_callbacks[id],
      'Dispatcher.unregister(...): `%s` does not map to a registered callback.',
      id
    );
    delete this.$Dispatcher_callbacks[id];
  };

  /**
   * Waits for the callbacks specified to be invoked before continuing execution
   * of the current callback. This method should only be used by a callback in
   * response to a dispatched payload.
   *
   * @param {array<string>} ids
   */
  Dispatcher.prototype.waitFor=function(ids) {
    invariant(
      this.$Dispatcher_isDispatching,
      'Dispatcher.waitFor(...): Must be invoked while dispatching.'
    );
    for (var ii = 0; ii < ids.length; ii++) {
      var id = ids[ii];
      if (this.$Dispatcher_isPending[id]) {
        invariant(
          this.$Dispatcher_isHandled[id],
          'Dispatcher.waitFor(...): Circular dependency detected while ' +
          'waiting for `%s`.',
          id
        );
        continue;
      }
      invariant(
        this.$Dispatcher_callbacks[id],
        'Dispatcher.waitFor(...): `%s` does not map to a registered callback.',
        id
      );
      this.$Dispatcher_invokeCallback(id);
    }
  };

  /**
   * Dispatches a payload to all registered callbacks.
   *
   * @param {object} payload
   */
  Dispatcher.prototype.dispatch=function(payload) {
    invariant(
      !this.$Dispatcher_isDispatching,
      'Dispatch.dispatch(...): Cannot dispatch in the middle of a dispatch.'
    );
    this.$Dispatcher_startDispatching(payload);
    try {
      for (var id in this.$Dispatcher_callbacks) {
        if (this.$Dispatcher_isPending[id]) {
          continue;
        }
        this.$Dispatcher_invokeCallback(id);
      }
    } finally {
      this.$Dispatcher_stopDispatching();
    }
  };

  /**
   * Is this Dispatcher currently dispatching.
   *
   * @return {boolean}
   */
  Dispatcher.prototype.isDispatching=function() {
    return this.$Dispatcher_isDispatching;
  };

  /**
   * Call the callback stored with the given id. Also do some internal
   * bookkeeping.
   *
   * @param {string} id
   * @internal
   */
  Dispatcher.prototype.$Dispatcher_invokeCallback=function(id) {
    this.$Dispatcher_isPending[id] = true;
    this.$Dispatcher_callbacks[id](this.$Dispatcher_pendingPayload);
    this.$Dispatcher_isHandled[id] = true;
  };

  /**
   * Set up bookkeeping needed when dispatching.
   *
   * @param {object} payload
   * @internal
   */
  Dispatcher.prototype.$Dispatcher_startDispatching=function(payload) {
    for (var id in this.$Dispatcher_callbacks) {
      this.$Dispatcher_isPending[id] = false;
      this.$Dispatcher_isHandled[id] = false;
    }
    this.$Dispatcher_pendingPayload = payload;
    this.$Dispatcher_isDispatching = true;
  };

  /**
   * Clear bookkeeping used for dispatching.
   *
   * @internal
   */
  Dispatcher.prototype.$Dispatcher_stopDispatching=function() {
    this.$Dispatcher_pendingPayload = null;
    this.$Dispatcher_isDispatching = false;
  };


module.exports = Dispatcher;

},{"./invariant":3}],3:[function(require,module,exports){
/**
 * Copyright (c) 2014, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule invariant
 */

"use strict";

/**
 * Use invariant() to assert state which your program assumes to be true.
 *
 * Provide sprintf-style format (only %s is supported) and arguments
 * to provide information about what broke and what you were
 * expecting.
 *
 * The invariant message will be stripped in production, but the invariant
 * will remain to ensure logic does not differ in production.
 */

var invariant = function(condition, format, a, b, c, d, e, f) {
  if (false) {
    if (format === undefined) {
      throw new Error('invariant requires an error message argument');
    }
  }

  if (!condition) {
    var error;
    if (format === undefined) {
      error = new Error(
        'Minified exception occurred; use the non-minified dev environment ' +
        'for the full error message and additional helpful warnings.'
      );
    } else {
      var args = [a, b, c, d, e, f];
      var argIndex = 0;
      error = new Error(
        'Invariant Violation: ' +
        format.replace(/%s/g, function() { return args[argIndex++]; })
      );
    }

    error.framesToPop = 1; // we don't care about invariant's own frame
    throw error;
  }
};

module.exports = invariant;

},{}],4:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],5:[function(require,module,exports){
/**
 * Copyright 2013-2014 Facebook, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

"use strict";

/**
 * Constructs an enumeration with keys equal to their value.
 *
 * For example:
 *
 *   var COLORS = keyMirror({blue: null, red: null});
 *   var myColor = COLORS.blue;
 *   var isColorValid = !!COLORS[myColor];
 *
 * The last line could not be performed if the values of the generated enum were
 * not equal to their keys.
 *
 *   Input:  {key1: val1, key2: val2}
 *   Output: {key1: key1, key2: key2}
 *
 * @param {object} obj
 * @return {object}
 */
var keyMirror = function(obj) {
  var ret = {};
  var key;
  if (!(obj instanceof Object && !Array.isArray(obj))) {
    throw new Error('keyMirror(...): Argument must be an object.');
  }
  for (key in obj) {
    if (!obj.hasOwnProperty(key)) {
      continue;
    }
    ret[key] = key;
  }
  return ret;
};

module.exports = keyMirror;

},{}],6:[function(require,module,exports){
'use strict';

function ToObject(val) {
	if (val == null) {
		throw new TypeError('Object.assign cannot be called with null or undefined');
	}

	return Object(val);
}

module.exports = Object.assign || function (target, source) {
	var pendingException;
	var from;
	var keys;
	var to = ToObject(target);

	for (var s = 1; s < arguments.length; s++) {
		from = arguments[s];
		keys = Object.keys(Object(from));

		for (var i = 0; i < keys.length; i++) {
			try {
				to[keys[i]] = from[keys[i]];
			} catch (err) {
				if (pendingException === undefined) {
					pendingException = err;
				}
			}
		}
	}

	if (pendingException) {
		throw pendingException;
	}

	return to;
};

},{}],7:[function(require,module,exports){
var AppDispatcher = require('../dispatcher/AppDispatcher');
var Constants = require('../constants/AppConstants');

module.exports = {
	send: function(socket, message) {
		socket.emit('message', {   uuid: window.uuid,
									   message: message
								  });
	},

	recieve: function(data) {
		AppDispatcher.handleViewAction({
			type: Constants.ActionTypes.INCOMING_MESSAGE,
			message: data['message'],
			uuid: data['uuid']
		});
	},

	new_user: function(data) {
		AppDispatcher.handleServerAction({
			type: Constants.ActionTypes.NEW_CLIENT,
			uuid: data['uuid'],
			location: data['location']
		});
	},

	setup_user: function(uuid, location) {
		AppDispatcher.handleServerAction({
			type: Constants.ActionTypes.EXISTING_USER,
			uuid: uuid,
			location: location
		});
	}
}
},{"../constants/AppConstants":12,"../dispatcher/AppDispatcher":13}],8:[function(require,module,exports){
var Scene = require('../components/scene');
var MessagesStore = require('../store/MessagesStore');

var _bubbles = {}; // maintain all the bubbles for each client

/**
 * Create a new bubble at the given coordinates
 * @param {integer} x coordinate
 * @param {integer} y coordinate
 * @param {integer} z coordinate
 * @return {object} the bubble CSS3DObject object
 */
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
	/**
	 * Create listeners for new users and incoming messages
	 */
	init: function() {
		MessagesStore.addClientListener(this._onUserAdd);
		MessagesStore.addMessageListener(this._onMessage);
	},

	/**
	 * Handle new users
	 */
	_onUserAdd: function() {
		var location = MessagesStore.getLocation();
		var user = MessagesStore.getMostRecentUser();
		var bubble = createNewBubble(location['x'], location['y'], location['z']);
		_bubbles[user] = {"bubble": bubble};
	},

	/**
	 * Handle incoming messages
	 */
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
},{"../components/scene":10,"../store/MessagesStore":15}],9:[function(require,module,exports){
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
},{"../components/scene":10,"../store/MessagesStore":15}],10:[function(require,module,exports){
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

},{"../actions/MessageActions":7}],11:[function(require,module,exports){
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
		var movieHeight = 100;
		var movieMaterial = new THREE.MeshBasicMaterial( { map: videoTexture, overdraw: true, side:THREE.DoubleSide } );
		// the geometry on which the movie will be displayed;
		// movie image will be scaled to fit these dimensions.
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
},{"../components/scene":10}],12:[function(require,module,exports){
var keyMirror = require('keyMirror');

module.exports = {
	ActionTypes: keyMirror({
		OUTGOING_MESSAGE: null,
		INCOMING_MESSAGE: null,
		EXISTING_USER: null,
		NEW_CLIENT: null
	}),

	ActionSources: keyMirror({
		SERVER_ACTION: null,
		VIEW_ACTION: null
	})
}
},{"keyMirror":5}],13:[function(require,module,exports){
var Dispatcher = require('flux').Dispatcher;
var Constants = require('../constants/AppConstants');

var AppDispatcher = new Dispatcher();

AppDispatcher.handleServerAction = function(action) {
	this.dispatch({
		source: Constants.ActionSources.SERVER_ACTION,
		action: action
	});
};

AppDispatcher.handleViewAction = function(action) {
	this.dispatch({
		source: Constants.ActionSources.VIEW_ACTION,
		action: action
	});
};

module.exports = AppDispatcher;
},{"../constants/AppConstants":12,"flux":1}],14:[function(require,module,exports){
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
},{"./components/bubble":8,"./components/client":9,"./components/scene":10,"./components/video":11,"./store/MessagesStore":15}],15:[function(require,module,exports){
var AppDispatcher = require('../dispatcher/AppDispatcher');
var AppConstants = require('../constants/AppConstants');
var EventEmitter = require('events').EventEmitter;
var assign = require('object-assign');

var NEW_CLIENT = 'new_client';
var NEW_MESSAGE = 'new_message';

_users = {}; // store the uuid of each user along with attributes
_most_recent_location = null;
_most_recent_user = null;

/**
 * Create a store for the incoming messages along with the users.
 */
var MessagesStore = assign({}, EventEmitter.prototype, {
	/**
	 * Add the given user with uuid and location.
	 * @param {string} uuid representation of the unique identifier
	 * @param {object} location that stores the x, y, and z coordinates of this user
	*/
	addUser: function(uuid, location) {
		_users[uuid] = {"location": location};
		_most_recent = location;
		_most_recent_user = uuid;
	},

	/**
	 * Add a message for the user with id uuid
	 * @param {string} uuid representation of the unique identifier
	 * @param {string} message for the incoming message
	*/
	addMessage: function(uuid, message) {
		_users[uuid]["message"] = message;
		_most_recent_user = uuid;
	},

	/**
	 * Return the most recent user that was modified/added
	 * @return {object} user object
	 */
	getMostRecentUser: function() {
		return _most_recent_user;
	},

	/** 
	 * @return {object} location for the most recent user
	 */
	getLocation: function() {
		return _most_recent;
	},

	/**
	 * @param {string} uuid unique identifier for user
	 * @return {string} most recent message for user
	 */
	getLatestMessage: function(uuid) {
		return _users[uuid]["message"];
	},

	emitClient: function() {
		this.emit(NEW_CLIENT);
	},

	addClientListener: function(callback) {
		this.on(NEW_CLIENT, callback);
	},

	removeClientListener: function(callback) {
		this.removeListener(NEW_CLIENT, callback);
	},

	emitMessage: function() {
		this.emit(NEW_MESSAGE);
	},

	addMessageListener: function(callback) {
		this.on(NEW_MESSAGE, callback);
	},

	removeMessageListener: function(callback) {
		this.removeListener(NEW_MESSAGE, callback);
	}
});

AppDispatcher.register(function(payload) {
	var action = payload.action;

	switch (action.type) {
		case AppConstants.ActionTypes.INCOMING_MESSAGE:
			if (action.uuid !== window.uuid) {
				// This message came from the outside.
				MessagesStore.addMessage(action.uuid, action.message)
				MessagesStore.emitMessage();
			}
			break;
		case AppConstants.ActionTypes.NEW_CLIENT:
			if (action.uuid !== window.uuid) {
				// This is not me...
				MessagesStore.addUser(action.uuid, action.location);
				MessagesStore.emitClient(); // notify the view of this change
			}
			break;
		case AppConstants.ActionTypes.EXISTING_USER:
			if (action.uuid !== window.uuid) {
				// This is not me...
				MessagesStore.addUser(action.uuid, action.location);
				MessagesStore.emitClient(); // notify the view of this change
			}
			break;
		default:
			return true;
	}
});

module.exports = MessagesStore;
},{"../constants/AppConstants":12,"../dispatcher/AppDispatcher":13,"events":4,"object-assign":6}]},{},[14])