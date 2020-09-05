const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;

function init () {
}

function buildPrefsWidget () {
    let widget = new AmIMullvadPrefsWidget();
    widget.show_all();
    return widget;
}

const AmIMullvadPrefsWidget = new GObject.Class({
    Name : "AmIMullvad.Prefs.Widget",
    GTypeName : "AmIMullvadPrefsWidget",
    Extends : Gtk.Box,

    _init : function (params) {
        this.parent(params);
        this.margin = 20;
        this.set_spacing(15);
        this.set_orientation(Gtk.Orientation.VERTICAL);

        let myLabel = new Gtk.Label({
            label : "Translated Text"
        });

        this.add(myLabel);
    }
});
