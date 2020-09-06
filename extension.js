const {Clutter, GObject, Gio, St} = imports.gi;
const Gettext = imports.gettext;
const Mainloop = imports.mainloop;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const Mullvad = Me.imports.mullvad;

const Main = imports.ui.main;
const AggregateMenu = Main.panel.statusArea.aggregateMenu;
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
}, class MullvadIndicator extends PanelMenu.SystemIndicator {

    _init() {
        super._init(0);

        this.mullvad = new Mullvad.MullvadVPN();

        this._initGui();

        this.watch = this.mullvad.connect('status-changed', mullvad => {
            this.update();
        });

        this.main();
    }

    _initGui() {
        // Add the indicator to the indicator bar
        this._indicator = this._addIndicator();
        this._indicator.icon_name = 'network-vpn-symbolic';
        this._indicator.visible = true;

        // Build a menu

        // Main item with the header section
        this._item = new PopupMenu.PopupSubMenuMenuItem('Initializing', true);
        this._item.icon.icon_name = 'network-vpn-symbolic';
        this._item.label.clutter_text.x_expand = true;
        this.menu.addMenuItem(this._item);

        // Content Inside the box
        this._item.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        // Add elements to the UI
        AggregateMenu._indicators.insert_child_at_index(this.indicators, 0);
        AggregateMenu.menu.addMenuItem(this.menu, 4);

        this._buildBottomMenu();

        this.update()
    }

    _updateTrayIcon(relative_path) {
        //TODO: implement
        this._icon.gicon = Gio.icon_new_for_string(`${Me.path}/assets/icons/${relative_path}.svg`);
        this._indicator.icon_name = 'network-vpn-symbolic';
        this._item.icon.icon_name = 'network-vpn-symbolic';
    }

    update() {
        // Destroy and recreate our inner menu
        this._item.destroy();

        // Main item with the header section
        this._item = new PopupMenu.PopupSubMenuMenuItem('Initializing', true);
        this._item.icon.icon_name = 'network-vpn-symbolic';
        this._item.label.clutter_text.x_expand = true;
        this.menu.addMenuItem(this._item);

        this._item.label.text = this.mullvad.connected ? "Connected" : "Disconnected";

        // Content Inside the box
        this._item.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        // Add elements to the UI
        AggregateMenu.menu.addMenuItem(this.menu, 4);

        let detailedStatus = this.mullvad.detailed_status;
        for (let item in detailedStatus) {
            let title = detailedStatus[item].name;
            let body = detailedStatus[item].text;
            let statusText = `${title}: ${body}`;
            let menuItem = new PopupMenu.PopupMenuItem(statusText);
            this._disconnectAction = this._item.menu.addMenuItem(menuItem);
        }
        
        this._buildBottomMenu();

    }

    _buildBottomMenu() {
        let refreshItem = new PopupMenu.PopupMenuItem('Refresh');
        refreshItem.actor.connect('button-press-event', () => {
            //TODO: implement a forced update
            return
        });
        this._item.menu.addMenuItem(refreshItem);
        let settingsItem = new PopupMenu.PopupMenuItem('Settings');
        settingsItem.actor.connect('button-press-event', () => {
            Util.spawnCommandLine('gnome-extensions prefs mullvadindicator@pobega.github.com');
        });
        this._item.menu.addMenuItem(settingsItem);
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
