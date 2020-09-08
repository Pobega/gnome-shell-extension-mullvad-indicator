const {Gio, GObject, Gtk} = imports.gi;
const Gettext = imports.gettext;

const Me = imports.misc.extensionUtils.getCurrentExtension();

const ExtensionUtils = imports.misc.extensionUtils;

Gettext.bindtextdomain('mullvadindicator', Me.dir.get_child('locale').get_path());
Gettext.textdomain('mullvadindicator');
const _ = Gettext.gettext;

function init() {
}

const MullvadIndicatorPrefsWidget = GObject.registerClass(
class MullvadIndicatorPrefsWidget extends Gtk.Box {
    _init() {
        super._init({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 12,
            margin_top: 36,
            margin_bottom: 36,
            margin_start: 36,
            margin_end: 36,
        });

        this._settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.mullvadindicator');

        this._addSpinButton(
            _('Automatic refresh time (in seconds)'),
            'refresh-time',
        );

        this._addSwitch(
            _('Show currently connected server'),
            'show-server'
        );
        this._addSwitch(
            _('Show currently connected servers country'),
            'show-country'
        );
        this._addSwitch(
            _('Show currently connected servers city'),
            'show-city'
        );
        this._addSwitch(
            _('Show your current IP address'),
            'show-ip'
        );
        this._addSwitch(
            _('Show your VPN type (WireGuard/OpenVPN)'),
            'show-type'
        );

        this.show_all();
    }

    _addSpinButton(labelText, settingName) {
        // Bounding box
        let box = new Gtk.Box();
        box.set_orientation(Gtk.Orientation.HORIZONTAL);

        // Build label
        let label = new Gtk.Label({
            label: labelText,
        });

        // Build spinButton
        let spinButton = new Gtk.SpinButton();
        spinButton.set_sensitive(true);
        spinButton.set_range(1, 9999);
        spinButton.set_value(this._settings.get_int(settingName));
        spinButton.set_increments(10, 10);

        // Bind spinButton to settingName
        this._settings.bind(settingName, spinButton, 'value', Gio.SettingsBindFlags.DEFAULT);

        // Pack it into the box
        box.pack_start(label, false, false, 0);
        box.pack_end(spinButton, false, false, 0);

        this.add(box);
    }

    _addSwitch(labelText, settingName) {
        // Bounding box
        let box = new Gtk.Box();
        box.set_orientation(Gtk.Orientation.HORIZONTAL);

        // Build spinButton
        let label = new Gtk.Label({
            label: labelText,
        });

        // Build switch
        let toggle = new Gtk.Switch();

        // Bind spinButton to settingName
        this._settings.bind(settingName, toggle, 'active', Gio.SettingsBindFlags.DEFAULT);

        // Pack it into the box
        box.pack_start(label, false, true, 0);
        box.pack_end(toggle, false, true, 0);

        this.add(box)
    }
});

function buildPrefsWidget() {
    return new MullvadIndicatorPrefsWidget();
}
