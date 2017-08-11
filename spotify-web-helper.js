var https = require('https');

// Default port that Spotify Web Helper binds to.
var PORT = 4370;
var DEFAULT_RETURN_ON = ['login', 'logout', 'play', 'pause', 'error', 'ap'];
var ORIGIN_HEADER = {'Origin': 'https://open.spotify.com'};
var FAKE_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36';

// Store tokens here
var oAuthToken = '';
var csrfToken  = '';

// Store event-listeners here
var statusChangeCallbacks = [];
var currentTrack = null;


/**
 * Performs an https-get-request with the passed values
 *
 * @param host host for the request
 * @param path path for the request
 * @param port port for the request (optional, default is 443)
 * @param params url-parameters (optional)
 * @param headers additional headers (optional)
 *
 * @returns {{then: then}} then-function is called when the request succeeds
 */
var getJson = function (host, path, port, params, headers) {

    // Default values
    port = port || 443;
    params = params || {};
    headers = headers || {};
    headers['User-Agent'] = FAKE_USER_AGENT;
    var callback = function (result) {};

    // Append URL-params
    var count = 0;
    for(var i in params) {
        if(params.hasOwnProperty(i)) {
            path += count == 0 ? "?" : "&";
            path += i + "=" + params[i];
            count++;
        }
    }

    // Configure request
    var options = {
        host:host,
        path:path,
        headers: headers,
        port:port,
        rejectUnauthorized: false
    };

    // Perform the request
    https.get(options, function (response) {
        var result = '';

        // Append to result when data arrives
        response.on("data", function (d) {
            result +=d;
        });

        // Parse JSON and call callback when all data arrived
        response.on("end", function () {
            result = JSON.parse(result);
            callback(result);
        });
    }).on("error", function (err) {
        callback(err);
        console.log("Some error");
    });

    return {
        then: function (callbackFunc) {
            callback = callbackFunc;
        }
    };
    
};


/**
 * Generates a random local *.spotilocal.com domain
 *
 * @returns {string}
 */
var generateLocalHostname = function () {
    var subdomain = "";
    var possible = "abcdefghijklmnopqrstuvwxyz";

    for( var i=0; i < 10; i++ ) {
        subdomain += possible.charAt(Math.floor(Math.random() * possible.length));
    }

    return subdomain + '.spotilocal.com';
};


/**
 * Fetches and stores the oauth-token
 */
var fetchOAuthToken = function () {
    getJson("open.spotify.com", "/token").then(function (result) {
        oAuthToken = result['t'];
    });
};

/**
 * Fetches and stores the csrf-token
 */
var fetchCsrfToken = function () {
    getJson(generateLocalHostname(), '/simplecsrf/token.json', PORT, {}, ORIGIN_HEADER).then(function (result) {
        csrfToken = result['token'];
    });
};

/**
 * Initializes the connection by fetching the tokens and long-polling for status changes
 */
exports.init = function() {

    // Fetch tokens
    fetchOAuthToken();
    fetchCsrfToken();

    // Define poll-method
    var poll;
    poll = function (instant) {
        instant = instant || false;
        returnon = instant ? '' : DEFAULT_RETURN_ON.join(",");
        var params = {
            oauth: oAuthToken,
            csrf: csrfToken,
            returnafter: 5,
            returnon: returnon
        };

        getJson(generateLocalHostname(), '/remote/status.json', PORT, params, ORIGIN_HEADER).then(function (res) {
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
    var params = {
        oauth: oAuthToken,
        csrf: csrfToken,
        pause: false
    };
    return getJson(generateLocalHostname(), '/remote/pause.json', PORT, params, ORIGIN_HEADER);
};


/**
 * Acts like a press on the pause-button
 */
exports.pause = function () {
    var params = {
        oauth: oAuthToken,
        csrf: csrfToken,
        pause: true
    };
    return getJson(generateLocalHostname(), '/remote/pause.json', PORT, params, ORIGIN_HEADER);
};


/**
 * plays a track identified by its spotify-uri
 *
 * @param spotifyUri track, album or playlist to be played
 */
exports.playTrack = function (spotifyUri) {
    var params = {
        oauth: oAuthToken,
        csrf: csrfToken,
        uri: spotifyUri,
        context: spotifyUri
    };
    return getJson(generateLocalHostname(), '/remote/play.json', PORT, params, ORIGIN_HEADER);
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