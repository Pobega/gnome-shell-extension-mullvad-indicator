const {Gio, GObject, Gtk} = imports.gi;
const Gettext = imports.gettext;

const ExtensionUtils = imports.misc.extensionUtils;
/*
const Me = imports.misc.extensionUtils.getCurrentExtension();


Gettext.bindtextdomain('mullvadindicator', Me.dir.get_child('locale').get_path());
Gettext.textdomain('mullvadindicator');
const _ = Gettext.gettext;
*/

let preferences;

const MullvadIndicatorPrefsWidget = class {
    constructor() {
        this._settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.mullvadindicator');
    }

    buildWidget() {
        this._builder = new Gtk.Builder();
        this._builder.add_from_file('prefs.ui');
        this._widget = this._builder.get_object('prefsWidget');

        this._connectSignals();

        return this._widget;
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
