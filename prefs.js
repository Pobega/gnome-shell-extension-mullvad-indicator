const GObject = imports.gi.GObject;
imports.gi.versions.Gtk = '3.0';
const Gtk = imports.gi.Gtk;

const ExtensionUtils = imports.misc.extensionUtils;
const Extension = ExtensionUtils.getCurrentExtension();

function init() {
}

function buildPrefsWidget() {
    let widget = new AmIMullvadPrefsWidget();
    widget.show_all();
    return widget;
}

const AmIMullvadPrefsWidget = new GObject.Class({
    Name: 'AmIMullvad.Prefs.Widget',
    GTypeName: 'AmIMullvadPrefsWidget',
    Extends: Gtk.Box,

    _init(params) {

        this._settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.amimullvad');

        this.parent(params);
        this.margin = 20;
        this.set_spacing(15);
        this.set_orientation(Gtk.Orientation.VERTICAL);

        let refreshTimeLabel = new Gtk.Label({
            label: 'Automatic refresh time (in seconds)',
        });

        let spinButton = new Gtk.SpinButton();
        spinButton.set_sensitive(true);
        spinButton.set_range(1, 9999);
        spinButton.set_value(this._settings.get_int('refresh-time'));
        spinButton.set_increments(10, 10);

        spinButton.connect("value-changed", function (value) {
            this._settings.set_int('refresh-time', value.get_value_as_int());
        }.bind(this));

        let hBox = new Gtk.Box();
        hBox.set_orientation(Gtk.Orientation.HORIZONTAL);

        hBox.pack_start(refreshTimeLabel, false, false, 0);
        hBox.pack_end(spinButton, false, false, 0);

        this.add(hBox);
    },
});
