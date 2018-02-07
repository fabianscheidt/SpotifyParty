var nodeSpotifyWebHelper = require('node-spotify-webhelper');
var spotify = new nodeSpotifyWebHelper.SpotifyWebHelper();
var DEFAULT_RETURN_ON = ['login', 'logout', 'play', 'pause', 'error', 'ap']

// Store event-listeners here
var statusChangeCallbacks = [];
var currentTrack = null;

/**
 * Todo...
 */
exports.init = function() {

    // Define poll-method
    var poll;
    poll = function (instant) {
        instant = instant || false;
        var returnAfter = 5;
        var returnOn = instant ? [] : DEFAULT_RETURN_ON;

        spotify.getStatus(returnAfter, returnOn, function (err, res) {
            if (err) {
                return console.error(err);
            }

            // Fetch current track
            if(res && res.track) {
                currentTrack = {
                    artist:res.track.artist_resource.name,
                    name:res.track.track_resource.name
                };
            }

            // Call all the callbacks
            for(var i in statusChangeCallbacks) {
                statusChangeCallbacks[i](res);
            }

            // Poll again
            poll();
        });
    };

    // Call initial poll with a timeout to make sure the tokens are available
    setTimeout(function () {
        poll(true);
    }, 500);
};


/**
 * Acts like a press on the play-button
 */
exports.play = function () {
    spotify.play();
};


/**
 * Acts like a press on the pause-button
 */
exports.pause = function () {
    spotify.pause();
};


/**
 * plays a track identified by its spotify-uri
 *
 * @param spotifyUri track, album or playlist to be played
 */
exports.playTrack = function (spotifyUri) {
    spotify.play(spotifyUri);
};


/**
 * Returns the currently playing track
 */
exports.getTrack = function () {
    return currentTrack;
};


/**
 * Registers a callback for status changes
 *
 * @param callback
 */
exports.onStatusChange = function (callback) {
    statusChangeCallbacks.push(callback);
};

/**
 * Unregisters a callback for status changes
 *
 * @param callback
 */
exports.offStatusChange = function (callback) {
    var index = statusChangeCallbacks.indexOf(callback);
    if(index != -1) {
        statusChangeCallbacks.splice(index, 1);
    }
};