const Clutter = imports.gi.Clutter;
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

const ICON_CONNECTED = 'mullvad-connected-symbolic';
const ICON_DISCONNECTED = 'mullvad-disconnected-symbolic';

const DEFAULT_DATA = {
    server: { name: _("Server"), text: ''},
    country: { name: _("Country"), text: ''},
    city: { name: _("City"), text: ''},
    ip: { name: _("IP Address"), text: _('')},
    type: { name: _("VPN Type"), text: ''},
};

const MullvadIndicator = GObject.registerClass({
    GTypeName: 'MullvadIndicator',
}, class MullvadIndicator extends PanelMenu.Button {

    _init() {
        super._init(0);

        this._connected = false;
        // We use JSON here to 'clone' from our default Object
        this._connStatus = JSON.parse(JSON.stringify(DEFAULT_DATA));

        // Taskbar icon
        this._icon = new St.Icon({
            style_class: 'system-status-icon',
        });
        this._updateIcon(ICON_DISCONNECTED);
        this.add_child(this._icon);
        // End taskbar icon

        // Popup menu
        let popupMenu = new PopupMenu.PopupMenuSection();
        this.menu.box.style = "padding: 16px;";
        let parentContainer = new St.BoxLayout({
            x_align: Clutter.ActorAlign.FILL,
            x_expand: true,
            style: "min-width:240px; padding-bottom: 10px;"
        });
        // End popup menu

        this.vpnInfoBox = new St.BoxLayout({
            style_class: 'ip-info-box',
            vertical: true ,
            x_align: Clutter.ActorAlign.CENTER,
        });
        parentContainer.add_actor(this.vpnInfoBox);
        popupMenu.actor.add(parentContainer);
        this.menu.addMenuItem(popupMenu);

        // Settings button
        let buttonBox = new St.BoxLayout();
        this._settingsIcon = new St.Icon({
            icon_name: 'emblem-system-symbolic',
            style_class: 'popup-menu-icon'
        });
        this._settingsButton = new St.Button({
            child: this._settingsIcon,
            style_class: 'button'
        });
        this._settingsButton.connect('clicked',  ()=> Util.spawnCommandLine('gnome-extensions prefs amimullvad@pobega.github.com'));
        buttonBox.add_actor(this._settingsButton);
        // End settings button

        // Refresh button
        this._refreshIcon = new St.Icon({
            icon_name: 'view-refresh-symbolic',
            style_class: 'popup-menu-icon'
        });
        this._refreshButton = new St.Button({
            child: this._refreshIcon,
            x_expand: true,
            x_align: Clutter.ActorAlign.END,
            style_class: 'button'
        });
        this._refreshButton.connect('clicked',  ()=> {
            this._forceUpdate(100);
        });
        buttonBox.add_actor(this._refreshButton);
        // End refresh button

        popupMenu.actor.add(parentContainer);
        popupMenu.actor.add_actor(buttonBox);
        this.menu.addMenuItem(popupMenu);

        Main.panel.addToStatusArea('AmIMullvad', this, 1);
        this._refresh();
    }

    _forceUpdate() {
        this._connStatus = JSON.parse(JSON.stringify(DEFAULT_DATA));
        this._fetchConnectionInfo();
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
        global.log('mullvad - fetching conn info');
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
        if (this._connected !== api_response.mullvad_exit_ip ||
            this._connStatus.ip.text !== api_response.ip ||
            this._connStatus.server.text !== api_response.mullvad_exit_ip_hostname) {
            this._connected = api_response.mullvad_exit_ip;
            this._connStatus.ip.text = api_response.ip;
            this._connStatus.server.text = api_response.mullvad_exit_ip_hostname;
            this._connStatus.city.text = api_response.city;
            this._connStatus.country.text = api_response.country;
            this._connStatus.type.text = api_response.mullvad_server_type;
            this._updateGui();
        } else {
        }
    }

    _updateGui() {
        this.vpnInfoBox.destroy_all_children();

        let vpnInfoRow = new St.BoxLayout();
        this.vpnInfoBox.add_actor(vpnInfoRow);

        let label = new St.Label({
            style_class: this._connected ? 'vpn-info-vpn-on' : 'vpn-info-vpn-off',
            text: _("Mullvad") + ': ',
            x_align: Clutter.ActorAlign.START,
            y_align: Clutter.ActorAlign.START,
            y_expand: false,
        });
        vpnInfoRow.add_actor(label);

        let vpnLabel = new St.Label({
            style_class: this._connected ? 'ip-info-vpn-on' : 'ip-info-vpn-off',
            text: this._connected ? 'Connected' : 'Disconnected',
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.START,
            x_expand: true,
            y_expand: false,
        });
        vpnInfoRow.add_actor(vpnLabel);

        this.vpnInfoBox.add_actor(new PopupMenu.PopupSeparatorMenuItem());

        let vpnIcon = new St.Icon({
            icon_name: this._connected ? 'security-high-symbolic' : 'security-low-symbolic',
            style_class: this._connected ? 'popup-menu-icon vpn-info-vpn-on' : 'popup-menu-icon vpn-info-vpn-off',
            x_align: Clutter.ActorAlign.END,
            x_expand: true,
        });
        vpnInfoRow.add_actor(vpnIcon);

        if (this._connected === true) {
            this._updateIcon(ICON_CONNECTED);
        } else {
            this._updateIcon(ICON_DISCONNECTED);
            return;
        }

        for(let key in DEFAULT_DATA){
            if(this._connStatus[key]){
                let vpnInfoRow = new St.BoxLayout();
                this.vpnInfoBox.add_actor(vpnInfoRow);

                let label = new St.Label({
                    style_class: 'vpn-info-key',
                    text: _(DEFAULT_DATA[key].name) + ': ',
                    x_align: Clutter.ActorAlign.FILL,
                    y_align: Clutter.ActorAlign.CENTER,
                    y_expand: true,
                });
                vpnInfoRow.add_actor(label);

                let infoLabel = new St.Label({
                    style_class: 'vpn-info-value',
                    text: this._connStatus[key].text || '',
                    x_align: Clutter.ActorAlign.FILL,
                    y_align: Clutter.ActorAlign.CENTER,
                    x_expand: true,
                    y_expand: true,
                });
                let dataLabelBtn = new St.Button({
                    child: infoLabel,
                });
                dataLabelBtn.connect('button-press-event', () => {
                    Clipboard.set_text(CLIPBOARD_TYPE, dataLabelBtn.child.text);
                });
                vpnInfoRow.add_actor(dataLabelBtn);
            }
        }
    }

    stop() {
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
