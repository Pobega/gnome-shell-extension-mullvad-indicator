const GObject = imports.gi.GObject;
const Gio = imports.gi.Gio;
const Soup = imports.gi.Soup;
const St = imports.gi.St;

const Main = imports.ui.main;
const Mainloop = imports.mainloop;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const API_URL = 'https://am.i.mullvad.net/json';

const connectedIcon = 'mullvad-connected-symbolic';
const disconnectedIcon = 'mullvad-disconnected-symbolic';

let mullvadIndicator;

function _log(msg) {
    global.log(`[AmIMullvad] ${msg}`);
}

const MullvadIndicator = GObject.registerClass({
    GTypeName: 'MullvadIndicator',
}, class MullvadIndicator extends PanelMenu.Button {

    _init() {
        super._init(0);

        // Our status variables
        this._statusConnected = false;
        this._statusIpAddr = '';
        this._statusServer = '';

        // Our taskbar icon
        this._icon = new St.Icon({
            style_class: 'system-status-icon',
        });
        this._updateIcon(disconnectedIcon);

        this.add_child(this._icon);

        this._conn_status = new St.Label({text: 'Checking...'});
        let _conn_status = new PopupMenu.PopupMenuItem(
            'Mullvad:',
            {reactive: false}
        );
        _conn_status.add_child(this._conn_status);
        this.menu.addMenuItem(_conn_status);

        this._ip_addr = new St.Label({text: ''});
        let _ip_addr = new PopupMenu.PopupMenuItem(
            'IP Address:',
            {reactive: false}
        );
        _ip_addr.add_child(this._ip_addr);
        this.menu.addMenuItem(_ip_addr);

        this._server = new St.Label({text: ''});
        let _server = new PopupMenu.PopupMenuItem(
            'Server:',
            {reactive: false}
        );
        _server.add_child(this._server);
        this.menu.addMenuItem(_server);

        this._refresh();
    }

    _updateIcon(relative_path) {
        this._icon.gicon = Gio.icon_new_for_string(`${Me.path}/icons/${relative_path}.svg`);
    }

    _refresh() {
        this._fetchConnectionInfo();
        if (this._timeout) {
            Mainloop.source_remove(this._timeout);
            this._timeout = null;
        }
        this._timeout = Mainloop.timeout_add_seconds(10, function () {
            this._refresh();
        }.bind(this));
    }

    _fetchConnectionInfo() {
        let _httpSession = new Soup.Session();
        let message = Soup.Message.new('GET', API_URL);
        // Fake CURL to prevent 403
        message.request_headers.append('User-Agent', 'curl/7.68.0');
        message.request_headers.append('Accept', '*/*');
        _httpSession.queue_message(message, function (session, message) {
            let response = JSON.parse(JSON.stringify(message.response_body.data));
            this._checkIfStatusChanged(JSON.parse(response));
        }.bind(this));
    }

    _checkIfStatusChanged(api_response) {
        // Only update if our status has changed
        if (this._statusConnected !== api_response.mullvad_exit_ip ||
            this._statusIpAddr !== api_response.ip ||
            this._statusServer !== api_response.mullvad_exit_ip_hostname) {
            this._statusConnected = api_response.mullvad_exit_ip;
            this._statusIpAddr = api_response.ip;
            this._statusServer = api_response.mullvad_exit_ip_hostname;
            this._updateGui();
        }
    }

    _updateGui() {
        if (this._statusConnected === true) {
            this._conn_status.set_text('Connected');
            this._updateIcon(connectedIcon);
        } else {
            this._conn_status.set_text('Disconnected');
            this._updateIcon(disconnectedIcon);
        }
        this._ip_addr.set_text(this.statusIpAddr || '');
        this._server.set_text(this.statusServer || '');
    }

    stop() {
        if (this._timeout)
            Mainloop.source_remove(this._timeout);
        this._timeout = undefined;
    }

});

function init() {
}

function enable() {
    mullvadIndicator = new MullvadIndicator();
    Main.panel.addToStatusArea('AmIMullvad', mullvadIndicator, 1);
}

function disable() {
    mullvadIndicator.stop();
    mullvadIndicator.destroy();
}
