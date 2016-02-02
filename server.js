var spotify = require('spotify-node-applescript');

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
    } else {
        spotify.next();
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

    // Update currentSong
    currentSong = null;
    setTimeout(function () {
        updateCurrentSong();
    }, 500);

    // Send Wishlist
    io.emit("wishAdded", wishes);
}

/**
 * Fetches the current song
 */
function updateCurrentSong() {
    spotify.getTrack(function(err, track) {
        if(track != undefined && track != null) {
            currentSong = track;
            io.emit('currentSongInfo', currentSong);
        } else {
            console.log("Unable to get Song-Info.");
        }
    });
}




// Start new Track when the current ends
setInterval(function () {
    spotify.getState(function(err, state){
        if(state != undefined && currentSong != null) {
            var currentPos = state.position;
            var currentMax = Math.floor(currentSong.duration/1000);

            if(currentPos == currentMax-1) {
                nextSong();
            }
        }
    });
}, 200);



// Update Song sometimes
setInterval(function () {
    updateCurrentSong();
}, 2000);



// File Server
var http = require('http'),
    url = require('url'),
    path = require('path'),
    fs = require('fs');
var mimeTypes = {
    "html": "text/html",
    "jpeg": "image/jpeg",
    "jpg": "image/jpeg",
    "png": "image/png",
    "js": "text/javascript",
    "css": "text/css"};

http.createServer(function(req, res) {
    var uri = url.parse(req.url).pathname;

    if(uri == '/scripts/socket.io.js') {
        uri = '/node_modules/socket.io/node_modules/socket.io-client/socket.io.js';
    }

    var filename = path.join(process.cwd(), uri);
    fs.exists(filename, function(exists) {
        if(!exists || uri.indexOf(".") == -1) {
            console.log("not exists: " + filename);
            res.writeHead(200, {'Content-Type': 'text/plain'});
            res.write('404 Not Found\n');
            res.end();
            return;
        }
        var mimeType = mimeTypes[path.extname(filename).split(".")[1]];
        res.writeHead(200, mimeType);

        var fileStream = fs.createReadStream(filename);
        fileStream.pipe(res);

    }); //end path.exists
}).listen(1337);



// Start Socket-Server
var io = require('socket.io').listen(5000);
io.sockets.on('connection', function (socket) {
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
    })

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