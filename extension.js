const GObject = imports.gi.GObject;
const Gio = imports.gi.Gio;
const Soup = imports.gi.Soup;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const Gui = Me.imports.gui;

const Main = imports.ui.main;
const Mainloop = imports.mainloop;
const PanelMenu = imports.ui.panelMenu;


const API_URL = 'https://am.i.mullvad.net/json';

const DEFAULT_DATA = {
    server: {name: _('Server'), text: ''},
    country: {name: _('Country'), text: ''},
    city: {name: _('City'), text: ''},
    ip: {name: _('IP Address'), text: _('')},
    type: {name: _('VPN Type'), text: ''},
};

const ICON_CONNECTED = 'mullvad-connected-symbolic';
const ICON_DISCONNECTED = 'mullvad-disconnected-symbolic';

const HTTP_TIMEOUT_REACHED = 7;

let _networkMonitor = Gio.NetworkMonitor.get_default();

let _httpSession = new Soup.SessionAsync();
Soup.Session.prototype.add_feature.call(_httpSession, new Soup.ProxyResolverDefault());
_httpSession.timeout = 5;

const MullvadIndicator = GObject.registerClass({
    GTypeName: 'MullvadIndicator',
}, class MullvadIndicator extends PanelMenu.Button {

    _init() {
        super._init(0);

        this._initConnStatus();

        this._connectNetworkSignals();

        Gui.init(this);

        // Start the refresh Mainloop
        this._refresh();
    }


    _connectNetworkSignals() {
        // Refresh our status when a network event occurs
        _networkMonitor.connect('network-changed', function () {
            this._forceUpdate();
        }.bind(this));
    }


    _initConnStatus() {
        // We use JSON here to 'clone' from our default Object
        this._connStatus = JSON.parse(JSON.stringify(DEFAULT_DATA));
        this._connected = false;
    }


    _forceUpdate() {
        this._initConnStatus();
        this._update();
    }


    // Caller for fetchConnectionInfo that passes the callback
    _update() {
        this._fetchConnectionInfo(function(status_code, response) {
            this._checkIfStatusChanged(status_code, response);
        }.bind(this));
    }


    // Use our Soup.Session to ping am.i.mullvad.net
    _fetchConnectionInfo(callback) {
        let message = Soup.Message.new('GET', API_URL);

        // Fake CURL to prevent 403
        message.request_headers.append('User-Agent', 'curl/7.68.0');
        message.request_headers.append('Accept', '*/*');

        _httpSession.queue_message(message, function (_httpSession, message) {
            if (message.status_code !== 200) {
                callback(message.status_code, null);
                return;
            }
            let responseJSON = message.response_body.data;
            let response = JSON.parse(JSON.stringify(responseJSON));
            callback(null, response);
        });
    }


    _checkIfStatusChanged(status_code, api_response) {
        //TODO: check NetworkMonitor for status, otherwise when we
        //disconnect we will never actually mark ourselves as offline.

        // Unsure why I need to JSON.parse this again but whatever
        api_response = JSON.parse(api_response);

        // Don't do anything if our GET failed
        if (status_code === HTTP_TIMEOUT_REACHED) {
            return;
        }

        // if api_response is null we want to assume we're disconnected
        if (!api_response) {
            this._connected = false;
            Gui.update(this);
            return
        }

        // Only update if our status has changed
        if (this._connected !== api_response.mullvad_exit_ip ||
            this._connStatus.ip.text !== api_response.ip ||
            this._connStatus.server.text !== api_response.mullvad_exit_ip_hostname) {
            // Overwrite all values with the API response
            this._connected = api_response.mullvad_exit_ip;
            this._connStatus.ip.text = api_response.ip;
            this._connStatus.server.text = api_response.mullvad_exit_ip_hostname;
            this._connStatus.city.text = api_response.city;
            this._connStatus.country.text = api_response.country;
            this._connStatus.type.text = api_response.mullvad_server_type;

            // Tell the GUI to redraw
            Gui.update(this);
        }
    }


    _refresh() {
        this._update();
        if (this._timeout) {
            Mainloop.source_remove(this._timeout);
            this._timeout = null;
        }
        this._timeout = Mainloop.timeout_add_seconds(600, function () {
            this._refresh();
        }.bind(this));
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
