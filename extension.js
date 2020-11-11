/*
In this example we will be click a button in the top bar,
causing an event that create a text label (hello world), which with some
animation, will be decreasing its opacity from 100% to 0%
*/

const Me = imports.misc.extensionUtils.getCurrentExtension();

// For the GET Requests
const Soup = imports.gi.Soup;

/* Import St because is the library that allow you to create UI elements */
const St = imports.gi.St;

const Gio = imports.gi.Gio;

/*
Import Main because is the instance of the class that have all the UI elements
and we have to add to the Main instance our UI elements
*/
const Main = imports.ui.main;

/* Import tweener to do the animations of the UI elements */
const Tweener = imports.ui.tweener;

// new sesssion
var soupSyncSession = new Soup.SessionSync();
let BASE_URL = "http://192.168.0.105:8080";  // Raspberry-Pi server URL

/*
TV-Power-Switch Variables
*/
/* Global variables for use as button to click (button) and a text label. */
let text, button, tvStatusText, tvSwitchURL;
let icon;
let tv_is_open=false;
const PlayTV = 'tv-play-blue.png';  //'tv-play.svg';
const PauseTV = 'tv-shut-blue.png';
let new_icon = PauseTV;

/*
Weather-Related Variables / Endpoints
*/
const weatherStatsURL = `${BASE_URL}/api/get-weather-stats/`;  // URL for both the temp and humidity
// Note: the apis below respond with a single value (not a json) in my case
const tempURL = `${BASE_URL}/api/get-temperature/`;
const humidityURL = `${BASE_URL}/api/get-humidity/`;
const tvStatusURL = `${BASE_URL}/api/get-tv-status/`
let currentStats;  // a dictionary with 2 keys (temp and humidity). Currently only temp is used.

/*
Function to call when the label is opacity 0%, as the label remains as a
UI element, but not visible, we have to delete it explicitily. So since
the label reaches 0% of opacity we remove it from Main instance.
*/
function _hideText() {
    Main.uiGroup.remove_actor(text);
    text = null;
}


function _getWeatherStats(onlyTemperature=false) {
    if (onlyTemperature)
        const statsURL = tempURL;
    else
        const statsURL = weatherStatsURL
    var message = Soup.Message.new('GET', tempURL);
    var responseCode = soupSyncSession.send_message(message);
    if(responseCode == 200) {
        currentStats = JSON.parse(message['response-body'].data);
    } else {
        currentStats = {temp: 'Failed', humidity: 'Failed'}
    }
    console.log("CURRENT STATS: " + currentStats);
    return currentStats;
}

function setCurrentTvStatusImage() {
    // changes the value of tv_is_open based on the current tv status
    //  as retrieved from the server.
    // If the response code is not 200 (so there was a failure) then the status does not change.
    let message = Soup.Message.new('GET', tvStatusURL);
    var responseCode = soupSyncSession.send_message(message);
    
    if(responseCode == 200) {
        // returns a simple value (NOT JSON)
        // TODO: Change server so that it always returns JSONS
        const tvStatus = message['response-body'].data;
        if (Number(tvStatus) === 1) {
            tv_is_open = true;
            new_icon = PauseTV;  // so that the icon in the top bar will shut the TV
            tvStatusText="TV Status: OFF";
            tvSwitchURL=`${BASE_URL}/turn-on-led/`;  // turn-on-led is the endpoint for turning on the relay
        } else {
            tv_is_open = false;
            new_icon = PlayTV;  // to open the TV
            tvStatusText="TV Status: ON";
            tvSwitchURL=`${BASE_URL}/turn-off-led/`;  // turn-on-led is the endpoint for turning on the relay
        }
    }
}


