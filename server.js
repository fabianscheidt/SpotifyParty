const clientId = "85128a8c51094125aa11f8c90e13fd1e";
const clientSecret = "1bce9f1903104c1bbc1e12a71354c80b";

const SpotifyWebApi = require('spotify-web-api-node');
const spotify = new SpotifyWebApi({ clientId, clientSecret });

const wishes = [];
let currentSong = null;

/**
 * Adds a song to the end of the wishlist
 *
 * @param song String
 */
function addWish(song) {
    const wish = getSongInWishlist(song);
    if(!wish) {
        wishes.push({ song: song, votes: 1 });
        console.log("Wish added: " + song);
        return;
    }
    wish.votes++;
    console.log("Song already wished, added vote: " + song);
}


/**
 * Adds a song to the beginning of the wishlist
 *
 * @param song String
 */
function addAdminWish(song) {
    const wish = getSongInWishlist(song);
    if(!wish) {
        wishes.push({ song: song, votes: 100 });
        console.log("Admin-Wish added: " + song);
        return;
    }
    wish.votes += 100;
    console.log("Song already wished, added admin vote: " + song);
}

function getSongInWishlist(song) {
    return wishes.find(w => w.song === song) || null;
}


function deleteWish(song) {
    const index = wishes.findIndex(w => w.song === song);
    if (index > -1) {
        wishes.splice(index, 1);
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
    if(wishes.length > 0) {
        // Get wish with most votes
        let nextWish;
        for (const wish of wishes) {
            if(!nextWish || wish.votes > nextWish.votes) {
                nextWish = wish;
            }
        }

        // Play Track
        // Todo...
        // spotify.playTrack(nextWish.song);
        // spotify.play();

        // Remove from wishlist
        deleteWish(nextWish.song);

        // Log
        console.log("Started Song: " + nextWish.song);
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
    // Todo...
    // var track = spotify.getTrack();
    const track = null;

    if(track) {
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
        const currentPos = Math.round(status.playing_position);
        const currentMax = Math.round(status.track.length);

        if(currentPos >= currentMax || (currentPos === 0 && !status.playing)) {
            nextSong();
        }
    }
}

/**
 * Requests an access token fot the client id and secret
 */
function requestAccessToken(callback) {
    spotify.clientCredentialsGrant().then((result) => {
        if (result.body && result.body.access_token) {
            callback(result.body.access_token);
        }
    });
}

// Register for the event
// Todo...
// spotify.onStatusChange(statusChanged);


// Server
const http = require('http');
const express = require('express');
const app = express();

// Create Server and start listening
const server = http.createServer(app);
server.listen(1337);

// File Server
app.get('/', function (req, res) {
    res.sendFile(__dirname + '/client.html');
});
app.use(express.static(__dirname));


// Start Socket-Server
const io = require('socket.io').listen(server);
io.on('connection', (socket) => {
    console.log("Connection!");
    socket.emit('currentSongInfo', currentSong);

    socket.on('token', () => {
        requestAccessToken((token) => {
            socket.emit('token', token);
            socket.emit("wishAdded", wishes);
        });
    });

    socket.on('addWish', (wish) => {
        addWish(wish);
        io.emit("wishAdded", wishes);
    });

    socket.on('addAdminWish', (wish) => {
        addAdminWish(wish);
        io.emit("wishAdded", wishes);
    });

    socket.on('deleteWish', (wish) => {
        deleteWish(wish);
        io.emit("wishAdded", wishes);
    });

    socket.on('play', () => {
        // Todo...
        // spotify.play();
    });

    socket.on('pause', () => {
        // Todo...
        // spotify.pause();
    });

    socket.on('skip', () => {
        skip();
    })
});
