// For the GET Requests
const Soup = imports.gi.Soup;
// new sesssion
var soupSyncSession = new Soup.SessionSync();

function getCurrentTvStatus(tvStatusURL) {
    // changes the value of tv_is_open based on the current tv status
    //  as retrieved from the server.
    // If the response code is not 200 (so there was a failure) then the status does not change.
    let message = Soup.Message.new('GET', tvStatusURL);
    let responseCode = soupSyncSession.send_message(message);

    if(responseCode == 200) {
        try {
            return Number(JSON.parse(message['response-body'].data).currentStatus);
        } 
        catch (error) {
            // TODO: Handle this
            // Current behaviour: Leave everything the same as before
            log("ERROR OCCURED WHILE SETTING TV STATUS: " + error);
            return -1; // means error
        }
    }
    return -1;  // something unexpected occurred
}

function sendRequest(url, type='GET') {
	let message = Soup.Message.new(type, url);
    soupSyncSession.send_message(message);
    try {
        return JSON.parse(message['response-body'].data);
    } catch(error) {
        log("ERROR OCCURRED WHILE SENDING GET REQUEST TO " + url + ". ERROR WAS: " + error);
        return false;
    }
}