function _changeStatus() {
    // Handle request
    // Change icon/text/url based on the request
    // setCurrentTvStatusImage();  // this line of code can get rid of the following if block
    if (tv_is_open){
        new_icon = PauseTV;
        tvStatusText="TV Status: OFF";
        tvSwitchURL=`${BASE_URL}/turn-on-led/`;  // turn-on-led is the endpoint for turning on the relay
    } else {
        new_icon = PlayTV;
        tvStatusText="TV Status: ON";
        tvSwitchURL=`${BASE_URL}/turn-off-led/`;  // turn-on-led is the endpoint for turning on the relay
    }
    tv_is_open = !(tv_is_open);  // update tv_is_open
	var message = Soup.Message.new('GET', tvSwitchURL);
	var responseCode = soupSyncSession.send_message(message);
	// if(responseCode == 200) {
	// 	var responseBody = message['response-body'];
	// 	var response = JSON.parse(responseBody.data);
	// } else {
	// 	tvStatusText = "Failed";
	// }
    if(responseCode !== 200)  {
        tvStatusText = "Failed";
    }
    /*
    If text not already present, we create a new UI element, using ST library, that allows us
    to create UI elements of gnome-shell.
    */
    if (!text) {
        text = new St.Label({ style_class: 'tv-status-label', text: `${tvStatusText}` });
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

    /*
    And using tweener for the animations, we indicate to tweener that we want
    to go to opacity 0%, in 2 seconds, with the type of transition easeOutQuad, and,
    when this animation has completed, we execute our function _hideText.
    */
    Tweener.addTween(text,
                     { opacity: 0,
                       time: 5,
                       transition: 'easeOutQuad',
                       onComplete: _hideText });
    // Update icon
    icon.gicon = Gio.icon_new_for_string(`${Me.path}/icons/${new_icon}`);
}

/*
This is the init function, here we have to put our code to initialize our extension.
we have to be careful with init(), enable() and disable() and do the right things here.
*/
function init() {
    /*
    We create a button for the top panel. We pass to the constructor a map of properties, properties from St.Bin and its
    parent classes, like St.Widget. So we declare this properties: a style class(from css theming of gnome shell), we made it reactive
    so the button respond for the mouse clicks, we made it that can focus, so marks the button as being able to receive keyboard focus 
    via keyboard navigation, we made the button to fill the x space, and we don't want to fill the y space, so we set the values trues and false respectively
    and we want that the button be reactive to the hover of the mouse, so we set the value of the track_hover property to true.
    */
    button = new St.Bin({ style_class: 'panel-button',
                          reactive: true,
                          can_focus: true,
                          x_fill: true,
                          y_fill: false,
                          track_hover: true });

    /*
    We create an icon with the system-status-icon icon and give it the name "system-run"
    */    
    // let icon = new St.Icon({ icon_name: 'system-run-symbolic',
    //                          style_class: 'system-status-icon' });
    icon = new St.Icon({ style_class: 'system-status-icon' });
    // TODO: Get current tv-switch status and show the corresponding image
    // setCurrentTvStatusImage();  // this changes both new_icon and tv_is_open
    // icon.gicon = Gio.icon_new_for_string(`${Me.path}/icons/${new_icon}`);
    icon.gicon = Gio.icon_new_for_string(`${Me.path}/icons/${PauseTV}`);

    /*
    We put as a child of the button the icon, so, in the structure of actors we have the icon inside the button that is a
    container.
    */
    button.set_child(icon);

    /*
    We connect the actor signal "button-press-event" from the button to the funcion _changeStatus. In this manner,
    when we press the button, this signal is emitted, and we captured it and execute the _changeStatus function.
    You can see all signals in the clutter reference(because we are using St that implements actors from clutter, and
    this signals comes from the actor class)
    */
    button.connect('button-press-event', _changeStatus);
}

/*
We have to write here our main extension code and the things that actually make works the extension(Add ui elements, signals, etc).
*/
function enable() {
    /*
    We add the button we created before to the rigth panel of the top panel (where the sound and wifi settings are)
    */
    Main.panel._rightBox.insert_child_at_index(button, 0);
}

/*
We have to delete all conections and things from our extensions, to let the system how it is before our extension. So
We have to unconnect the signals we connect, we have to delete all UI elements we created, etc.
*/
function disable() {
    /*
    We remove the button from the right panel
    */
    Main.panel._rightBox.remove_child(button);
}