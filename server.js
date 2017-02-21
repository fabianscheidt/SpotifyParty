var spotify = require('./spotify-web-helper');
spotify.init();

var wishes = [];
var currentSong = null;

/**
 * Adds a song to the end of the wishlist
 *
 * @param wish String
 */
function addWish(wish) {
    if(!inWishlist(wish)) {
        wishes.push(wish);
        console.log("Wish added: " + wish);
        return;
    }
    console.log("Song already wished: " + wish);
}


/**
 * Adds a song to the beginning of the wishlist
 *
 * @param wish String
 */
function addAdminWish(wish) {
    if(!inWishlist(wish)) {
        wishes.unshift(wish);
        console.log("Admin-Wish added: " + wish);
        return;
    }
    console.log("Song already wished: " + wish);
}

function inWishlist(wish) {
    for(i in wishes) {
        if(wishes[i] == wish) {
            return true;
        }
    }
    return false;
}


function deleteWish(wish) {
    for(i in wishes) {
        if(wishes[i] == wish) {
            wishes.splice(i, 1);
        }
    }
}

function skip() {
    if(wishes.length > 0) {
        nextSong();
    }
}


/**
 * Plays the next song
 */
function nextSong() {
    var nextSong;

    if(wishes.length > 0) {
        // Get wish
        nextSong = wishes.shift();

        // Play Track
        spotify.playTrack(nextSong);
        spotify.play();

        // Log
        console.log("Started Song: " + nextSong);
    } else {
        // No Songs in Wishlist
        console.log("No Songs in Wishlist");
    }

    // Send Wishlist
    io.emit("wishAdded", wishes);
}

/**
 * Fetches the current song
 */
function updateCurrentSong() {
    var track = spotify.getTrack();

    if(track != undefined && track != null) {
        currentSong = track;
        io.emit('currentSongInfo', currentSong);
    } else {
        console.log("Unable to get Song-Info.");
    }
}


/**
 * Updates the current song and starts the next song if necessary
 *
 * @param status
 */
function statusChanged(status) {
    updateCurrentSong();

    if(status && typeof status.playing_position !== "undefined" && status.track && status.track.length) {
        var currentPos = Math.round(status.playing_position);
        var currentMax = Math.round(status.track.length);

        if(currentPos >= currentMax || (currentPos == 0 && !status.playing)) {
            nextSong();
        }
    }
}

// Register for the event
spotify.onStatusChange(statusChanged);


// Server
var http = require('http');
var express = require('express');
var app = express();

// Create Server and start listening
var server = http.createServer(app);
server.listen(1337);

// File Server
app.get('/', function (req, res) {
    res.sendFile(__dirname + '/client.html');
});
app.use(express.static(__dirname));


// Start Socket-Server
var io = require('socket.io').listen(server);
io.on('connection', function (socket) {
    console.log("Connection!");
    socket.emit('currentSongInfo', currentSong);
    socket.emit("wishAdded", wishes);

    socket.on('addWish', function(wish) {
        addWish(wish);
        io.emit("wishAdded", wishes);
    });

    socket.on('addAdminWish', function(wish) {
        addAdminWish(wish);
        io.emit("wishAdded", wishes);
    });

    socket.on('deleteWish', function (wish) {
        deleteWish(wish);
        io.emit("wishAdded", wishes);
    });

    socket.on('play', function () {
        spotify.play();
    });

    socket.on('pause', function() {
        spotify.pause();
    });

    socket.on('skip', function () {
        skip();
    })
});