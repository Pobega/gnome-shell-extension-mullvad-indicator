const {GObject, Gio} = imports.gi;
const Gettext = imports.gettext;
const Mainloop = imports.mainloop;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const Mullvad = Me.imports.mullvad;
const Prefs = Me.imports.prefs;

const Main = imports.ui.main;
const AggregateMenu = Main.panel.statusArea.aggregateMenu;
const ExtensionUtils = imports.misc.extensionUtils;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Util = imports.misc.util;


Gettext.bindtextdomain('mullvadindicator', Me.dir.get_child('locale').get_path());
Gettext.textdomain('mullvadindicator');
const _ = Gettext.gettext;

const ICON_CONNECTED = 'mullvad-connected-symbolic';
const ICON_DISCONNECTED = 'mullvad-disconnected-symbolic';

const STATUS_STARTING = _('Initializing');
const STATUS_CONNECTED = _('Connected');
const STATUS_DISCONNECTED = _('Disconnected');


const MullvadIndicator = GObject.registerClass({
    GTypeName: 'MullvadIndicator',
}, class MullvadIndicator extends PanelMenu.SystemIndicator {

    _init() {
        super._init(0);

        // Get our settings
        this._settings = ExtensionUtils.getSettings('org.gnome.Shell.Extensions.MullvadIndicator');

        // Instantiate our Mullvad object
        this._mullvad = new Mullvad.MullvadVPN();

        // Connect our signals
        this._connectPrefSignals();
        this._watch = this._mullvad.connect('status-changed', _mullvad => {
            this._updateGui();
        });

        // Start our GUI and enter our main loop
        this._initGui();
        this._main();
    }

    // Connect signals for preference changes
    _connectPrefSignals() {
        this._prefSignals = [];

        // Refresh our menu whenever a setting is modified
        for (const pref of Prefs.Settings) {
            this._prefSignals.push(this._settings.connect(
                `changed::${pref.key}`,
                _setting => {
                    this._updateGui();
                }
            ));
        }

    }

    _disconnectPrefSignals() {
        for (const signal of this._prefSignals)
            this._settings.disconnect(signal);
    }

    _initGui() {
        // Add the indicator to the indicator bar
        this._indicator = this._addIndicator();
        this._indicator.visible = false;

        // Build a menu

        // Main item with the header section
        this._item = new PopupMenu.PopupSubMenuMenuItem(STATUS_STARTING, true);
        this._item.icon.gicon = Gio.icon_new_for_string(`${Me.path}/icons/mullvad-disconnected-symbolic.svg`);
        this._item.label.clutter_text.x_expand = true;
        this.menu.addMenuItem(this._item);

        // Content Inside the box
        this._item.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        // Add icon to system tray at position 0
        AggregateMenu._indicators.insert_child_at_index(this, 0);

        // Add dropdown menu below the network index.
        AggregateMenu.menu.addMenuItem(this.menu, this._getNetworkMenuIndex() + 1);

        this._buildBottomMenu();

        this._updateGui();
    }

    _updateGui() {
        // Destroy and recreate our inner menu
        this._item.destroy();

        // Hide or unhide our menu
        /* eslint no-unused-expressions: ["error", { "allowTernary": true }]*/
        this._settings.get_boolean('show-menu') ? this.menu.actor.show() : this.menu.actor.hide();

        // Update systray icon first
        const icon = this._mullvad.connected ? ICON_CONNECTED : ICON_DISCONNECTED;
        this._indicator.gicon = Gio.icon_new_for_string(`${Me.path}/icons/${icon}.svg`);
        // Hide or unhide our systray icon
        if (this._settings.get_boolean('show-icon'))
            this._indicator.visible = true;
        else
            this._indicator.visible = false;

        // Main item with the header section
        this._item = new PopupMenu.PopupSubMenuMenuItem(STATUS_STARTING, true);
        this._item.icon.gicon = Gio.icon_new_for_string(`${Me.path}/icons/${icon}.svg`);
        this._item.label.clutter_text.x_expand = true;
        this.menu.addMenuItem(this._item);

        this._item.label.text = this._mullvad.connected ? STATUS_CONNECTED : STATUS_DISCONNECTED;

        // Content Inside the box
        this._item.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        const detailedStatus = this._mullvad.detailed_status;
        for (const item in detailedStatus) {
            const title = detailedStatus[item].name;
            const body = detailedStatus[item].text;
            // Don't add menu items for undefined or empty values
            if (body) {
                const statusText = `${title}: ${body}`;
                const menuItem = new PopupMenu.PopupMenuItem(statusText);
                this._item.menu.addMenuItem(menuItem);
            }
        }

        this._buildBottomMenu();
    }

    _buildBottomMenu() {
        // Separator line
        this._item.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        // Connect/Disconnect menu item
        const showConnectButton = this._settings.get_boolean('show-connect-button');
        if (showConnectButton) {
            const connectItem = this._makeConnectButton();
            this._item.menu.addMenuItem(connectItem);
        }

        // Manual refresh menu item
        const refreshItem = new PopupMenu.PopupMenuItem(_('Refresh'));
        refreshItem.actor.connect('button-press-event', () => {
            this._mullvad._pollMullvad();
        });
        this._item.menu.addMenuItem(refreshItem);

        // Settings menu item
        const settingsItem = new PopupMenu.PopupMenuItem(_('Settings'));
        settingsItem.actor.connect('button-press-event', () => {
            Util.spawnCommandLine('gnome-extensions prefs mullvadindicator@pobega.github.com');
        });
        this._item.menu.addMenuItem(settingsItem);
    }

    _makeConnectButton() {
        const connectLabel = this._mullvad.connected
            ? _('Disconnect')
            : _('Connect');

        const connectCommandType = this._settings.get_string('connect-command-type');
        const systemdService = this._settings.get_string('service-name');
        let connectCommand;
        if (connectCommandType === 'mullvad') {
            connectCommand = this._mullvad.connected
                ? 'mullvad disconnect'
                : 'mullvad connect';
        } else {
            connectCommand = this._mullvad.connected
                ? `systemctl stop ${systemdService}`
                : `systemctl start ${systemdService}`;
        }

        const connectItem = new PopupMenu.PopupMenuItem(connectLabel);
        connectItem.actor.connect('button-press-event', () => {
            Util.spawnCommandLine(connectCommand);
            this._mullvad._pollMullvad();
        });
        return connectItem;
    }

    _getNetworkMenuIndex() {
        // This is a pretty hacky solution, thanks to @andyholmes on
        // #extensions:gnome.org for helping me with this.
        //
        // Return the current index of the networking menu in Gnome's
        // AggregateMenu. Normally defaults to '3' but other installed
        // extensions may adjust this index.
        const menuItems = AggregateMenu.menu._getMenuItems();
        const networkMenuIndex = menuItems.indexOf(AggregateMenu._network.menu) || 3;
        return networkMenuIndex;
    }

    _main() {
        // Poll Mullvad automatically on a set timeout
        this._mullvad._pollMullvad();
        if (this._timeout) {
            Mainloop.source_remove(this._timeout);
            this._timeout = null;
        }
        // We protect this from being set below 60 using a GtkAdjustment, but
        // just in case the value somehow still goes below that we should
        // default to 60 here (values less than 1 would cause huge CPU spikes
        // and make this extension unusable)
        const refreshTime = Math.max(this._settings.get_int('refresh-time'), 60);
        this._timeout = Mainloop.timeout_add_seconds(refreshTime, function () {
            this._main();
        }.bind(this));
    }

    _stop() {
        // Disconnect signals
        this._mullvad.disconnect(this._watch);
        this._disconnectPrefSignals();

        // Kill our mainloop when we shut down
        if (this._timeout)
            Mainloop.source_remove(this._timeout);
        this._timeout = undefined;
    }
});

function init() {
}

let _mullvadIndicator;

function enable() {
    _mullvadIndicator = new MullvadIndicator();
}

function disable() {
    _mullvadIndicator._stop();
    _mullvadIndicator._item.destroy();
    _mullvadIndicator.destroy();
    _mullvadIndicator = null;
}
