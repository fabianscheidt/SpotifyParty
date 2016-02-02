app.factory('ws', [ '$rootScope', function ($rootScope) {
    'use strict';
    var socket = io.connect('http://localhost:5000');

    return {
        on: function (event, callback) {
            socket.on(event, function () {
                var args = arguments;
                $rootScope.$apply(function () {
                    callback.apply(null, args);
                });
            });
        },

        off: function (event, callback) {
            socket.removeListener(event, callback);
        },

        emit: function (event, data, callback) {
            socket.emit(event, data, function () {
                var args = arguments;
                $rootScope.$apply(function () {
                    if (callback) {
                        callback.apply(null, args);
                    }
                });
            });
        }
    };
}]);