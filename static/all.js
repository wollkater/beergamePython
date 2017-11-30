angular.module('BeerGame', ['ngRoute'])
.config(['$routeProvider', '$locationProvider',
    function($routeProvider, $locationProvider) {
        $routeProvider
            .when('/select', {
                templateUrl: 'select.html',
                controller: 'LoginCtrl'
            })
            .when('/selectGame', {
                templateUrl: 'selectGame.html',
                controller: 'SelectGameCtrl'
            })
            .when('/game/:companyType', {
                templateUrl: 'game.html',
                controller: 'GameCtrl'
            })
            .when('/admin', {
                templateUrl: 'admin.html',
                controller: 'AdminCtrl'
             })
             .when('/adminPanel', {
                templateUrl: 'adminPanel.html',
                controller: 'AdminPanelCtrl'
             })
            .otherwise({
                redirectTo: '/selectGame'
            });
    }
])
.controller('MainCtrl', ['$route', '$routeParams', '$location',
  function MainCtrl($route, $routeParams, $location) {
    this.$route = $route;
    this.$location = $location;
    this.$routeParams = $routeParams;
   
   
}])
.controller('LoginCtrl', function($scope, $log, $location, backend) {

    $scope.alert = null;
    $scope.companies = [
        {
            name: 'Brauerei',
            type: 'brewery'
        }, {
            name: 'Großhändler',
            type: 'retailer'
        }, {
            name: 'Einzelhändler',
            type: 'wholesaler'
        }
        ];
    
    $scope.selectCompany = selectCompany;


    function isCompanyAvailable(companyType) {
        result = false;
        /*backend.getUnregisteredcompanies()
        .then(function(companies) {
            angular.forEach(companies, function(company) {
                if(companyType == company.type) {
                    result = true;
                }
            });

            return result;
        }, function(error) {
            $scope.alert = {
                msg: 'Unternehmen nicht mehr verfügbar! Bitte wählen Sie ein anderes Unternehmen!'
            };

            return result;
        })*/
    }

    function selectCompany(company) {
        window.localStorage.setItem('company', company.type);
        $location.path('/game/' + company.type);
    }
})
.controller('GameCtrl', function($scope, $log, $location, $routeParams, backend) {

    $scope.roundNumber = 0;
    $scope.storage = 12;
    $scope.orderInput = 0;
    $scope.orderOutput = 0;
    $scope.input = 0;
    $scope.output = 0;
    $scope.money = 0;
    $scope.costs = {
        storage: 0.5,
        delay: 1
    }
    $scope.company= {
        name: getCompanyName($routeParams.companyType),
        companyType: $routeParams.companyType
    }

    $scope.addOrderOutput = addOrderOutput;
    $scope.remOrderOutput = remOrderOutput;


    function init() {

    }

    init();

    function addOrderOutput() {
        $scope.orderOutput ++;
    }

    function remOrderOutput() {
        $scope.orderOutput --;
    }

    function getCompanyName(companyType) {
        switch(companyType) {
            case 'brewery':
                return 'Brauerei';
                break;
            case 'retailer':
                return 'Einzelhändler';
                break;
            case 'wholesaler':
                return 'Großhändler';
                break;
            default:
                return "Fehlerhaftes Unternehmen!";
                break;
        }
    }
})
.controller('SelectGameCtrl', function($scope, $log, $location) {
    $scope.games = [
        {name: 'Spiel 1', id: 123},
        {name: 'Spiel 2', id: 321},
        {name: 'Spiel 3', id: 231}
    ];

    $scope.selectGame = selectGame;


    function selectGame(session) {
        if(window.localStorage.getItem('session')) {
            window.localStorage.removeItem('session');
        }

        window.localStorage.setItem('session', JSON.stringify(session));

        if(window.localStorage.getItem('session')) {
            $location.path('/select');
        }
    }
})
.controller('AdminCtrl', function($scope, $log, backend) {
    $scope.game = {
        name: ""
    }
    $scope.alert = "";

    $scope.createGame = createGame;


    function createGame(name) {
        backend.createGame(name)
        .then(function(success) {
            window.localStorage.setItem('session', JSON.stringify(success));
            $location.path('/adminPanel');
        }, function(error) {
            $scope.alert = {msg: "Spiel konnte nicht angelegt werden!"};
        });
    }
})
.controller('AdminPanelCtrl', function($scope, $log, backend) {
    $scope.round = 0;
    $scope.game = {};
    $scope.order = {
        amount: 0
    }

    $scope.nextRound = nextRound;

    function init() {
        $scope.game = window.localStorage.getItem('session');
        if($scope.game) {
            $scope.game = JSON.parse($scope.game);
        } else {
            $location.path('/admin');
        }
    }

    init();

    function nextRound(order) {
        backend.nextRound(order);
    }
})
.factory('backend', function($log, $http) {
    var baseUrl = "";
    var factory = {
        getGames: getGames
    };

    function createGame(name) {
        return $http.post(baseUrl + '/create', {name: name});
    }

    function getGames() {
        return $http.get(baseUrl + '/games');
    }
    
    function registerCompany(companyType) {
        return $http.post();
    }

    function getUnregisteredCompanies() {
        return $http.get(baseUrl + "/companies");
    }

    function placeOrder(number) {
        return $http.post(baseUrl + "/order", {count: number});
    }

    function updateCompanyData() {
        return $http.get(baseUrl + "/company")
    }

    function getOrder() {
        return $http.get(baseUrl + "/order");
    }

    function getRound() {
        return $http.get(baseUrl + "/round");
    }

    function nextRound(order) {
        return $http.post(baseUrl + '/nextRound', order)
    }
    
    return factory;
})