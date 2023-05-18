const {Adw, Gio, GObject, Gtk} = imports.gi;
const Gettext = imports.gettext.domain('mullvadindicator');
const _ = Gettext.gettext;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const Mullvad = Me.imports.mullvad;

const ExtensionUtils = imports.misc.extensionUtils;



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

        group.add(this._actionRow(_('Display indicator icon'), 'show-icon', new Gtk.Switch(), 'active'));
        group.add(this._actionRow(_('Show in system menu'), 'show-menu', new Gtk.Switch(), 'active'));
        group.add(this._comboRow(_('Title text'), 'title-text', [...Mullvad.statusItemNames(), _('Connected')]));
        group.add(this._comboRow(_('Subtitle text'), 'subtitle-text', [...Mullvad.statusItemNames(), _('None')]));

        group = new Adw.PreferencesGroup({
            title: _('Refresh'),
        });
        this.add(group);

        let spinButton = new Gtk.SpinButton();
        spinButton.set_range(1, 9999);
        spinButton.set_increments(10, 10);
        spinButton.set_value(this._settings.get_int('refresh-time'));
        group.add(this._actionRow(_('Automatic refresh time (in seconds)'), 'refresh-time', spinButton, 'value'));

        group = new Adw.PreferencesGroup({
            title: _('Status'),
        });
        this.add(group);

        group.add(this._actionRow(_('Show currently connected server'), 'show-server', new Gtk.Switch(), 'active'));
        group.add(this._actionRow(_("Show currently connected server's country"), 'show-country', new Gtk.Switch(), 'active'));
        group.add(this._actionRow(_("Show currently connected server's city"), 'show-city', new Gtk.Switch(), 'active'));
        group.add(this._actionRow(_('Show your current IP address'), 'show-ip', new Gtk.Switch(), 'active'));
        group.add(this._actionRow(_('Show your VPN type (WireGuard/OpenVPN)'), 'show-type', new Gtk.Switch(), 'active'));
    }

    _actionRow(title, key, object, property) {
        const row = new Adw.ActionRow({title: title});

        object.valign = Gtk.Align.CENTER;
        row.add_suffix(object);
        row.activatable_widget = object;

        this._settings.bind(key, object, property, Gio.SettingsBindFlags.DEFAULT);

        return row;
    }

    _comboRow(title, key, list) {
        const row = new Adw.ComboRow({
            title: title,
            model: new Gtk.StringList({
                strings: list
            }),
            selected: this._settings.get_uint(key)
        });

        this._settings.bind(key, row, 'selected', Gio.SettingsBindFlags.DEFAULT);

        return row;
    }
};

function init() {
}

function buildPrefsWidget() {
    return new MullvadIndicatorPrefsWidget();
}
