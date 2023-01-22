# Mullvad Indicator

System tray indicator for Mullvad VPN. Monitors your connection and allows you to view connection details from the system tray.

## How it works

The extension listens for 'network-changed' events from [GNetworkmonitor](https://developer.gnome.org/gio/stable/GNetworkMonitor.html) and will poll Mullvad's `https://am.i.mullvad.net/json` API using Gnome's [libsoup](https://developer.gnome.org/libsoup/stable/) to get the system's current Mullvad connection status.

## Issue reporting

If you run into any issues feel free to report them here. Please include logs from Gnome's [Looking Glass](https://wiki.gnome.org/Projects/GnomeShell/LookingGlass) if possible/applicable.

## Feature requests & Forks

Pull requests are always welcome, but please try to stick to Gnome's [GJS Style Guidelines](https://wiki.gnome.org/Attic/Gjs/StyleGuide).

In addition you're of course welcome to fork this repo if you'd like, but please be kind and send back any changes that may be relevant here :)

## Screenshots
![Screenshot](screenshots/screenshot.png)
![Settings](screenshots/settings.png)

## Special thanks
 * The authors of http://gjs.guide/
 * [zacius](https://github.com/zacius) for testing and being patient with me when I broke the master branch :')
 * [andyholmes](https://github.com/andyholmes/) on #extensions:gnome.org who helped with some particularly nasty code issues as well as reading his projects to learn Gjs.
 * [quasipedia](https://github.com/quasipedia) whose [NordVPN Gnome extension](https://extensions.gnome.org/extension/1347/nordvpn-status/) I relied on heavily.
