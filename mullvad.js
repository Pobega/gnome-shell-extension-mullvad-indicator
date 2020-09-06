const {GObject, Gio, Soup} = imports.gi;
const Gettext = imports.gettext;

const Me = imports.misc.extensionUtils.getCurrentExtension();

Gettext.bindtextdomain('mullvadindicator', Me.dir.get_child('locale').get_path());
Gettext.textdomain('mullvadindicator');
const _ = Gettext.gettext;

const DEFAULT_ITEMS = {
    server: {name: _('Server'), text: ''},
    country: {name: _('Country'), text: ''},
    city: {name: _('City'), text: ''},
    ip: {name: _('IP Address'), text: ''},
    type: {name: _('VPN Type'), text: ''},
};

const _networkMonitor = Gio.NetworkMonitor.get_default();

const _httpSession = new Soup.SessionAsync();
Soup.Session.prototype.add_feature.call(
    _httpSession,
    new Soup.ProxyResolverDefault(),
);
_httpSession.timeout = 2;

var MullvadVPN = GObject.registerClass({
    GTypeName: 'MullvadVPN',
    Properties: {
        'connected': GObject.ParamSpec.string('connected',
            'Connection Status',
            'Current connection status to Mullvad',
            GObject.ParamFlags.READABLE, null),
        'detailed-status': GObject.ParamSpec.string('detailed-status',
            'Detailed connection Status',
            'Current connection status to Mullvad',
            GObject.ParamFlags.READABLE, null),
    },
    Signals: {
        'status-changed': {},
    },
}, class MullvadVPN extends GObject.Object {
    // Initialize this._connStatus and connect to GNetworkMonitor
    _init(params = {}) {
        super._init(params);


        this.initConnStatus();
        this.connectNetworkSignals();
    }

    // Boolean; whether or not we're connected
    get connected() {
        if (typeof this._connected === 'undefined')
            return false;
        return this._connected;
    }

    // An object describing the current connection details; see DEFAULT_DATA
    get detailed_status() {
        if (typeof this._connStatus === 'undefined')
            return DEFAULT_ITEMS;
        return this._detailedStatusFiltered();
    }

    // Initialize our connStatus to empty strings
    initConnStatus() {
        // We use JSON here to 'clone' from our default Object
        this._connStatus = JSON.parse(JSON.stringify(DEFAULT_ITEMS));
        this._connected = false;
    }

    // force an update check when a GNetworkMonitor emits network-changed
    connectNetworkSignals() {
        _networkMonitor.connect('network-changed', () => {
            this.pollMullvad();
        });
    }

    // Force a hard update by re-initializing _connStatus and calling update
    forceUpdate() {
        this.initConnStatus();
        this.pollMullvad();
    }

    // Wrapper for fetchConnectionInfo that passes a callback
    pollMullvad() {
        this._fetchConnectionInfo((status_code, response) => {
            this._checkIfStatusChanged(status_code, response);
        });
    }

    // Use Soup.Session to GET am.i.mullvad.net/json
    _fetchConnectionInfo(callback) {
        const request = new Soup.Message({
            method: 'GET',
            uri: Soup.URI.new('https://am.i.mullvad.net/json'),
        });
        // Fake CURL to prevent 403
        request.request_headers.append('User-Agent', 'curl/7.68.0');
        request.request_headers.append('Accept', '*/*');

        _httpSession.queue_message(request, function (session, message) {
            if (message.status_code !== 200) {
                callback(message.status_code, null);
                return;
            }
            const responseJSON = message.response_body.data;
            const response = JSON.parse(JSON.stringify(responseJSON));
            callback(null, response);
        });
    }

    // Compare our currently stored status to what the API reports.
    // If something has changed we should emit 'update' to tell the UI to
    // re-read our status.
    _checkIfStatusChanged(status_code, api_response) {
        // Unsure why I need to JSON.parse this again but whatever
        api_response = JSON.parse(api_response);

        // Don't do anything if our GET failed
        if (status_code === Soup.KnownStatusCode.IO_ERROR)
            return;


        // if api_response is null we want to assume we're disconnected
        if (!api_response) {
            this._connected = false;
            this.emit('status-changed');
            return;
        }

        // Only update if our status has changed
        if (this._connected !== api_response.mullvad_exit_ip) {
            // Overwrite all values with the API response
            this._connected = api_response.mullvad_exit_ip;
            this._connStatus.ip.text = api_response.ip;
            this._connStatus.server.text = api_response.mullvad_exit_ip_hostname;
            this._connStatus.city.text = api_response.city;
            this._connStatus.country.text = api_response.country;
            this._connStatus.type.text = api_response.mullvad_server_type;
        }

        // Always tell the GUI to redraw since we don't know its state
        this.emit('status-changed');
    }

    // Return a copy of this._connStatus with the items the user
    // opts not to see removed, used by the _connStatus getter
    _detailedStatusFiltered() {
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

});

function getSettings() {
    const GioSSS = Gio.SettingsSchemaSource;
    const schemaSource = GioSSS.new_from_directory(
        Me.dir.get_child('schemas').get_path(),
        GioSSS.get_default(),
        false,
    );
    const schemaObj = schemaSource.lookup(
        'org.gnome.shell.extensions.mullvadindicator',
        true,
    );
    if (!schemaObj)
        throw new Error('cannot find schemas');

    return new Gio.Settings({settings_schema: schemaObj});
}
