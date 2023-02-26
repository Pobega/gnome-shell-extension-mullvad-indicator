const {GLib, GObject, Gio} = imports.gi;
const Gettext = imports.gettext.domain('mullvadindicator');
const _ = Gettext.gettext;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const Mullvad = Me.imports.mullvad;

const Main = imports.ui.main;
const ExtensionUtils = imports.misc.extensionUtils;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const QuickSettings = imports.ui.quickSettings;
const QuickSettingsMenu = imports.ui.main.panel.statusArea.quickSettings;

const ICON_CONNECTED = 'mullvad-connected-symbolic';
const ICON_DISCONNECTED = 'mullvad-disconnected-symbolic';

const STATUS_STARTING = _('Initializing');
const STATUS_CONNECTED = _('Connected');
const STATUS_DISCONNECTED = _('Disconnected');

const MullvadToggle = GObject.registerClass({
    GTypeName: 'MullvadToggle',
}, class MullvadToggle extends QuickSettings.QuickMenuToggle {
    _init(mullvad) {
        super._init({
            label: STATUS_STARTING,
            gicon: Gio.icon_new_for_string(`${Me.path}/icons/${STATUS_DISCONNECTED}.svg`),
        });

        // Menu section with configurable connection status information
        this._detailedStatusSection = new PopupMenu.PopupMenuSection();
        this.menu.addMenuItem(this._detailedStatusSection);

        // Separator line
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        // Menu section with refresh and settings buttons
        this._bottomSection = new PopupMenu.PopupMenuSection();
        this._buildBottomSection(mullvad);
        this.menu.addMenuItem(this._bottomSection);

        this._sync(mullvad);
    }

    _buildBottomSection(mullvad) {
        // Item for manually checking connection to Mullvad
        let refreshItem = new PopupMenu.PopupMenuItem(_('Refresh'));
        refreshItem.actor.connect('button-press-event', () => {
            mullvad._pollMullvad();
        });
        this._bottomSection.addMenuItem(refreshItem);

        // Item for opening extension settings
        let settingsItem = new PopupMenu.PopupMenuItem(_('Settings'));
        settingsItem.actor.connect('button-press-event', () => {
		ExtensionUtils.openPrefs();
        });
        this._bottomSection.addMenuItem(settingsItem);
    }

    _sync(mullvad) {
        if (mullvad.connected) {
            this.gicon = Gio.icon_new_for_string(`${Me.path}/icons/${ICON_CONNECTED}.svg`);
            this.label = STATUS_CONNECTED;
            this.checked = true;
        } else {
            this.gicon = Gio.icon_new_for_string(`${Me.path}/icons/${ICON_DISCONNECTED}.svg`);
            this.label = STATUS_DISCONNECTED;
            this.checked = false;
        }

        this.menu.setHeader(this.gicon, this.label);
        this._syncDetailedStatus(mullvad.connected, mullvad.detailed_status);
    }

    _syncDetailedStatus(connected, detailedStatus) {
        // Remove all items from the detailed status section and readd all desired ones
        this._detailedStatusSection.removeAll();

        // If we aren't connected to Mullvad, leave the detailed status section empty
        if (!connected)
            return;

        for (let item in detailedStatus) {
            let title = detailedStatus[item].name;
            let body = detailedStatus[item].text;
            // Don't add menu items for undefined or empty values
            if (body) {
                let statusText = `${title}: ${body}`;
                let menuItem = new PopupMenu.PopupMenuItem(statusText);
                this._detailedStatusSection.addMenuItem(menuItem);
            }
        }
    }
});

const MullvadIndicator = GObject.registerClass({
    GTypeName: 'MullvadIndicator',
}, class MullvadIndicator extends QuickSettings.SystemIndicator {
    _init() {
        super._init();

        // Get our settings
        this._settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.MullvadIndicator');

	// Get translations
	ExtensionUtils.initTranslations('mullvadindicator');

        // Instantiate our Mullvad object
        this._mullvad = new Mullvad.MullvadVPN();

        // Connect all signals
        this._connectSignals();

        // Create and add icon to the panel at position 0
        this._indicator = this._addIndicator();
        this._indicator.visible = false;
        QuickSettingsMenu._indicators.insert_child_at_index(this, 0);

        // Create and add toggle to the menu below the network toggle
        this._toggle = new MullvadToggle(this._mullvad);
        this.quickSettingsItems.push(this._toggle);
        QuickSettingsMenu._addItems(this.quickSettingsItems);

        // Bind visibility settings
        this._settings.bind('show-icon', this._indicator, 'visible', Gio.SettingsBindFlags.DEFAULT);
        this._settings.bind('show-menu', this._toggle, 'visible', Gio.SettingsBindFlags.DEFAULT);

        // Start our GUI and enter our main loop
        this._sync();
        this._main();
    }

    _connectSignals() {
        this._signals = [];

        // A list of prefs we want to immediately update the GUI for when changed
        let prefs = ['show-icon', 'show-menu', 'show-server', 'show-country', 'show-city', 'show-type', 'show-ip'];

        for (let pref of prefs) {
            this._signals.push(this._settings.connect(
                `changed::${pref}`, () => {
                    this._sync();
                }
            ));
        }

        this._signals.push(this._mullvad.connect(
            'status-changed', () => {
                this._sync();
            }
        ));

        this._signals.push(this.connect(
            'destroy', () => {
                this._stop();
            }
        ));
    }

    _disconnectSignals() {
        for (let signal of this._signals)
            this._settings.disconnect(signal);
    }

    _sync() {
        let icon = this._mullvad.connected ? ICON_CONNECTED : ICON_DISCONNECTED;
        this._indicator.gicon = Gio.icon_new_for_string(`${Me.path}/icons/${icon}.svg`);

        this._toggle._sync(this._mullvad);
    }

    _main() {
        // Poll Mullvad automatically on a set timeout
        this._mullvad._pollMullvad();
        if (this._timeout) {
            GLib.Source.remove(this._timeout);
            this._timeout = null;
        }

        let refreshTime = this._settings.get_int('refresh-time');
        this._timeout = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT,
            refreshTime,
            function () {
                this._main();
            }.bind(this)
        );
    }

    _stop() {
        this._toggle.destroy();
        this._disconnectSignals();

        // Kill our mainloop when we shut down
        if (this._timeout)
            GLib.Source.remove(this._timeout);
	this._timeout = null;
    }
});

function init() {
}

let _mullvadIndicator;

function enable() {
    _mullvadIndicator = new MullvadIndicator();
}

function disable() {
    _mullvadIndicator.destroy();
    _mullvadIndicator = null;
}
