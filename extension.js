const {Clutter, GObject, Gio, St} = imports.gi;
const Gettext = imports.gettext;
const Mainloop = imports.mainloop;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const Mullvad = Me.imports.mullvad;

const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Util = imports.misc.util;

Gettext.bindtextdomain('mullvadindicator', Me.dir.get_child('locale').get_path());
Gettext.textdomain('mullvadindicator');
const _ = Gettext.gettext;

const ICON_CONNECTED = 'mullvad-connected-symbolic';
const ICON_DISCONNECTED = 'mullvad-disconnected-symbolic';

const MullvadIndicator = GObject.registerClass({
    GTypeName: 'MullvadIndicator',
}, class MullvadIndicator extends PanelMenu.Button {

    _init() {
        super._init(0);

        this.mullvad = new Mullvad.MullvadVPN();

        this._initGui();

        this.watch = this.mullvad.connect('status-changed', (mullvad) => {
            global.log("Caught signal");
            this.update();
        });

        this.main();
    }

    _initGui() {
        // Taskbar icon
        this._icon = new St.Icon({
            style_class: 'system-status-icon',
        });
        this._updateTrayIcon(ICON_DISCONNECTED);
        this.add_child(this._icon);
        // End taskbar icon

        // Popup menu
        let popupMenu = new PopupMenu.PopupMenuSection();
        this.menu.box.style = 'padding: 16px;';
        let parentContainer = new St.BoxLayout({
            x_align: Clutter.ActorAlign.FILL,
            x_expand: true,
            style: 'padding-bottom: 12px;',
        });
        // End popup menu

        // Highest level text box
        this.vpnInfoBox = new St.BoxLayout({
            style_class: 'vpn-info-box',
            vertical: true,
        });
        parentContainer.add_actor(this.vpnInfoBox);
        popupMenu.actor.add(parentContainer);
        this.menu.addMenuItem(popupMenu);
        // End highest level text box

        // Settings button
        let buttonBox = new St.BoxLayout();
        this._settingsIcon = new St.Icon({
            icon_name: 'emblem-system-symbolic',
            style_class: 'popup-menu-icon',
        });
        this._settingsButton = new St.Button({
            child: this._settingsIcon,
            style_class: 'button',
        });
        this._settingsButton.connect('clicked',  () => Util.spawnCommandLine('gnome-extensions prefs mullvadindicator@pobega.github.com'));
        buttonBox.add_actor(this._settingsButton);
        // End settings button

        // Refresh button
        this._refreshIcon = new St.Icon({
            icon_name: 'view-refresh-symbolic',
            style_class: 'popup-menu-icon',
        });
        this._refreshButton = new St.Button({
            child: this._refreshIcon,
            x_expand: true,
            x_align: Clutter.ActorAlign.END,
            style_class: 'button',
        });
        this._refreshButton.connect('clicked',  () => {
            this.mullvad.forceUpdate();
        });
        buttonBox.add_actor(this._refreshButton);
        // End refresh button

        popupMenu.actor.add(parentContainer);
        popupMenu.actor.add_actor(buttonBox);
        this.menu.addMenuItem(popupMenu);

        Main.panel.addToStatusArea('MullvadIndicator', this, 1);

        // Initial state
        let vpnInfoRow = new St.BoxLayout({
            x_align: Clutter.ActorAlign.START,
            x_expand: true,
        });
        this.vpnInfoBox.add_actor(vpnInfoRow);

        let label = new St.Label({
            style_class: 'vpn-info-vpn-init',
            text: 'Mullvad: ',
            x_align: Clutter.ActorAlign.CENTER,
            x_expand: true,
        });
        vpnInfoRow.add_actor(label);

        let vpnLabel = new St.Label({
            style_class: 'vpn-info-vpn-init',
            text: _('Checking...'),
        });
        vpnInfoRow.add_actor(vpnLabel);

        let vpnIcon = new St.Icon({
            icon_name: 'emblem-synchronizing-symbolic',
            style_class: 'popup-menu-icon vpn-icon-vpn-init',
        });
        vpnInfoRow.add_actor(vpnIcon);

        this.vpnInfoBox.add_actor(new PopupMenu.PopupSeparatorMenuItem());
    }

    _updateTrayIcon(relative_path) {
        this._icon.gicon = Gio.icon_new_for_string(`${Me.path}/assets/icons/${relative_path}.svg`);
    }

    update() {
        // Destroy current inner text boxes
        this.vpnInfoBox.destroy_all_children();

        let vpnInfoRow = new St.BoxLayout({
            x_align: Clutter.ActorAlign.START,
            x_expand: true,
        });
        this.vpnInfoBox.add_actor(vpnInfoRow);

        let connected = this.mullvad.connected;

        let label = new St.Label({
            style_class: connected ? 'vpn-info-vpn-on' : 'vpn-info-vpn-off',
            text: 'Mullvad: ',
            x_align: Clutter.ActorAlign.CENTER,
            x_expand: true,
        });
        vpnInfoRow.add_actor(label);

        let vpnLabel = new St.Label({
            style_class: connected ? 'vpn-info-vpn-on' : 'vpn-info-vpn-off',
            text: connected ? _('Connected') : _('Disconnected'),
        });
        vpnInfoRow.add_actor(vpnLabel);

        let vpnIcon = new St.Icon({
            icon_name: connected ? 'security-high-symbolic' : 'security-low-symbolic',
            style_class: connected ? 'popup-menu-icon vpn-icon-vpn-on' : 'popup-menu-icon vpn-icon-vpn-off',
        });
        vpnInfoRow.add_actor(vpnIcon);

        this.vpnInfoBox.add_actor(new PopupMenu.PopupSeparatorMenuItem());

        if (connected === true) {
            this._updateTrayIcon(ICON_CONNECTED);
        } else {
            this._updateTrayIcon(ICON_DISCONNECTED);
            return;
        }

        let detailed_status = this.mullvad.detailed_status;

        for (let item in detailed_status) {
            if (detailed_status[item]) {
                vpnInfoRow = new St.BoxLayout();
                this.vpnInfoBox.add_actor(vpnInfoRow);

                label = new St.Label({
                    style_class: 'vpn-info-item',
                    text: `${_(detailed_status[item].name)}: `,
                    y_align: Clutter.ActorAlign.CENTER,
                    y_expand: true,
                });
                vpnInfoRow.add_actor(label);

                let infoLabel = new St.Label({
                    style_class: 'vpn-info-value',
                    text: detailed_status[item].text || '',
                    y_align: Clutter.ActorAlign.CENTER,
                    y_expand: true,
                });
                let dataLabelBtn = new St.Button({
                    child: infoLabel,
                });
                vpnInfoRow.add_actor(dataLabelBtn);
            }
        }
    }

    main() {
        this.mullvad.pollMullvad();
        if (this._timeout) {
            Mainloop.source_remove(this._timeout);
            this._timeout = null;
        }
        const refreshTime = getSettings().get_int('refresh-time');
        this._timeout = Mainloop.timeout_add_seconds(refreshTime, function () {
            this.main();
        }.bind(this));
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

function init() {
}

let mullvadIndicator;

function enable() {
    mullvadIndicator = new MullvadIndicator();
}

function disable() {
    // Kill all queued Http requests
    httpSession.abort();

    mullvadStatusIndicator.stop();
    mullvadStatusIndicator.destroy();
    mullvadStatusIndicator = null;
}
