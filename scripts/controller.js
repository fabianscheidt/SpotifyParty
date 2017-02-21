app.controller('controller', function ($scope, ws, $http) {
    $scope.currentSong  = {};
    $scope.wishes       = [];
    $scope.wishMap      = {};
    $scope.searchQuery  = "";
    $scope.results      = [];
    $scope.admin        = location.search.split('admin=')[1] == 'admin';
    console.log($scope.admin);

    /**
     * Performs a search for Spotify-Songs and saves the results in $scope.results
     *
     * @param query
     */
    $scope.search = function(query) {
        query = query.replace(" ", "+");
        url = "https://api.spotify.com/v1/search?q=" + query + "&type=track&market=DE";
        $http.get(url)
        .success(function(data) {
            $scope.results = data.tracks.items;
        });
    };

    /**
     * Gets song metadata and saves it to $scope.wishMap
     *
     * @param song
     */
    $scope.mapSongInfo = function(song) {
        song = song.replace("spotify:track:", "");
        url = "https://api.spotify.com/v1/tracks/" + song + "?market=DE";
        $http.get(url)
        .success(function(data) {
            $scope.wishMap["spotify:track:" + song] = data;
        });
    }

    /**
     * Returns the current wishlist-metadata
     *
     * @returns {Array}
     */
    $scope.getWishList = function () {
        var result = [];
        for(i in $scope.wishes) {
            if($scope.wishMap[$scope.wishes[i]]) {
                result.push($scope.wishMap[$scope.wishes[i]]);
            }
        }
        return result;
    }

    /**
     * Adds a wish
     *
     * @param wish
     */
    $scope.wish = function (wish) {
        if($scope.admin) {
            ws.emit('addAdminWish', wish);
        } else {
            ws.emit('addWish', wish);
        }
        alert("Alles Klar! Dein Wunsch ist angekommen!");
    };

    /**
     * Deletes a wish
     *
     * @param wish
     */
    $scope.deleteWish = function (wish) {
        ws.emit('deleteWish', wish);
    }


    /**
     * Play, pause and skip action
     */
    $scope.play  = function() { ws.emit('play');  };
    $scope.pause = function() { ws.emit('pause'); };
    $scope.skip  = function() { ws.emit('skip');  };

    /**
     * Perform search on query-changes
     */
    $scope.$watch('searchQuery', function () {
        if($scope.searchQuery === "") {
            $scope.results = [];
        } else {
            $scope.search($scope.searchQuery);
        }
    });


    /**
     * Update Current Song
     */
    ws.on('currentSongInfo', function (currentSong) {
        $scope.currentSong = currentSong;
    });

    /**
     * Update current Wishlist
     */
    ws.on('wishAdded', function(wishes) {
        $scope.wishes = wishes;

        for(i in wishes) {
            $scope.mapSongInfo(wishes[i]);
        }
    });
});