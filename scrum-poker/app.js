console.log('SP - Load');

function createDefaultState() {
	return {
		cardSelected: "None",
		cardHistory: [],
		needBreak: false
	};
}

var phonecatApp = angular.module('scrumPokerHangout', []);

phonecatApp.controller('mainCtrl', function ($scope) {

	$scope.cards = ["0","Half","1","2","3","5","8","13","20","40","100","Inf","Break","None"];
	$scope.people = [];
	$scope.state = createDefaultState();
	$scope.lastReset = null;
	$scope.reveal = false;

	$scope.update = _.debounce($scope.$apply, 100);

	$scope.mainListSize = function(delta) {
		var fontSize = parseInt($("#mainList").css("font-size"));
		fontSize = fontSize + delta + "px";
		$("#mainList").css({'font-size':fontSize});
	};

	$scope.selectCard = function(card) {
		if($scope.state.cardSelected === card) {
			return;
		}

		if($scope.reveal && $scope.state.cardSelected && $scope.state.cardSelected !== "None") {
			$scope.state.cardHistory.unshift($scope.state.cardSelected);
		}

		if(card === "Break") {
			$scope.state.needBreak = !$scope.state.needBreak;
		} else {
			$scope.state.cardSelected = card;
		}

		$scope.update();
		$scope.sync();
	};

	$scope.sync = _.debounce(function() {
		var key = gapi.hangout.getLocalParticipantId();
		var value = JSON.stringify($scope.state);

		gapi.hangout.data.setValue(key, value);
	}, 250);

	$scope.resetAll = function() {
		gapi.hangout.data.setValue('!resetAll', (JSON.stringify(new Date())));
		$scope.showAll(false);
	};

	$scope.showAll = function(reveal) {
		gapi.hangout.data.setValue('!reveal', JSON.stringify(reveal));
		$scope.reveal = reveal;
		$scope.update();
	};

	$scope.applyStateChange = function(eventObj) {

		for (var e = eventObj.addedKeys.length - 1; e >= 0; e--) {

			if(eventObj.addedKeys[e].key === '!resetAll') {
				if(eventObj.addedKeys[e].value != $scope.lastReset) {
					$scope.lastReset = eventObj.addedKeys[e].value;
					$scope.state.cardHistory = [];
					$scope.selectCard('None');
				}
			} else if(eventObj.addedKeys[e].key === '!reveal') {
				$scope.reveal = JSON.parse(eventObj.addedKeys[e].value);
			} else {
				for (var s = $scope.people.length - 1; s >= 0; s--) {
					if( $scope.people[s].id === eventObj.addedKeys[e].key ) {
						$scope.people[s].state = JSON.parse(eventObj.addedKeys[e].value);
					}
				}
			}
		}

		$scope.update();
	};

	$scope.applyParticipants = function(participants) {
		for (var e = participants.length - 1; e >= 0; e--) {

			var found = false;			
			for (var s = $scope.people.length - 1; s >= 0; s--) {
				if( $scope.people[s].id === participants[e].id ) {
					found = true;
					$scope.people[s].hasAppEnabled = participants[e].hasAppEnabled;
					$scope.people[s].online = true;
				}
			}

			if(!found) {
				$scope.people.push({
					id: participants[e].id,
					displayName: participants[e].person.displayName,
					image: participants[e].person.image.url,
					state: createDefaultState(),
					online: true
				});
			}
		} // for: eventObj.participants

		$scope.update();
	};

	gapi.hangout.onApiReady.add(function(eventObj){
		if (eventObj.isApiReady) {
			console.log('SP - Start');

			var participants = gapi.hangout.getParticipants();
			var state = gapi.hangout.data.getState();
			console.log(state);
			console.log(participants);

			$scope.applyParticipants(participants);

			// Create a similar object to the state change event
			var e = { addedKeys: [] };
			for(var key in state) {
				if (state.hasOwnProperty(key)) {
					e.addedKeys.push({ key: key, value: state[key] });
				}
			}
			$scope.applyStateChange(e);

			console.log('SP - Start X');
		}
	});

	gapi.hangout.data.onStateChanged.add(function(eventObj) {
		$scope.applyStateChange(eventObj);
	});

	gapi.hangout.onParticipantsChanged.add(function(eventObj) {
		$scope.applyParticipants(eventObj.participants);
	});

	gapi.hangout.onParticipantsRemoved.add(function(eventObj) {
		for (var e = eventObj.removedParticipants.length - 1; e >= 0; e--) {
			for (var s = $scope.people.length - 1; s >= 0; s--) {
				if(eventObj.removedParticipants[e].id == $scope.people[s].id) {
					$scope.people[s].online = false;
				}
			}
		}

		$scope.update();
	});
});
