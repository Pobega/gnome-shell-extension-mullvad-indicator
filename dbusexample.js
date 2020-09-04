const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;

// This the D-Bus interface as XML
const KbdBacklightInterface = '<node>\
<interface name="org.freedesktop.UPower.KbdBacklight"> \
    <method name="SetBrightness"> \
        <arg name="value" type="i" direction="in"/> \
    </method> \
    <method name="GetBrightness"> \
        <arg name="value" type="i" direction="out"/> \
    </method> \
    <method name="GetMaxBrightness"> \
        <arg name="value" type="i" direction="out"/> \
    </method> \
    <signal name="BrightnessChanged"> \
        <arg type="i"/> \
    </signal> \
</interface> \
</node>';

// Declare the proxy class based on the interface
const KbdBacklightProxy = Gio.DBusProxy.makeProxyWrapper(KbdBacklightInterface);

// Get the /org/freedesktop/UPower/KbdBacklight instance from the bus
let kbdProxy = new KbdBacklightProxy(
    Gio.DBus.system,
    "org.freedesktop.UPower",
    "/org/freedesktop/UPower/KbdBacklight"
);

// You can use proxy.<method>Sync syntax to 
// call the D-Bus method in a Sync way
print("The max brightness of your keyboard is " + kbdProxy.GetMaxBrightnessSync());

// Or you can use the syntax proxy.<method>Remote
// to call the method in an Async way
kbdProxy.GetBrightnessRemote(function(currentBrightness) {
    print("The current keyboard brightness is " + currentBrightness);
});

// Connecting to a D-Bus signal
kbdProxy.connectSignal("BrightnessChanged", function(proxy) {
    let newBrightness = proxy.GetBrightnessSync();
    print("The keyboard brightness has been changed, new brightness is " + newBrightness);
});

// Also you can get properties value using this syntax
// let property = proxy.PropertyName;

// Or you can set a property value
// proxy.PropertyName = "new value";

let loop = new GLib.MainLoop(null, false);
loop.run();
