const GObject = imports.gi.GObject;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Soup = imports.gi.Soup;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const DBus = Me.imports.dbus;
const Gui = Me.imports.gui;
const Defaults = Me.imports.defaults;

const Main = imports.ui.main;
const Mainloop = imports.mainloop;
const PanelMenu = imports.ui.panelMenu;

const API_URL = 'https://am.i.mullvad.net/json';

const ICON_CONNECTED = 'mullvad-connected-symbolic';
const ICON_DISCONNECTED = 'mullvad-disconnected-symbolic';

// Singleton sessions
//let _httpSession = new Soup.Session();
//Soup.Session.prototype.add_feature.call(_httpSession, new Soup.ProxyResolverDefault());
//_httpSession.timeout = 10;
let dbusProxy = DBus.networkManagerProxyCreate();

const MullvadIndicator = GObject.registerClass({
    GTypeName: 'MullvadIndicator',
}, class MullvadIndicator extends PanelMenu.Button {

    _init() {
        super._init(0);

        this._initConnStatus();

        this._initDbusSignals();

        Gui.init(this);

        // Start the refresh Mainloop
        this._refresh();
    }


    _initDbusSignals() {
        // Connecting to DBus signals related to network changes
        dbusProxy.connectSignal("DeviceAdded", function(proxy) {
            global.log('-~-~- DeviceAdded signal-~-~- ');
            GLib.spawn_command_line_sync('sleep 2');
            this._refresh();
        }.bind(this));
        dbusProxy.connectSignal("DeviceRemoved", function(proxy) {
            global.log('-~-~- DeviceRemoved signal-~-~- ');
            GLib.spawn_command_line_sync('sleep 2');
            this._refresh();
        }.bind(this));
        dbusProxy.connectSignal("StateChanged", function(proxy) {
            global.log('-~-~- StateChanged signal-~-~- ');
            GLib.spawn_command_line_sync('sleep 2');
            this._refresh();
        }.bind(this));

    }

    _initConnStatus() {
        // We use JSON here to 'clone' from our default Object
        this._connStatus = JSON.parse(JSON.stringify(Defaults.DEFAULT_DATA));
        this._connected = false;
    }

    _forceUpdate() {
        this._initConnStatus();
        this._fetchConnectionInfo();
    }

    _refresh() {
        global.log('entered timed refresh');
        this._fetchConnectionInfo();
        if (this._timeout) {
            Mainloop.source_remove(this._timeout);
            this._timeout = -1;
        }
        this._timeout = Mainloop.timeout_add_seconds(100, function () {
            this._refresh();
        }.bind(this));
    }

    _fetchConnectionInfo() {
        let _httpSession = new Soup.Session();
        Soup.Session.prototype.add_feature.call(_httpSession, new Soup.ProxyResolverDefault());
        _httpSession.timeout = 30;
        let message = Soup.Message.new('GET', API_URL);
        // Fake CURL to prevent 403
        message.request_headers.append('User-Agent', 'curl/7.68.0');
        message.request_headers.append('Accept', '*/*');
        global.log('sending http request');
        _httpSession.queue_message(message, function (session, message) {
            let response = JSON.parse(JSON.stringify(message.response_body.data));
            global.log(`HTTP RESPONSE: ${response}`);
            this._checkIfStatusChanged(JSON.parse(response));
        }.bind(this));
    }

    _checkIfStatusChanged(api_response) {
        // if api_response is null we want to assume we're disconnected
        global.log('in status check!');
        global.log(`${api_response}`);
        if (!api_response) {
            global.log('something failed :(!');
            this._connected = false;
            Gui.update(this);
            return
        }
        global.log(`exit ip ${api_response.mullvad_exit_ip}`);
        // Only update if our status has changed
        if (this._connected !== api_response.mullvad_exit_ip ||
            this._connStatus.ip.text !== api_response.ip ||
            this._connStatus.server.text !== api_response.mullvad_exit_ip_hostname) {
            // Overwrite all values with the API response
            global.log('overwriting values :)');
            this._connected = api_response.mullvad_exit_ip;
            this._connStatus.ip.text = api_response.ip;
            this._connStatus.server.text = api_response.mullvad_exit_ip_hostname;
            this._connStatus.city.text = api_response.city;
            this._connStatus.country.text = api_response.country;
            this._connStatus.type.text = api_response.mullvad_server_type;

            // Tell the GUI to redraw
            Gui.update(this);
        }
        global.log('nothing changed?');
    }

    stop() {
        // Kill our mainloop when we shut down
        if (this._timeout)
            Mainloop.source_remove(this._timeout);
        this._timeout = undefined;
    }

});

function init() {
}

let _amIMullvad;

function enable() {
    _amIMullvad = new MullvadIndicator();
}

function disable() {
    _amIMullvad.stop();
    _amIMullvad.destroy();
}
