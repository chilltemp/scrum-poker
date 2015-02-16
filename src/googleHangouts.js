var chillweb = {};
chillweb.googleHangouts = angular.module('angular-hangouts', []);


chillweb.Hangout = function(defaults) {
	this._mergeCustomizer = function(objectValue, sourceValue, key, object, source) {
  	if(_.isArray(objectValue) && _.isArray(sourceValue)) {
  		objectValue.length = sourceValue.length;
  	}
  };
	this._mergeThisArg = null;
	this._defaultState = {};
	this._initQueue = [];
	this.debug = true;
	this.isReady = false;
	this.myId = null;
	this.participants = [];

	_.merge(this, defaults);
	this.myState = _.cloneDeep(this._defaultState);
};

_.extend(chillweb.Hangout.prototype, EventEmitter.prototype);

chillweb.Hangout.prototype._log = function(/*args*/) {
	if(this.debug) {
		console.log.apply(console, arguments);
	}
};

chillweb.Hangout.prototype._emitUpdate = function() {
	this._log('emit update');
	this.emit('update');
};
chillweb.Hangout.prototype._emitUpdate = _.debounce(chillweb.Hangout.prototype._emitUpdate, 100);


chillweb.Hangout.prototype.sendMyState = function() {
	this._log('sendState', this.myState);

	if(this.isReady) {
		gapi.hangout.data.setValue(this.myId, JSON.stringify(this.myState));
	} // else, will auto-send when ready
};
chillweb.Hangout.prototype.sendMyState = _.debounce(chillweb.Hangout.prototype.sendMyState, 250);


chillweb.Hangout.prototype.sendEvent = function(key, value) {
	if(this.isReady) {
		this._log('sendEvent', key, value);
		gapi.hangout.data.setValue(key, JSON.stringify(value));
	} else {
		this._log('sendEvent.queue', key);
		this._initQueue.push(function() {
			this.sendEvent(key, value);
		}.bind(this));
	}
};

chillweb.Hangout.prototype._mergeParticipant = function(dest, source) {
	if(this._mergeCustomizer) {
		var thisArg = this._mergeThisArg || this;
		_.merge(dest, source, this._mergeCustomizer, thisArg);
	} else {
		_.merge(dest, source);
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
	this._log('_setParticipants', participants, action, markOnline, markExtrasOffline);

	for (var e = participants.length - 1; e >= 0; e--) {
		var found = false;			
		var current = participants[e];

		_.where(this.participants, { id: current.id }).forEach(function upsert(existing) {

			this._mergeParticipant(existing, current);
			existing.$online = markOnline;
			found = true;
		}.bind(this));

		if(!found) {
			var newParticipant = { $state: _.cloneDeep(this._defaultState)};
			
			this._mergeParticipant(newParticipant, current);
			newParticipant.$online = markOnline;

			this.emit('beforeAddParticipant', newParticipant);
			this.participants.push(newParticipant);
		}
	} // for: eventObj.participants

	if(markExtrasOffline) {
		var known = _.pluck(participants, 'id');

		_.where(this.participants, function filter(item) {
			// is unknown?
			return known.indexOf(item.id) === -1;
		}).forEach(function markOffline(item) {
			item.$online = false;
		});
	}
}; //_setParticipants


chillweb.googleHangouts.provider('hangout', function() {

	this._defaults = {};

	this.setDefaultState = function(state) {
		this._defaults._defaultState = state;
	};

	// https://lodash.com/docs#merge
	this.setMergeCustomizer = function(customizer, thisArg) {
		this._defaults._mergeCustomizer = customizer;
		this._defaults._mergeThisArg = thisArg;
	};

	this.$get = function() {
		var hangout = new chillweb.Hangout(this._defaults);	

		gapi.hangout.onApiReady.add(function(eventObj){		
			hangout._log('onApiReady', eventObj);

			try {
				if (eventObj.isApiReady) {
					var participants = gapi.hangout.getParticipants();
					var state = gapi.hangout.data.getState();

					hangout._setParticipants(participants, 'sync');
					hangout.myId = '!' + gapi.hangout.getLocalParticipantId();

					hangout.isReady = true;
					while(hangout._initQueue.length) {
						var fn = hangout._initQueue.shift();
						fn();
					}

					hangout.sendMyState();
					hangout.emit('onApiReady');
					hangout._emitUpdate();
				}
			} catch(e) {
				hangout._log('onApiReady', e, e.stack);
			}
		});

		gapi.hangout.data.onStateChanged.add(function(eventObj) {
			hangout._log('onStateChanged', eventObj);

			try {
				for (var i = 0; i < eventObj.addedKeys.length; i++) {
					var item = eventObj.addedKeys[i];
					var value = JSON.parse(item.value);

					hangout._log('emit', item.key);
					hangout.emit(item.key, value);

					if(item.key.indexOf('!') === 0) {
						var p = [{
							id: item.key.substring(1),
							$state: value
						}];

						hangout._setParticipants(p, 'update');
					}
				}

				hangout._emitUpdate();
			} catch(e) {
				hangout._log(e);
			}
		});

		gapi.hangout.onParticipantsChanged.add(function(eventObj) {
			try {
				hangout._log('onParticipantsChanged', eventObj);
				hangout._setParticipants(eventObj.participants, 'sync');
				hangout._emitUpdate();
			} catch(e) {
				hangout._log(e);
			}
		});

		return hangout;
	};
});