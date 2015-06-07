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