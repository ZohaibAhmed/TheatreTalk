var AppDispatcher = require('../dispatcher/AppDispatcher');
var AppConstants = require('../constants/AppConstants');
var EventEmitter = require('events').EventEmitter;
var assign = require('object-assign');

var NEW_CLIENT = 'new_client';
var NEW_MESSAGE = 'new_message';

_users = {}; // store the uuid of each user along with attributes
_most_recent_location = null;
_most_recent_user = null;

var MessagesStore = assign({}, EventEmitter.prototype, {
	addUser: function(uuid, location) {
		console.log("adding new user");
		console.log(location);
		_users[uuid] = {"location": location};
		_most_recent = location;
		_most_recent_user = uuid;
	},

	addMessage: function(uuid, message) {
		console.log("MESSAGE");
		console.log(message);
		_users[uuid]["message"] = message;
		_most_recent_user = uuid;
	},

	getMostRecentUser: function() {
		return _most_recent_user;
	},

	getLocation: function() {
		return _most_recent;
	},

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