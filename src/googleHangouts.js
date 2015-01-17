var chillweb = {};
chillweb.googleHangouts = angular.module('googleHangouts', []);

chillweb.EventController = function(target, name) {
	this._target = target;
	this._name = name;
};

chillweb.EventController.prototype.add = function(callback) {
	this._target.addListener(this.name, callback);
};

chillweb.EventController.prototype.remove = function(callback) {
	this._target.removeListener(this.name, callback);
};

chillweb.EventController.prototype.emit = function(args) {
	this._target.emitEvent(this.name, args);
};

chillweb.CommandController = function(target) {
	this._target = target;
};

chillweb.CommandController.prototype.add = function(name, callback) {
	if(!name) {
		throw 'Command name is required.'
	}
	
	this._target.addListener('!' + this.name, callback);
};

chillweb.CommandController.prototype.remove = function(name, callback) {
	if(!name) {
		throw 'Command name is required.'
	}
	
	this._target.removeListener('!' + this.name, callback);
};

chillweb.CommandController.prototype.emit = function(name, args) {
	if(!name) {
		throw 'Command name is required.'
	}

	var evt = name.indexOf('!') === 0 ? name : '!' + name;
	this._target.emitEvent(evt, args);
};


chillweb.Hangout = function() {
	this.isReady = false;
	this.myId = null;
	this.participants = [];
	this.onUpdate = new chillweb.EventController(this, 'update'); // param: none
	this.onNewParticipant = new chillweb.EventController(this, 'newParticipant') // param: newParticipant
	this.commands = new chillweb.CommandController();
	this.state = {}; // TODO: default state
};

_.extend(chillweb.Hangout.prototype, EventEmitter.prototype);

chillweb.Hangout.prototype.sendState: function() {

};

chillweb.Hangout.prototype._setParticipants: function(participants, action) {
	/* actions:
		 	 sync = insert/update participants as online, & mark extras offline
		 	 update = insert/update participants as online
		 	 delete = insert/update participants as offline
	*/
	var markOnline = action === 'sync' || action === 'update';
	var markExtrasOffline = action === 'sync';

	for (var e = participants.length - 1; e >= 0; e--) {
		var found = false;			
		var current = participants[e];

		_.where(this.participants, { id: current.id }).forEach(function upsert(existing) {

			_.merge(existing, current);
			existing.$online = markOnline;
			found = true;
		});

		// for (var s = $scope.people.length - 1; s >= 0; s--) {
		// 	if( $scope.people[s].id === participants[e].id ) {
		// 		found = true;
		// 		$scope.people[s].hasAppEnabled = participants[e].hasAppEnabled;
		// 		$scope.people[s].online = true;
		// 	}
		// }

		if(!found) {
			var newParticipant = { $state: {}}; // TODO: default state
			_.merge(newParticipant, current);
			newParticipant.$online = markOnline;

			this.onNewParticipant.emit(newParticipant);
			this.participants.push(newParticipant);
			// 	id: participants[e].id,
			// 	displayName: participants[e].person.displayName,
			// 	image: participants[e].person.image.url,
			// 	state: createDefaultState(),
			// 	online: true
			// });
		}
	} // for: eventObj.participants

	if(markExtrasOffline) {
		var known = _.values(participants, 'id');

		_.where(this.participants, function filter(item) {
			// is unknown?
			return known.indexOf(item.id) === -1;
		}).forEach(function markOffline(item) {
			item.$online = false;
		});
	}
}; //_setParticipants

// chillweb.Hangout.prototype._setState = function(eventObj) {
	// $scope.consensus = false;

	// for (var e = eventObj.addedKeys.length - 1; e >= 0; e--) {

	// 	if(eventObj.addedKeys[e].key === '!resetAll') {
	// 		if(eventObj.addedKeys[e].value != $scope.lastReset) {
	// 			$scope.resetMe(eventObj.addedKeys[e].value);
	// 		}
	// 	} else if(eventObj.addedKeys[e].key === '!reveal') {
	// 		var r = JSON.parse(eventObj.addedKeys[e].value);
	// 		$scope.applyReveal(r);
	// 	} else {
	// 		for (var s = $scope.people.length - 1; s >= 0; s--) {
	// 			if( $scope.people[s].id === eventObj.addedKeys[e].key ) {
	// 				$scope.people[s].state = JSON.parse(eventObj.addedKeys[e].value);
	// 			}
	// 		}
	// 	}
	// }

	// $scope.update();
// };

chillweb.googleHangouts.factory('hangout', function() {

	var hangout = new chillweb.Hangout();	

	gapi.hangout.onApiReady.add(function(eventObj){		
		console.log('onApiReady', eventObj);
		if (eventObj.isApiReady) {


			var participants = gapi.hangout.getParticipants();
			var state = gapi.hangout.data.getState();

			hangout._setParticipants(participants, 'sync');
			hangout.myId = gapi.hangout.getLocalParticipantId();
			hangout.isReady = true;
			// Create a similar object to the state change event
		// 	var e = { addedKeys: [] };
		// 	for(var key in state) {
		// 		if (state.hasOwnProperty(key)) {
		// 			e.addedKeys.push({ key: key, value: state[key] });
		// 		}
		// 	}
		// 	$scope.applyStateChange(e);
		// }

		// $scope.update();
		// $scope.autoSizeMainList();
		}
	});

	gapi.hangout.data.onStateChanged.add(function(eventObj) {
		console.log('onStateChanged', eventObj);
		for (var i = 0; i < eventObj.addedKeys.length; i++) {
			var item = eventObj.addedKeys[i];

			if(item.key.indexOf('!') === 0) {
				hangout.commands.emit(item.key, JSON.parse(item.value));
			} else {
				var p = [{
					id: item.key,
					$state: JSON.parse(item.value)
				}];

				hangout._setParticipants(p, 'update');
			}
		};

		// $scope.applyStateChange(eventObj);
	});

	gapi.hangout.onParticipantsChanged.add(function(eventObj) {
		console.log('onParticipantsChanged', eventObj);
		hangout._setParticipants(eventObj.participants, 'sync');
		// $scope.applyParticipants(eventObj.participants);
		// $scope.update();
		// $scope.autoSizeMainList();
	});

	// gapi.hangout.onParticipantsRemoved.add(function(eventObj) {
	// 	for (var e = eventObj.removedParticipants.length - 1; e >= 0; e--) {
	// 		for (var s = $scope.people.length - 1; s >= 0; s--) {
	// 			if(eventObj.removedParticipants[e].id == $scope.people[s].id) {
	// 				$scope.people[s].online = false;
	// 			}
	// 		}
	// 	}

	// 	$scope.update();
	// 	$scope.autoSizeMainList();
	// });


	return hangout;
});