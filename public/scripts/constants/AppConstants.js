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