const Gettext = imports.gettext;
const { GObject, Gio, Soup } = imports.gi;
const Mainloop = imports.mainloop;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const Gui = Me.imports.gui;

const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;


Gettext.bindtextdomain('mullvadindicator', Me.dir.get_child('locale').get_path());
Gettext.textdomain('mullvadindicator');
const _ = Gettext.gettext;

const API_URL = 'https://am.i.mullvad.net/json';

const DEFAULT_ITEMS = {
    server: {name: _('Server'), text: ''},
    country: {name: _('Country'), text: ''},
    city: {name: _('City'), text: ''},
    ip: {name: _('IP Address'), text: ''},
    type: {name: _('VPN Type'), text: ''},
};

const ICON_CONNECTED = 'mullvad-connected-symbolic';
const ICON_DISCONNECTED = 'mullvad-disconnected-symbolic';

const networkMonitor = Gio.NetworkMonitor.get_default();

const httpSession = new Soup.SessionAsync();
Soup.Session.prototype.add_feature.call(httpSession, new Soup.ProxyResolverDefault());
httpSession.timeout = 5;

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
        networkMonitor.connect('network-changed', function () {
            this._forceUpdate();
        }.bind(this));
    }


    _initConnStatus() {
        // We use JSON here to 'clone' from our default Object
        this._connStatus = JSON.parse(JSON.stringify(DEFAULT_ITEMS));
        this._connected = false;
    }


    _forceUpdate() {
        this._initConnStatus();
        this._update();
    }


    // Caller for fetchConnectionInfo that passes the callback
    _update() {
        this._fetchConnectionInfo(function (status_code, response) {
            this._checkIfStatusChanged(status_code, response);
        }.bind(this));
    }


    // Use our Soup.Session to ping am.i.mullvad.net
    _fetchConnectionInfo(callback) {
        const message = Soup.Message.new('GET', API_URL);

        // Fake CURL to prevent 403
        message.request_headers.append('User-Agent', 'curl/7.68.0');
        message.request_headers.append('Accept', '*/*');

        // Exit early and return null values if we're explicitly not connected
        if (networkMonitor.connectivity !== Gio.NetworkConnectivity.FULL)
            callback(null, null, null);

        httpSession.queue_message(message, function (httpSession, message) {
            if (message.status_code !== 200) {
                callback(message.status_code, null);
                return;
            }
            const responseJSON = message.response_body.data;
            const response = JSON.parse(JSON.stringify(responseJSON));
            callback(null, response);
        });
    }


    _checkIfStatusChanged(status_code, api_response) {
        // Unsure why I need to JSON.parse this again but whatever
        api_response = JSON.parse(api_response);

        // Don't do anything if our GET failed
        if (status_code === Soup.KnownStatusCode.IO_ERROR)
            return;

        // if api_response is null we want to assume we're disconnected
        if (!api_response) {
            this._connected = false;
            Gui.update(this, this._applyDisplaySettingsFilter());
            return;
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
            Gui.update(this, this._applyDisplaySettingsFilter());
        }
    }


    _refresh() {
        this._update();
        if (this._timeout) {
            Mainloop.source_remove(this._timeout);
            this._timeout = null;
        }
        const refreshTime = getSettings().get_int('refresh-time');
        this._timeout = Mainloop.timeout_add_seconds(refreshTime, function () {
            this._refresh();
        }.bind(this));
    }


    // Return a copy of this._connStatus with the items the user
    // opts not to see removed, for passing to Gui.update()
    _applyDisplaySettingsFilter() {
        const settings = getSettings();
        const displaySettings = {};
        if (settings.get_boolean('show-server'))
            displaySettings.server = this._connStatus.server;
        if (settings.get_boolean('show-country'))
            displaySettings.country = this._connStatus.country;
        if (settings.get_boolean('show-city'))
            displaySettings.city = this._connStatus.city;
        if (settings.get_boolean('show-ip'))
            displaySettings.ip = this._connStatus.ip;
        if (settings.get_boolean('show-type'))
            displaySettings.type = this._connStatus.type;
        return displaySettings;
    }

    stop() {
        // Kill our mainloop when we shut down
        if (this._timeout)
            Mainloop.source_remove(this._timeout);
        this._timeout = undefined;
    }

});

function getSettings() {
    const GioSSS = Gio.SettingsSchemaSource;
    const schemaSource = GioSSS.new_from_directory(
        Me.dir.get_child('schemas').get_path(),
        GioSSS.get_default(),
        false
    );
    const schemaObj = schemaSource.lookup(
        'org.gnome.shell.extensions.amimullvad',
        true
    );
    if (!schemaObj)
        throw new Error('cannot find schemas');

    return new Gio.Settings({settings_schema: schemaObj});
}

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
