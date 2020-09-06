const {Gio, GObject, Gtk} = imports.gi;
const Gettext = imports.gettext;

const Me = imports.misc.extensionUtils.getCurrentExtension();

const ExtensionUtils = imports.misc.extensionUtils;

Gettext.bindtextdomain('mullvadindicator', Me.dir.get_child('locale').get_path());
Gettext.textdomain('mullvadindicator');
const _ = Gettext.gettext;

function init() {
}

const AmIMullvadPrefsWidget = GObject.registerClass(
class AmIMullvadPrefsWidget extends Gtk.Box {
    _init() {
        super._init({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 12,
            margin_top: 36,
            margin_bottom: 36,
            margin_start: 36,
            margin_end: 36,
        });

        this._settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.amimullvad');

        let refreshTimeLabel = new Gtk.Label({
            label: _('Automatic refresh time (in seconds)'),
        });

        let spinButton = new Gtk.SpinButton();
        spinButton.set_sensitive(true);
        spinButton.set_range(1, 9999);
        spinButton.set_value(this._settings.get_int('refresh-time'));
        spinButton.set_increments(10, 10);

        this._settings.bind('refresh-time', spinButton, 'value', Gio.SettingsBindFlags.DEFAULT);

        let hBox = new Gtk.Box();
        hBox.set_orientation(Gtk.Orientation.HORIZONTAL);

        hBox.pack_start(refreshTimeLabel, false, false, 0);
        hBox.pack_end(spinButton, false, false, 0);

        this.add(hBox);

        let check = new Gtk.CheckButton({
            label: _('Show currently connected server'),
        });
        this._settings.bind('show-server', check, 'active', Gio.SettingsBindFlags.DEFAULT);
        this.add(check);

        check = new Gtk.CheckButton({
            label: _('Show currently connected servers country'),
        });
        this._settings.bind('show-country', check, 'active', Gio.SettingsBindFlags.DEFAULT);
        this.add(check);

        check = new Gtk.CheckButton({
            label: _('Show currently connected servers city'),
        });
        this._settings.bind('show-city', check, 'active', Gio.SettingsBindFlags.DEFAULT);
        this.add(check);

        check = new Gtk.CheckButton({
            label: _('Show your current IP address'),
        });
        this._settings.bind('show-ip', check, 'active', Gio.SettingsBindFlags.DEFAULT);
        this.add(check);

        check = new Gtk.CheckButton({
            label: _('Show your VPN type (WireGuard/OpenVPN)'),
        });
        this._settings.bind('show-type', check, 'active', Gio.SettingsBindFlags.DEFAULT);
        this.add(check);

        this.show_all();
    }
});

function buildPrefsWidget() {
    return new AmIMullvadPrefsWidget();
}
