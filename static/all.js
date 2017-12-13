angular.module('BeerGame', ['ngRoute'])
.config(function ($httpProvider) {
    $httpProvider.defaults.withCredentials = true;
})
.config(['$routeProvider', '$locationProvider',
    function($routeProvider, $locationProvider) {
        $routeProvider
            .when('/games/:sessionId/companies', {
                templateUrl: 'select.html',
                controller: 'LoginCtrl'
            })

            .when('/games/:sessionId', {
                templateUrl: 'game.html',
                controller: 'GameCtrl'
            })
            .when('/games', {
                templateUrl: 'selectGame.html',
                controller: 'SelectGameCtrl'
            })
            .when('/admin/:sessionId', {
                templateUrl: 'adminPanel.html',
                controller: 'AdminPanelCtrl'
             })
            .when('/admin', {
                templateUrl: 'admin.html',
                controller: 'AdminCtrl'
             })

            .otherwise({
                redirectTo: '/games'
            });
    }
])
.controller('MainCtrl', ['$route', '$routeParams', '$location',
  function MainCtrl($route, $routeParams, $location) {
    this.$route = $route;
    this.$location = $location;
    this.$routeParams = $routeParams;
   
   
}])
.controller('LoginCtrl', function($scope, $log, $location,$routeParams, backend) {

    $scope.alert = null;

    backend.getUnregisteredCompanies($routeParams.sessionId)
        .then(function(companies) {
            $scope.companies = [];
	    angular.forEach(companies.data.companies, function(companyType) {
	    	switch(companyType) {
         	   case 'Brewery':
                	$scope.companies.push('Brauerei');
                	break;
            	   case 'Store':
                	$scope.companies.push('Einzelhändler');
                	break;
            	   case 'Wholesaler':
                	$scope.companies.push('Großhändler');
                	break;
            	   default:
                	$scope.companies.push("Fehlerhaftes Unternehmen!");
                	break;
        	}
	    });
        }, function(error) {
            $scope.alert = {
                msg: 'Unternehmen nicht mehr verfügbar! Bitte wählen Sie ein anderes Unternehmen!'
            };

            return result;
        })
    
    $scope.selectCompany = selectCompany;

    function selectCompany(company) {
        backend.registerCompany($routeParams.sessionId, company)
            .then(function(resp) {
                $location.path('/games/' + $routeParams.sessionId);
            })
    }
})
.controller('GameCtrl', function($scope, $log, $location, $routeParams, backend, $interval) {

    $scope.roundNumber = 0;
    $scope.storage = 12;
    $scope.orderInput = 0;
    $scope.orderOutput = 0;
    $scope.input = 0;
    $scope.output = 0;
    $scope.costs = {
        storage: 0.5,
        delay: 1
    }
    $scope.company= {}


    $scope.addOrderOutput = addOrderOutput;
    $scope.remOrderOutput = remOrderOutput;

    $scope.order = order;


    function init() {
        backend.getCompany($routeParams.sessionId)
        .then(function(company) {
            $scope.company = company.data;
            $scope.company.name = getCompanyName($scope.company.type);
        });
        getContracts();
        backend.getSessions($routeParams.sessionId)
            .then(function(resp) {
                $scope.roundNumber = resp.data.round;
            })
    }
    init();
    $interval(function(){init()}, 1000);

    function getContracts() {
        backend.getContracts($routeParams.sessionId)
        .then(function(order) {
            $scope.contracts = order.data;
        }, function(error) {
            $log.error("Could not load contracts: ", error);
        })
    }

    function order() {
        backend.createContract($routeParams.sessionId, $scope.orderOutput);
    }

    function addOrderOutput() {
        $scope.orderOutput ++;
    }

    function remOrderOutput() {
        $scope.orderOutput --;
    }

    function getCompanyName(companyType) {
        switch(companyType) {
            case 'Brewery':
                return 'Brauerei';
                break;
            case 'Store':
                return 'Einzelhändler';
                break;
            case 'Wholesaler':
                return 'Großhändler';
                break;
            default:
                return "Fehlerhaftes Unternehmen!";
                break;
        }
    }
})
.controller('SelectGameCtrl', function($scope, $log, $location, backend) {
    backend.getGames()
    .then(function(resp) {
        $scope.games = resp.data.games;
    })
})
.controller('AdminCtrl', function($scope, $log, $location, backend) {
    $scope.game = {
        name: ""
    }
    $scope.alert = "";
    $scope.disable = false;

    $scope.createGame = createGame;


    function createGame(name) {
        $scope.disable = true
        backend.createGame(name)
        .then(function(success) {
            $location.path('/admin/' + success.data.game_session.session.id);
            $scope.disable = false;
        }, function(error) {
            $scope.alert = {msg: "Spiel konnte nicht angelegt werden!"};
            $scope.disable = false;
        });
    }
})
.controller('AdminPanelCtrl', function($scope, $log, $routeParams, backend, $interval) {
    $scope.round = 0;
    $scope.game = {};
    $scope.order = {
        amount: 0
    }


    $scope.nextRound = nextRound;
    $scope.order = order;

    function init() {
        backend.getSessions($routeParams.sessionId)
            .then(function(resp) {
                $scope.round = resp.data.round;
            })
    }

    init();
    $interval(function(){init()}, 1000);

    function order() {
        return backend.createContract($routeParams.sessionId, $scope.order.amount);
    }

    function nextRound() {
        order()
        .then(function(success) {
            backend.nextRound($routeParams.sessionId);
        })
    }
})
.filter('resource', function() {
    return function (input) {
        input = input || '';
        switch (input) {
            case 'Beer':
                return 'Bierkasten';
            case 'Hop':
                return 'Hopfen';
        }
    }
})
.factory('backend', function($log, $http) {
    var baseUrl = "https://lets-poke.de:5002/";
    var factory = {
        getGames: getGames,
        createGame: createGame,
        registerCompany: registerCompany,
        getUnregisteredCompanies: getUnregisteredCompanies,
        createContract: createContract,
        getContracts: getContracts,
        getSessions: getSession,
        getCompany: getCompany,
        nextRound: nextRound

    };

    function createGame(name) {
        return $http.post(baseUrl + 'sessions', {name: name});
    }

    function getGames() {
        return $http.get(baseUrl + 'sessions');
    }
    
    function registerCompany(sessionId, companyType) {
        return $http.post(baseUrl + sessionId + '/join', {"type":companyType});
    }

    function getUnregisteredCompanies(sessionId) {
        return $http.get(baseUrl + sessionId + "/availableCompanies");
    }

    function createContract(sessionId, number) {
        return $http.post(baseUrl + sessionId + "/contracts", {amount: number});
    }

    function getContracts(sessionId) {
        return $http.get(baseUrl + sessionId + "/contracts")
    }

    function getSession(id) {
        return $http.get(baseUrl + "sessions/" + id);
    }

    function nextRound(sessionId) {
        return $http.get(baseUrl + sessionId + '/round/next')
    }

    function getCompany(sessionId) {
        return $http.get(baseUrl + sessionId + "/company");
    }

    return factory;
})
