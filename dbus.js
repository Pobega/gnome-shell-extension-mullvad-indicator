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

function networkManagerProxyCreate() {
    // Declare the proxy class based on the interface
    const NetworkManagerProxy = Gio.DBusProxy.makeProxyWrapper(NetworkManagerInterface);

    // Return the /org/freedesktop/NetworkManager instance from the bus
    return new NetworkManagerProxy(
        Gio.DBus.system,
        "org.freedesktop.NetworkManager",
        "/org/freedesktop/NetworkManager"
    );
}
