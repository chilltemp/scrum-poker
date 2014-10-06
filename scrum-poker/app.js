
function createDefaultState() {
	return {
		cardSelected: "None",
		cardHistory: [],
		needBreak: false,
		cardBack: 'cardBackDefault'
	};
}

var pokerApp = angular.module('scrumPokerHangout', ['ngAnimate']);

pokerApp.controller('mainCtrl', function ($scope) {

	//$scope.icons = {};
	/* ###icons.json### */

	$scope.iconCategory = $scope.icons['default'];

	$scope.cards = ["0","Half","1","2","3","5","8","13","20","40","100","Inf","Break","None"];
	$scope.people = [];
	$scope.state = createDefaultState();
	$scope.reveal = false;
	$scope.animate = false;
	$scope.showConfig = false;
	$scope.cfg = {
		smSize: 16,
		lgMinSize: 16,
		lgMaxSize: 64,
		lgAutoSize: true,
		cardBack: 'cardBackDefault'
	};
	/* Additional properties defined in the resetMe function below. */


	$scope.update = _.debounce($scope.$apply, 100);

	$scope.autoSizeMainList = _.debounce(function() {
		var mainList = $("#mainList");
		var w = $(window);
		var d = $(document);

		for(var f = $scope.cfg.lgMaxSize; f >= $scope.cfg.lgMinSize; f--) {
			mainList.css({ 'font-size': (f/4)+'px' });
			if(d.height() <= w.height()) {
				break;
			}
		}
	}, 100);

	$scope.applyConfig = function() {
		$scope.state.cardBack = $scope.cfg.cardBack;
		$('#myCards').css({ 'font-size': $scope.cfg.smSize +'px'});
		$scope.autoSizeMainList();
		$scope.showConfig = false;
		$scope.sync();
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

	$scope.hasConsensus = function() {
		var card = null;
		for (var s = $scope.people.length - 1; s >= 0; s--) {
			if($scope.people[s].state.cardSelected === "None") {
				return false;
			} else if(card === null) {
				card = $scope.people[s].state.cardSelected;
			} else if(card !== $scope.people[s].state.cardSelected) {
				return false;
			}
		}

		return true;
	};

	$scope.applyStateChange = function(eventObj) {
		$scope.consensus = false;

		for (var e = eventObj.addedKeys.length - 1; e >= 0; e--) {

			if(eventObj.addedKeys[e].key === '!resetAll') {
				if(eventObj.addedKeys[e].value != $scope.lastReset) {
					$scope.resetMe(eventObj.addedKeys[e].value);
				}
			} else if(eventObj.addedKeys[e].key === '!reveal') {
				$scope.reveal = JSON.parse(eventObj.addedKeys[e].value);

				if($scope.reveal) {
					$scope.revealsSinceReset++;
					if($scope.revealsSinceReset === 1 && $scope.people.length > 1) {
						$scope.consensus = $scope.hasConsensus();
					}
				}
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

	$scope.resetMe = function(resetTime) {
		$scope.lastReset = resetTime;
		$scope.consensus = false;
		$scope.selectCard('None');
		$scope.state.cardHistory = [];
		$scope.revealsSinceReset = 0;

		$scope.update();
	};
	$scope.resetMe(null);

	gapi.hangout.onApiReady.add(function(eventObj){
		if (eventObj.isApiReady) {

			var participants = gapi.hangout.getParticipants();
			var state = gapi.hangout.data.getState();

			$scope.applyParticipants(participants);

			// Create a similar object to the state change event
			var e = { addedKeys: [] };
			for(var key in state) {
				if (state.hasOwnProperty(key)) {
					e.addedKeys.push({ key: key, value: state[key] });
				}
			}
			$scope.applyStateChange(e);
		}

		$scope.update();
	});

	gapi.hangout.data.onStateChanged.add(function(eventObj) {
		$scope.applyStateChange(eventObj);
	});

	gapi.hangout.onParticipantsChanged.add(function(eventObj) {
		$scope.applyParticipants(eventObj.participants);
		$scope.autoSizeMainList();
	});

	gapi.hangout.onParticipantsRemoved.add(function(eventObj) {
		for (var e = eventObj.removedParticipants.length - 1; e >= 0; e--) {
			for (var s = $scope.people.length - 1; s >= 0; s--) {
				if(eventObj.removedParticipants[e].id == $scope.people[s].id) {
					$scope.people[s].online = false;
				}
			}
		}

		$scope.autoSizeMainList();
		$scope.update();
	});

	$(window).resize(_.debounce(function() {
		$scope.autoSizeMainList();
		$scope.animate = true;
		$scope.update();
	}, 500));
});
