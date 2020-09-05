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

function printSignal(signal) {
    print(`${signal} signal emitted`);
}

// Connecting to a D-Bus signal
nmProxy.connectSignal("DeviceRemoved", function(proxy) {
    printSignal("DeviceRemoved");
});
nmProxy.connectSignal("DeviceAdded", function(proxy) {
    printSignal("DeviceAdded");
});
nmProxy.connectSignal("StateChanged", function(proxy) {
    printSignal("StateChanged");
});

let loop = new GLib.MainLoop(null, false);
loop.run();
