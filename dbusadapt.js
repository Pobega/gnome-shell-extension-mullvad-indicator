const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;

// This the D-Bus interface as XML
const NetworkManagerInterface = '<node>\
<interface name="org.freedesktop.NetworkManager"> \
    <signal name="StateChanged"> \
        <arg type="u"/> \
    </signal> \
    <signal name="DeviceAdded"> \
        <arg type="o"/> \
    </signal> \
    <signal name="DeviceRemoved"> \
        <arg type="o"/> \
    </signal> \
</interface> \
</node>';

// Declare the proxy class based on the interface
const NetworkManagerProxy = Gio.DBusProxy.makeProxyWrapper(NetworkManagerInterface);

// Get the /org/freedesktop/NetworkManager instance from the bus
let nmProxy = new NetworkManagerProxy(
    Gio.DBus.system,
    "org.freedesktop.NetworkManager",
    "/org/freedesktop/NetworkManager"
);

// Connecting to a D-Bus signal
nmProxy.connectSignal("DeviceRemoved", function(proxy) {
    print("DeviceRemove signal emitted");
});
nmProxy.connectSignal("DeviceAdded", function(proxy) {
    print("DeviceAdded signal emitted");
});
nmProxy.connectSignal("StateChanged", function(proxy) {
    print("StateChanged signal emitted");
});

let loop = new GLib.MainLoop(null, false);
loop.run();
