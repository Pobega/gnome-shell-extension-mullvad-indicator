const {Gio, GObject, Gtk} = imports.gi;
const Gettext = imports.gettext;

const Me = imports.misc.extensionUtils.getCurrentExtension();

const ExtensionUtils = imports.misc.extensionUtils;

const Config = imports.misc.config;
const shellVersion = parseFloat(Config.PACKAGE_VERSION);

Gettext.bindtextdomain('mullvadindicator', Me.dir.get_child('locale').get_path());
Gettext.textdomain('mullvadindicator');
const _ = Gettext.gettext;

let preferences;


const MullvadIndicatorPrefsWidget = class {
    constructor() {
        this._settings = ExtensionUtils.getSettings('org.gnome.Shell.Extensions.MullvadIndicator');
    }

    buildWidget() {
        if (shellVersion >= 40) {
            this._widget = new Gtk.Box({
                spacing: 12,
                margin_start: 24,
                margin_end: 24,
                margin_top: 24,
                margin_bottom: 24,
                orientation: Gtk.Orientation.VERTICAL,
            });
            
            this._widget.append(this.settingBox(_("Display indicator icon"), 'show-icon', new Gtk.Switch, 'active'));
            this._widget.append(this.settingBox(_("Show in system menu"), 'show-menu', new Gtk.Switch, 'active'));
            
            let spinButton = new Gtk.SpinButton;
            spinButton.set_range(1, 9999);
            spinButton.set_increments(10,10);
            spinButton.set_value(this._settings.get_int('refresh-time'));
            this._widget.append(this.settingBox(_("Automatic refresh time (in seconds)"), 'refresh-time', spinButton, 'value'));
            
            this._widget.append(this.settingBox(_("Show currently connected server"), 'show-server', new Gtk.Switch, 'active'));
            this._widget.append(this.settingBox(_("Show currently connected server's country"), 'show-country', new Gtk.Switch, 'active'));
            this._widget.append(this.settingBox(_("Show currently connected server's city"), 'show-city', new Gtk.Switch, 'active'));
            this._widget.append(this.settingBox(_("Show your current IP address"), 'show-ip', new Gtk.Switch, 'active'));
            this._widget.append(this.settingBox(_("Show your VPN type (WireGuard/OpenVPN)"), 'show-type', new Gtk.Switch, 'active'));

            return this._widget;
        } else {
            this._builder = new Gtk.Builder();
            this._builder.add_from_file(`${Me.path}/prefs.ui`);
            this._widget = this._builder.get_object('prefsWidget');
            
            this._connectSignals();
            
            return this._widget;
        }
    }

    settingBox(labelText, key, object, property) {
        const box = new Gtk.Box;
        box.append(new Gtk.Label({
            label: labelText,
            halign: Gtk.Align.START,
            hexpand: true,
        }));
        this._settings.bind(key, object, property, Gio.SettingsBindFlags.DEFAULT);
        box.append(object);
        return box;
    }

    _connectSignals() {
        let spinButton = this._builder.get_object('refreshTimeSpinButton');
        spinButton.set_range(1, 9999);
        spinButton.set_increments(10, 10);
        spinButton.set_value(this._settings.get_int('refresh-time'));
        this._settings.bind('refresh-time', spinButton, 'value', Gio.SettingsBindFlags.DEFAULT);

        let gtkSwitch = this._builder.get_object('showIndicatorIconSwitch');
        this._settings.bind('show-icon', gtkSwitch, 'active', Gio.SettingsBindFlags.DEFAULT);
        gtkSwitch = this._builder.get_object('showSystemMenuSwitch');
        this._settings.bind('show-menu', gtkSwitch, 'active', Gio.SettingsBindFlags.DEFAULT);
        gtkSwitch = this._builder.get_object('showServerSwitch');
        this._settings.bind('show-server', gtkSwitch, 'active', Gio.SettingsBindFlags.DEFAULT);
        gtkSwitch = this._builder.get_object('showCountrySwitch');
        this._settings.bind('show-country', gtkSwitch, 'active', Gio.SettingsBindFlags.DEFAULT);
        gtkSwitch = this._builder.get_object('showCitySwitch');
        this._settings.bind('show-city', gtkSwitch, 'active', Gio.SettingsBindFlags.DEFAULT);
        gtkSwitch = this._builder.get_object('showIPSwitch');
        this._settings.bind('show-ip', gtkSwitch, 'active', Gio.SettingsBindFlags.DEFAULT);
        gtkSwitch = this._builder.get_object('showVpnTypeSwitch');
        this._settings.bind('show-type', gtkSwitch, 'active', Gio.SettingsBindFlags.DEFAULT);
    }

};

function init() {
    preferences = new MullvadIndicatorPrefsWidget();
}

function buildPrefsWidget() {
    return preferences.buildWidget();
}
