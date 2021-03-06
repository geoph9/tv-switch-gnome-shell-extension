const Me = imports.misc.extensionUtils.getCurrentExtension();

// Import utils from another file
const ExtensionUtils = imports.misc.extensionUtils;
const Meta = ExtensionUtils.getCurrentExtension();
const Utils = Meta.imports.utils;

// For the GET Requests
const Soup = imports.gi.Soup;

/* Import St because is the library that allow you to create UI elements */
const St = imports.gi.St;
const Clutter = imports.gi.Clutter;

const Gio = imports.gi.Gio;

// MainLoop for updating the time every X seconds.
const Mainloop = imports.mainloop;

/*
Import Main because is the instance of the class that have all the UI elements
and we have to add to the Main instance our UI elements
*/
const Main = imports.ui.main;

/* Import tweener to do the animations of the UI elements */
// const Tweener = imports.ui.tweener;
const Tweener = imports.tweener.tweener;

let BASE_URL = "http://192.168.0.105:8080";  // Raspberry-Pi server URL

/*
TV-Power-Switch Variables
*/
/* Global variables for use as button to click (button) and a text label. */
let text, button, tvStatusText, tvSwitchURL;
let icon;
let currentTvStatus;
const PlayTV = 'tv-play-blue.png';  //'tv-play.svg';
const PauseTV = 'tv-shut-blue.png';
let new_icon;

let refreshTimeout;

/*
Weather-Related Variables / Endpoints
*/
const weatherStatsURL = `${BASE_URL}/api/livingroom/get-weather-stats/`;  // URL for both the temp and humidity
const tvStatusURL = `${BASE_URL}/get-tv-status/`
let currentStats;  // a dictionary with 2 keys (temperature and humidity).
let weatherStatsPanel;
let weatherStatsPanelText;

/*
Function to call when the label is opacity 0%, as the label remains as a
UI element, but not visible, we have to delete it explicitily. So since
the label reaches 0% of opacity we remove it from Main instance.
*/
function _hideText() {
    Main.uiGroup.remove_actor(text);
    text = null;
}

/*
    =====================================================================================
    ==================================== REFRESHERS =====================================
    =====================================================================================
*/
function _refreshWeatherStats() {
    _getWeatherStats();
    try {
        const temperature = currentStats.temperature;
        const humidity = currentStats.humidity;
        weatherStatsPanelText.text = `${temperature}°C|${humidity}%`;
    } catch (error) {
        logError(error);
    }
    return false; // will execute this function only once and abort.
}

function _refreshTVStatus() {
    /*
        The purpose of this function is to refresh the icons and the text 
        for the current tv status.
        This is needed because the tv status can change from more than 5 different 
        sources and we have to sync all of these.

        The above is achieved by pinging the /api/check-tv-status-changed/ endpoint of my
        rpi. This will return true if the status has changed and false otherwise. If true, 
        we are going to set the new paths accordingly and update the icon.
    */
    currentTvStatus = Utils.getCurrentTvStatus(tvStatusURL);  // this changes both new_icon and tv_is_open
    if(currentTvStatus !== -1)  {  // if no error occurred
        _setTvPaths();
    } else {
        log("tv-switch-gnome-shell-extension: getCurrentTvStatus returned an invalid code...");
        disable();
        throw new Error("tv-switch-gnome-shell-extension: getCurrentTvStatus returned an invalid code...");
    }
    let tvStatusChanged = Utils.sendRequest(`${BASE_URL}/api/check-tv-status-changed/${currentTvStatus}/`, 'GET');
    if(tvStatusChanged === false){  // means an error occurred in sendRequest
        return true;  // do not change anything
    }
    // Check if the status has changed (otherwise there is no need to re-write the data)
    if (tvStatusChanged.changed) {
        log("CHANGE DETECTED...")
        // update the icon
        currentTvStatus = Number(tvStatusChanged.current_status);
        _setTvPaths();  // with the new status
        // Update icon
        icon.gicon = Gio.icon_new_for_string(`${Me.path}/icons/${new_icon}`);
        // Send a notification only when someone else opened/closed the tv
        // Maybe check this if you want to include more: 
        //  https://stackoverflow.com/questions/32923811/set-notification-icon-in-gnome-shell-3-16-custom-extension
        Main.notify(_("TV " + (currentTvStatus===1 ? "OPENED" : "CLOSED")));
    }
    return true;  // in order to run the function forever (resource intensive..)
}


/*
    =====================================================================================
    =========================== WEATHER STATION (EXPERIMENTAL) ==========================
    =====================================================================================
*/
function _getWeatherStats() {
    /* 
    Returns a JS Object with temp (temperature) and humidity as retrieved from the server.
    This hasn't been tested yet since the corresponding endpoints are not live.
    */
    currentStats = Utils.sendRequest(weatherStatsURL, 'GET');
    if(currentStats === false){
        currentStats = {
            temperature: '-', 
            humidity: '-'
        };
    } else if (currentStats === -1) {
        log("tv-switch-gnome-shell-extension: sendRequest returned an invalid code for updating the weather statistics...");
        disable();
        throw new Error("tv-switch-gnome-shell-extension: sendRequest returned an invalid code for updating the weather statistics...");
    } 
    // else {
    //     currentStats = {
    //         temperature: 0,
    //         humidity: 0
    //     }
    // }
    log(`Current Weather Stats: ${currentStats.temperature}C|${currentStats.humidity}%`)
}


