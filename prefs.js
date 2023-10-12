import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';

import * as Mullvad from './mullvad.js';

import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class MullvadIndicatorPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        this._settings = this.getSettings();

        const page = new Adw.PreferencesPage();

        let group = new Adw.PreferencesGroup({
            title: _('Visibility'),
        });
        page.add(group);

        group.add(this._actionRow(_('Display indicator icon'), 'show-icon', new Gtk.Switch(), 'active'));
        group.add(this._actionRow(_('Show in system menu'), 'show-menu', new Gtk.Switch(), 'active'));
        group.add(this._comboRow(_('Title text'), 'title-text', [...Mullvad.statusItemNames(), _('Connected')]));
        group.add(this._comboRow(_('Subtitle text'), 'subtitle-text', [...Mullvad.statusItemNames(), _('None')]));

        group = new Adw.PreferencesGroup({
            title: _('Refresh'),
        });
        page.add(group);

        let spinButton = new Gtk.SpinButton();
        spinButton.set_range(1, 9999);
        spinButton.set_increments(10, 10);
        spinButton.set_value(this._settings.get_int('refresh-time'));
        group.add(this._actionRow(_('Automatic refresh time (in seconds)'), 'refresh-time', spinButton, 'value'));

        group = new Adw.PreferencesGroup({
            title: _('Status'),
        });
        page.add(group);

        group.add(this._actionRow(_('Show currently connected server'), 'show-server', new Gtk.Switch(), 'active'));
        group.add(this._actionRow(_("Show currently connected server's country"), 'show-country', new Gtk.Switch(), 'active'));
        group.add(this._actionRow(_("Show currently connected server's city"), 'show-city', new Gtk.Switch(), 'active'));
        group.add(this._actionRow(_('Show your current IP address'), 'show-ip', new Gtk.Switch(), 'active'));
        group.add(this._actionRow(_('Show your VPN type (WireGuard/OpenVPN)'), 'show-type', new Gtk.Switch(), 'active'));

        window.add(page);
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
}
