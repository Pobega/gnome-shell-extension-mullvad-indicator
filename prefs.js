const {Gio, GObject, Gtk} = imports.gi;

const Me = imports.misc.extensionUtils.getCurrentExtension();

const ExtensionUtils = imports.misc.extensionUtils;


let preferences;

const Settings = [
    {key: 'show-icon',
        object: 'showIndicatorIconSwitch',
        property: 'active'},
    {key: 'show-menu',
        object: 'showSystemMenuSwitch',
        property: 'active'},
    {key: 'refresh-time',
        object: 'refreshTimeSpinButton',
        property: 'value'},
    {key: 'show-connect-button',
        object: 'showConnectButtonSwitch',
        property: 'active'},
    {key: 'connect-command-type',
        object: 'connectButtonKindComboBoxText',
        property: 'active-id'},
    {key: 'service-name',
        object: 'mullvadSystemdServiceNameTextbox',
        property: 'text'},
    {key: 'show-server',
        object: 'showServerSwitch',
        property: 'active'},
    {key: 'show-country',
        object: 'showCountrySwitch',
        property: 'active'},
    {key: 'show-city',
        object: 'showCitySwitch',
        property: 'active'},
    {key: 'show-ip',
        object: 'showIPSwitch',
        property: 'active'},
    {key: 'show-type',
        object: 'showVpnTypeSwitch',
        property: 'active'},
];

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

        // Bind all settings from our settings const
        for (const setting of Settings) {
            this._settings.bind(
                setting.key,
                this._builder.get_object(setting.object),
                setting.property,
                Gio.SettingsBindFlags.DEFAULT);
        }
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
        const showConnectButton = this._settings.get_boolean('show-connect-button');
        const connectCommandType = this._settings.get_string('connect-command-type');
        const systemdServiceNameBox = this._builder.get_object('mullvadSystemdServiceName');
        if (showConnectButton && connectCommandType == 'systemd')
            systemdServiceNameBox.show();
        else
            systemdServiceNameBox.hide();
    }

};

function init() {
    preferences = new MullvadIndicatorPrefsWidget();
}

function buildPrefsWidget() {
    return preferences.buildWidget();
}
