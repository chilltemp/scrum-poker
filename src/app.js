if (typeof String.prototype.startsWith != 'function') {
  // see below for better implementation!
  String.prototype.startsWith = function (str){
    return this.indexOf(str) == 0;
  };
}

function createDefaultState() {
	return {
		cardSelected: 'None',
		cardHistory: [],
		needBreak: false,
		cardBack: 'cardBackDefault'
	};
}

function rgbToHex(rgb) {
	// http://stackoverflow.com/a/13070198
	var a = rgb.split("(")[1].split(")")[0];
	a = a.split(",");
	var b = a.map(function(x){            //For each array element
	    x = parseInt(x).toString(16);     //Convert to a base16 string
	    return (x.length==1) ? "0"+x : x; //Add zero if we get only one character
	});
	b = "#"+b.join("");

	return b;
}


var pokerApp = angular.module('scrumPokerHangout', ['ngAnimate', 'gHangouts']);

pokerApp.controller('mainCtrl', ['$scope', 'hangout', function ($scope, hangout) {
	pokerApp.debug = $scope;

	$scope.icons = {};
	/* ###icons.json### */

	$scope.iconCategory = $scope.icons['default'];

	$scope.cards = ["0","Half","1","2","3","5","8","13","20","40","100","Inf","Break","None"];
	$scope.people = [];
	$scope.state = createDefaultState();
	$scope.reveal = false;
	$scope.animate = false;
	$scope.showConfig = false;
	$scope.lockUI = false;
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

	$scope.selectCard = function(card, force) {
		if(!force && $scope.state.cardSelected === card) {
			return;
		}
	

		if($scope.reveal && $scope.state.cardSelected && $scope.state.cardSelected !== "None") {
			$scope.state.cardHistory.unshift($scope.state.cardSelected);
		}

		if(card === "Break") {
			$scope.state.needBreak = !$scope.state.needBreak;
		} else {
			$scope.state.cardSelected = card;

			if(card === 'None') {
				$scope.flashCard();
			} else {
				$scope.stopAnimations();
			}
		}

		$scope.update();
		$scope.sync();
	};

	$scope.aniElements = [];
	$scope.stopAnimations = function() {

		while($scope.aniElements.length) {
			var e = $scope.aniElements.pop();
			e.velocity('stop');
			e.removeAttr('style');
		}
	};

	$scope.flashCard = _.debounce(function() {
		var card = $('.cardStateSelected');
		var color = card.css('background-color');
		$scope.aniElements.push(card);

		card.velocity({ color: rgbToHex(color) }, {
			duration: '1000',
			loop: true,
			begin: function() { card.css('color', '#FFFF00'); }
		});

	}, 250);

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
		$scope.applyReveal(reveal);
	};

	$scope.hasConsensus = function() {
		var card = null;
		var cnt = 0;
		var noneCnt = 0;

		for (var s = $scope.people.length - 1; s >= 0; s--) {
			if($scope.people[s].state.cardSelected === "None") {
				if(noneCnt++ > 0) {				
					return false;
				}
			} else if(card === null) {
				card = $scope.people[s].state.cardSelected;
			} else if(card !== $scope.people[s].state.cardSelected) {
				return false;
			}

			cnt++;
		}

		return cnt > 2;
	};

	$scope.revealing = false;
	$scope.toReveal = [];
	$scope.applyReveal = function(value) {
		if($scope.revealing) {
			var v = value;
			$scope.toReveal.push(function() { $scope.applyReveal(v); });
			return;
		}

		$scope.revealing = true;
		var done = function(r, c) {
			$scope.reveal = r;
			$scope.consensus = c;
			$scope.revealing = false;
			if($scope.toReveal.length) {
				$scope.toReveal.pop()();
			} else {
				$scope.lockUI = false;
				$scope.update();
			}
		};

		if(!value) {
			return done(false, false);
		}

		$scope.revealsSinceReset++;
		var consensus = $scope.revealsSinceReset === 1 && 
			$scope.people.length > 1 &&
			$scope.hasConsensus();

		// reveal & consensus
		if(consensus) {
			$scope.flipCards(function() { done(true, true); });
		} else {
			return done(true, false);
		}

	};

	$scope.flipCards = function(done) {
		$scope.lockUI = true;
		$scope.$apply(); // no debounce
			
		var cards = $('#mainList .pokerCardLg');

		// $.each(cards, function(index, card) {			
		// 	$(card)
		// 	.velocity({rotateY: '90deg'}, {duration: 1000, delay: index * 500})
		// 		.velocity({rotateY: '-90deg'}, {duration: 1, complete: function() {
		// 			$scope.reveal = true;
		// 			$scope.$apply(); // no debounce

		// 			cards.velocity({rotateY: '0deg'}, {duration: 1000, complete: function() {
		// 				done();
		// 			}});
				
		// 	}});
		// });

		cards.velocity({rotateY: '90deg'}, {duration: 1000, complete: function() {
			cards.velocity({rotateY: '-90deg'}, {duration: 1, complete: function() {
				$scope.reveal = true;
				$scope.$apply(); // no debounce

				cards.velocity({rotateY: '0deg'}, {duration: 1000, complete: function() {
					done();
				}});
			}});
		}});
	};




	$scope.resetMe = function(resetTime) {
		$scope.lastReset = resetTime;
		$scope.consensus = false;
		$scope.selectCard('None', resetTime === null); // true on first reset
		$scope.state.cardHistory = [];
		$scope.revealsSinceReset = 0;

		$scope.update();
	};
	$scope.resetMe(null);

	$scope.debug = {
		enabled: false,

		addPeople: function() {
			console.log('addPeople');
			$scope.people[1] = { displayName:'aaa', hasAppEnabled:true, id: 'qweqwe', image: $scope.people[0].image, online: true, state:{cardBack: 'cardBackDefault', cardHistory:[], cardSelected: '2', needBreak: false}};
			$scope.people[2] = { displayName:'sss', hasAppEnabled:true, id: '1231', image: $scope.people[0].image, online: true, state:{cardBack: 'cardBackDefault', cardHistory:[], cardSelected: '2', needBreak: false}};
			$scope.people[3] = { displayName:'ddd', hasAppEnabled:true, id: 'sdfsv', image: $scope.people[0].image, online: true, state:{cardBack: 'cardBackDefault', cardHistory:[], cardSelected: '2', needBreak: false}};
			$scope.people[4] = { displayName:'fff', hasAppEnabled:true, id: 'cewce', image: $scope.people[0].image, online: true, state:{cardBack: 'cardBackDefault', cardHistory:[], cardSelected: '2', needBreak: false}};
			$scope.people[5] = { displayName:'ggg', hasAppEnabled:true, id: 'uymum', image: $scope.people[0].image, online: true, state:{cardBack: 'cardBackDefault', cardHistory:[], cardSelected: '2', needBreak: false}};
			$scope.update();
			$scope.autoSizeMainList();
		},

		log: [],
		data: null,
		showData: false,
		enableData: function(show) {
			console.log('enableData');
			var data = {
				_hangoutId: gapi.hangout.getHangoutId(),
				_log: $scope.debug.log
			};
			var props = Object.getOwnPropertyNames($scope);
			for (var i = 0; i < props.length; i++) {
				var name = props[i];
				if(!name.startsWith("$") && 
					name !== 'this' && 
					name !== 'aniElements' && 
					name !== 'debug' &&
					typeof($scope[name]) !== 'function') {
					data[name] = $scope[name];
				}
			}

			console.log(data);
			$scope.debug.data = JSON.stringify(data, null, '  ');
			$scope.debug.showData = show;
		}
	};



	$(window).resize(_.debounce(function() {
		$scope.autoSizeMainList();
		$scope.animate = true;
		$scope.update();
	}, 500));
}]);



