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
		AppDispatcher.handleViewAction({
			type: Constants.ActionTypes.NEW_CLIENT,
			uuid: data['uuid'],
			location: data['location']
		});
	},

	setup_user: function(uuid, location) {
		AppDispatcher.handleViewAction({
			type: Constants.ActionTypes.EXISTING_USER,
			uuid: uuid,
			location: location
		});
	}
}