/*
    =====================================================================================
    ================================= CHANGE SPEC PATHS =================================
    =====================================================================================
*/
function _setTvPaths() {
    if (currentTvStatus === 1) {  // the tv is open
        new_icon = PauseTV;  // so that the icon in the top bar will shut the TV
        tvStatusText="TV Status: ON";
        tvSwitchURL=`${BASE_URL}/api/livingroom/turn-off-tv/`;  // turn-on-led is the endpoint for turning on the relay
    } else {
        new_icon = PlayTV;  // to open the TV
        tvStatusText="TV Status: OFF";
        tvSwitchURL=`${BASE_URL}/api/livingroom/turn-on-tv/`;  // turn-on-led is the endpoint for turning on the relay
    }
}


/*
    =====================================================================================
    =============================== SET THE CURRENT STATUS ==============================
    =====================================================================================
*/

// main handler
async function _changeStatus() {
    // Handle request
    // let urlStatusData = {currentStatus: 1};
    let urlStatusData = Utils.sendRequest(tvSwitchURL, 'GET');
    if (urlStatusData === false) {
        tvStatusText = "Failed";
    } else if (urlStatusData === -1) {
        log("tv-switch-gnome-shell-extension: sendRequest returned an invalid code...");
        disable();
        throw new Error("tv-switch-gnome-shell-extension: sendRequest returned an invalid code...");
    } else {
        currentTvStatus = urlStatusData.currentStatus;
        // Change icon/text/url based on the request
        _setTvPaths();
    }
    /*
    If text not already present, we create a new UI element, using ST library, that allows us
    to create UI elements of gnome-shell.
    */
    if (!text) {
        text = new St.Label({ 
            style_class: 'tv-status-label', 
            text: `${tvStatusText}` 
        });
        Main.uiGroup.add_actor(text);
    }

    text.opacity = 255;

    /*
    We have to choose the monitor we want to display the hello world label. Since in gnome-shell
    always has a primary monitor, we use it(the main monitor)
    */
    let monitor = Main.layoutManager.primaryMonitor;

    /*
    We change the position of the text to the center of the monitor.
    */
    text.set_position(monitor.x + Math.floor(monitor.width / 2 - text.width / 2),
                      monitor.y + Math.floor(monitor.height / 2 - text.height / 2));
    
    // Update icon
    icon.gicon = Gio.icon_new_for_string(`${Me.path}/icons/${new_icon}`);

    /*
    And using tweener for the animations, we indicate to tweener that we want
    to go to opacity 0%, in 2 seconds, with the type of transition easeOutQuad, and,
    when this animation has completed, we execute our function _hideText.
    */
    await Tweener.addTween(text, { 
        opacity: 0,
        time: 2,
        transition: 'easeOutQuad',
        onComplete: _hideText 
    });
}

/*
This is the init function, here we have to put our code to initialize our extension.
we have to be careful with init(), enable() and disable() and do the right things here.
*/
function init() {
    // Add the tv state/switch button in the panel
    button = new St.Bin({ style_class: 'panel-button',
                          reactive: true,
                          can_focus: true,
                          x_expand: true,
                          y_expand: false,
                          track_hover: true });

    // Add the temperature in the panel
    weatherStatsPanel = new St.Bin({
        style_class : "panel-button",
        reactive : true,
        can_focus : true,
        track_hover : true,
        height : 30,
    });
}

/*
We have to write here our main extension code and the things that actually make works the extension(Add ui elements, signals, etc).
*/
function enable() {
    /**
     * ===== TV Station Area ======
     */
    // We create an icon with the system-status-icon icon and give it the name "system-run"
    currentTvStatus = Utils.getCurrentTvStatus(tvStatusURL);  // this changes both new_icon and tv_is_open
    if(currentTvStatus !== -1)  {  // if no error occurred
        _setTvPaths();
    } else {
        log("tv-switch-gnome-shell-extension: getCurrentTvStatus returned an invalid code...");
        disable();
        throw new Error("tv-switch-gnome-shell-extension: getCurrentTvStatus returned an invalid code...");
    }
    icon = new St.Icon({ style_class: 'system-status-icon' });
    // TODO: Get current tv-switch status and show the corresponding image
    // log("GOT NEW ICON PATH: " + new_icon);
    icon.gicon = Gio.icon_new_for_string(`${Me.path}/icons/${new_icon}`);

    /*
    We put as a child of the button the icon, so, in the structure of actors we have the 
    icon inside the button that is a container.
    */
    button.set_child(icon);

    /*
    We connect the actor signal "button-press-event" from the button to the funcion _changeStatus. In this manner,
    when we press the button, this signal is emitted, and we captured it and execute the _changeStatus function.
    You can see all signals in the clutter reference(because we are using St that implements actors from clutter, and
    this signals comes from the actor class)
    */
    button.connect('button-press-event', _changeStatus);


    Main.panel._rightBox.insert_child_at_index(button, 0);


    /**
     * ===== Weather Area ======
     */
    weatherStatsPanelText = new St.Label({
        text : "-°C",
        y_align: Clutter.ActorAlign.CENTER,
    });
    _refreshWeatherStats();
    weatherStatsPanel.set_child(weatherStatsPanelText);
    weatherStatsPanel.connect("button-press-event", () => {
        _refreshWeatherStats();
    });

    // Change the tv status and the weather stats every X seconds (check function for comments)
    refreshTimeout = Mainloop.timeout_add_seconds(10, () => {
            _refreshTVStatus();
            _refreshWeatherStats();
        }    
    );

    Main.panel._rightBox.insert_child_at_index(weatherStatsPanel, 1);

}

/*
We have to delete all conections and things from our extensions, to let the system how it is before our extension. So
We have to unconnect the signals we connect, we have to delete all UI elements we created, etc.
*/
function disable() {
    // We remove the button from the right panel
    Main.panel._rightBox.remove_child(button);
    Main.panel._rightBox.remove_child(weatherStatsPanel);
    // TODO: Not sure if the timeout_add_seconds function stops refresing when disable is called. Check it.
    // remove mainloop
    Mainloop.source_remove(refreshTimeout);
}