const {Gio, GObject, Gtk} = imports.gi;

const Me = imports.misc.extensionUtils.getCurrentExtension();

const ExtensionUtils = imports.misc.extensionUtils;


let preferences;


const MullvadIndicatorPrefsWidget = class {
    constructor() {
        this._settings = ExtensionUtils.getSettings('org.gnome.Shell.Extensions.MullvadIndicator');
    }

    buildWidget() {
        this._builder = new Gtk.Builder();
        this._builder.add_from_file(`${Me.path}/prefs.ui`);
        this._widget = this._builder.get_object('prefsWidget');

        this._connectSignals();

        return this._widget;
    }

    _connectSignals() {
        // Set some signals to toggle visibility of some preferences
        this._toggleConnectButtonKindVisibility();
        this._settings.connect(
            'changed::show-connect-button',
            _setting => {
                this._toggleConnectButtonKindVisibility();
            }
        );

        this._toggleSystemdServiceNameVisibility();
        this._settings.connect(
            'changed::connect-command-type',
            _setting => {
                this._toggleSystemdServiceNameVisibility();
            }
        );

        // Bind preferences to their Gschema settings
        let spinButton = this._builder.get_object('refreshTimeSpinButton');
        spinButton.set_range(1, 9999);
        spinButton.set_increments(10, 10);
        spinButton.set_value(this._settings.get_int('refresh-time'));
        this._settings.bind('refresh-time', spinButton, 'value', Gio.SettingsBindFlags.DEFAULT);

        this._settings.bind(
            'show-icon',
            this._builder.get_object('showIndicatorIconSwitch'),
            'active',
            Gio.SettingsBindFlags.DEFAULT);

        this._settings.bind(
            'show-menu',
            this._builder.get_object('showSystemMenuSwitch'),
            'active',
            Gio.SettingsBindFlags.DEFAULT);

        this._settings.bind(
            'show-connect-button',
            this._builder.get_object('showConnectButtonSwitch'),
            'active',
            Gio.SettingsBindFlags.DEFAULT);

        this._settings.bind(
            'connect-command-type',
            this._builder.get_object('connectButtonKindComboBoxText'),
            'active-id',
            Gio.SettingsBindFlags.DEFAULT);

        this._settings.bind(
            'service-name',
            this._builder.get_object('mullvadSystemdServiceNameTextbox'),
            'text',
            Gio.SettingsBindFlags.DEFAULT);

        this._settings.bind(
            'show-server',
            this._builder.get_object('showServerSwitch'),
            'active',
            Gio.SettingsBindFlags.DEFAULT);

        this._settings.bind(
            'show-country',
            this._builder.get_object('showCountrySwitch'),
            'active',
            Gio.SettingsBindFlags.DEFAULT);

        this._settings.bind(
            'show-city',
            this._builder.get_object('showCitySwitch'),
            'active',
            Gio.SettingsBindFlags.DEFAULT);

        this._settings.bind(
            'show-ip',
            this._builder.get_object('showIPSwitch'),
            'active',
            Gio.SettingsBindFlags.DEFAULT);

        this._settings.bind(
            'show-type',
            this._builder.get_object('showVpnTypeSwitch'),
            'active',
            Gio.SettingsBindFlags.DEFAULT);
    }

    // Functions to toggle the visibility of some preferences based on
    // whether the functionality is enabled/disabled

    // Toggle connection type dropdown (Mullvad app/Systemd) if functionality is disabled
    _toggleConnectButtonKindVisibility() {
        const connectButtonKindBox = this._builder.get_object('connectButtonKindBox');
        const systemdServiceNameBox = this._builder.get_object('mullvadSystemdServiceName');
        if (this._settings.get_boolean('show-connect-button')) {
            connectButtonKindBox.show();
            this._toggleSystemdServiceNameVisibility();
        } else {
            connectButtonKindBox.hide();
            systemdServiceNameBox.hide();
        }
    }

    // Toggles Systemd service name entry field if Systemd is not the currently selected type
    _toggleSystemdServiceNameVisibility() {
        const systemdServiceNameBox = this._builder.get_object('mullvadSystemdServiceName');
        const connectCommandType = this._settings.get_string('connect-command-type');
        if (connectCommandType == 'systemd') {
            systemdServiceNameBox.show();
        } else {
            systemdServiceNameBox.hide();
        }
    }

};

function init() {
    preferences = new MullvadIndicatorPrefsWidget();
}

function buildPrefsWidget() {
    return preferences.buildWidget();
}
