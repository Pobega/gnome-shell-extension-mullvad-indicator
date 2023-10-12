import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Gio from 'gi://Gio';

import * as Mullvad from './mullvad.js';

import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as QuickSettings from 'resource:///org/gnome/shell/ui/quickSettings.js';
const QuickSettingsMenu = Main.panel.statusArea.quickSettings;

const ICON_CONNECTED = 'mullvad-connected-symbolic';
const ICON_DISCONNECTED = 'mullvad-disconnected-symbolic';

const MullvadToggle = GObject.registerClass({
    GTypeName: 'MullvadToggle',
}, class MullvadToggle extends QuickSettings.QuickMenuToggle {
    _init(settings, path, mullvad) {
        super._init({
            title: _('Initializing'),
            gicon: Gio.icon_new_for_string(`${path}/icons/${ICON_DISCONNECTED}.svg`),
        });

        this._settings = settings;
        this._path = path;

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
            this.gicon = Gio.icon_new_for_string(`${this._path}/icons/${ICON_CONNECTED}.svg`);

            this.title = mullvad.statusItem(this._settings.get_uint('title-text')) ?? _('Connected');
            this.subtitle = mullvad.statusItem(this._settings.get_uint('subtitle-text'));

            this.checked = true;
        } else {
            this.gicon = Gio.icon_new_for_string(`${this._path}/icons/${ICON_DISCONNECTED}.svg`);
            this.title = _('Disconnected');
            this.subtitle = null;
            this.checked = false;
        }

        this.menu.setHeader(this.gicon, this.title);
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
    _init(settings, path) {
        super._init();

        this._settings = settings;
        this._path = path;

        // Instantiate our Mullvad object
        this._mullvad = new Mullvad.MullvadVPN(this._settings);

        // Connect all signals
        this._connectSignals();

        // Create an icon for the panel
        this._indicator = this._addIndicator();
        this._indicator.visible = false;

        // Create a toggle for quick settings
        this._toggle = new MullvadToggle(this._settings, this._path, this._mullvad);
        this.quickSettingsItems.push(this._toggle);

        QuickSettingsMenu.addExternalIndicator(this);

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
        let prefs = [
            'show-icon', 'show-menu', 'show-server', 'show-country', 'show-city',
            'show-type', 'show-ip', 'title-text', 'subtitle-text'
        ];

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
    }

    _disconnectSignals() {
        for (let signal of this._signals)
            this._settings.disconnect(signal);
    }

    _sync() {
        let icon = this._mullvad.connected ? ICON_CONNECTED : ICON_DISCONNECTED;
        this._indicator.gicon = Gio.icon_new_for_string(`${this._path}/icons/${icon}.svg`);

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

    destroy() {
        this._stop();
        super.destroy();
    }
});

export default class MullvadIndicatorExtension extends Extension {
    enable() {
        this._mullvadIndicator = new MullvadIndicator(this.getSettings(), this.path);
    }

    disable() {
        this._mullvadIndicator.destroy();
        this._mullvadIndicator = null;
    }
}
