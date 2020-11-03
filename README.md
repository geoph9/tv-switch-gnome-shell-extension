# Tv Status Switch - Gnome Extension

This is part of a bigger project where I am trying to build a smart home from scratch. My main server is a Raspberry Pi 4 which communicates with some NodeMcu ESP-8266 boards that I have placed around my house. One of these boards is placed close to my TV and so I thought I could connect that to a relay and manage the power of my TV through the main server. Then I thought, I could make a gnome extension for that just so I can practice. 

My code is based on these two tutorials:

- [julio641742/gnome-shell-extension-reference](https://github.com/julio641742/gnome-shell-extension-reference/blob/master/tutorials/FIRST-EXTENSION.md).
- [Susanna Huhtanen/JavaScript and GNOME 3](https://cannonerd.wordpress.com/2012/01/11/javascript-and-gnome-3-referring-to-files-and-asynchronous-http-requests-using-async-libsoup/) (+the comments).

I have made some small tweaks so that the top-bar icon has two states, one when the tv is open and one where the tv power is off. In addition, when a button is pressed, a text will appear in the middle of the screen showing the current TV status. The button on the top bar shows the current status and when pressed that status will change.

The flow is like this:
- If the current button is play, then when pressed, the TV will be turned off by sending a `GET` request to the corresponding endpoint for turning off the tv. Also, the button will change to the shutdown button (since the TV is currently shut).
- If the current button is the shutdown one, then when pressed, the TV will be turned on by sending a `GET` request to the corresponding endpoint for turning on the tv. Also, the button will change to the play button (since the TV has been turned on).


The button icons look like this:
![Icons](images/icon-preview.png?raw=true "The blue and shut buttons.")

When the shut button is pressed, then the TV will be turned on and a status text will appear in the middle of the screen, like this:
![Central Text](images/central-text-preview.png?raw=true "How the text appears.")

## TODO:

- Connect the temperature sensor to the extension. A new label should appear in the top bar that updates the home temperature every 5-15 minutes.