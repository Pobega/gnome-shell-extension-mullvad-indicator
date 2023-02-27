const {Adw, Gio, GObject, Gtk} = imports.gi;
const Gettext = imports.gettext.domain('mullvadindicator');
const _ = Gettext.gettext;

const Me = imports.misc.extensionUtils.getCurrentExtension();

const ExtensionUtils = imports.misc.extensionUtils;

const Config = imports.misc.config;
const shellVersion = parseFloat(Config.PACKAGE_VERSION);

let preferences;

class MullvadIndicatorPrefsWidget extends Adw.PreferencesPage {
    static {
        GObject.registerClass(this);
    }

    constructor() {
        super();

        this._settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.MullvadIndicator');

        let group = new Adw.PreferencesGroup({
            title: _('Visibility'),
        });
        this.add(group);

        group.add(this._prefRow(_('Display indicator icon'), 'show-icon', new Gtk.Switch(), 'active'));
        group.add(this._prefRow(_('Show in system menu'), 'show-menu', new Gtk.Switch(), 'active'));
        group.add(this._prefRow(_('Use server location as system menu text'), 'show-server-text', new Gtk.Switch(), 'active'));

        group = new Adw.PreferencesGroup({
            title: _('Refresh'),
        });
        this.add(group);

        let spinButton = new Gtk.SpinButton();
        spinButton.set_range(1, 9999);
        spinButton.set_increments(10, 10);
        spinButton.set_value(this._settings.get_int('refresh-time'));
        group.add(this._prefRow(_('Automatic refresh time (in seconds)'), 'refresh-time', spinButton, 'value'));

        group = new Adw.PreferencesGroup({
            title: _('Status'),
        });
        this.add(group);

        group.add(this._prefRow(_('Show currently connected server'), 'show-server', new Gtk.Switch(), 'active'));
        group.add(this._prefRow(_("Show currently connected server's country"), 'show-country', new Gtk.Switch(), 'active'));
        group.add(this._prefRow(_("Show currently connected server's city"), 'show-city', new Gtk.Switch(), 'active'));
        group.add(this._prefRow(_('Show your current IP address'), 'show-ip', new Gtk.Switch(), 'active'));
        group.add(this._prefRow(_('Show your VPN type (WireGuard/OpenVPN)'), 'show-type', new Gtk.Switch(), 'active'));
    }

    _prefRow(title, key, object, property) {
        const row = new Adw.ActionRow({title: title});

        object.valign = Gtk.Align.CENTER;
        row.add_suffix(object);
        row.activatable_widget = object;

        this._settings.bind(key, object, property, Gio.SettingsBindFlags.DEFAULT);

        return row;
    }
};

function init() {
}

function buildPrefsWidget() {
    return new MullvadIndicatorPrefsWidget();
}
