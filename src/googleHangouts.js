var chillweb = {};
chillweb.googleHangouts = angular.module('googleHangouts', []);


chillweb.Hangout = function() {
	this._initQueue = [];
	this.isReady = false;
	this.myId = null;
	this.participants = [];
	// this.onUpdate = new chillweb.EventController(this, 'update'); // param: none
	// this.onNewParticipant = new chillweb.EventController(this, 'newParticipant') // param: newParticipant
	// this.commands = new chillweb.NamedEventController();
	this.myState = {}; // TODO: default state
};

_.extend(chillweb.Hangout.prototype, EventEmitter.prototype);

chillweb.Hangout.prototype._emitUpdate = function() {
	this.emit('update');
}
chillweb.Hangout.prototype._emitUpdate = _.debounce(chillweb.Hangout.prototype._emitUpdate, 100);


chillweb.Hangout.prototype.sendState = function() {
	if(this.isReady) {
		gapi.hangout.data.setValue('!' + this.myId, JSON.stringify(this.myState));
	} // else, will auto-send when ready
};
chillweb.Hangout.prototype.sendState = _.debounce(chillweb.Hangout.prototype.sendState, 250);


chillweb.Hangout.prototype.sendEvent = function(key, value) {
	if(this.isReady) {
		gapi.hangout.data.setValue(key, JSON.stringify(value));
	} else {
		this._initQueue.push(function() {
			this.sendEvent(key, value);
		}.bind(this));
	}
};


chillweb.Hangout.prototype._setParticipants = function(participants, action) {
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

			this.emit('beforeAddParticipant', newParticipant);
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
			while(hangout._initQueue.length) {
				var fn = hangout._initQueue.shift();
				fn();
			}

			hangout.sendState();
			hangout.emit('onApiReady');
			hangout._emitUpdate();

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
			var value = JSON.parse(item.value);

			hangout.emit(item.key, value);

			if(item.key.indexOf('!') !== 0) {
				var p = [{
					id: item.key,
					$state: value;
				}];

				hangout._setParticipants(p, 'update');
			}
		};

		hangout._emitUpdate();
		// $scope.applyStateChange(eventObj);
	});

	gapi.hangout.onParticipantsChanged.add(function(eventObj) {
		console.log('onParticipantsChanged', eventObj);
		hangout._setParticipants(eventObj.participants, 'sync');
		hangout._emitUpdate();
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