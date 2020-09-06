const Clutter = imports.gi.Clutter;
const Gettext = imports.gettext;
const Gio = imports.gi.Gio;
const St = imports.gi.St;

const Me = imports.misc.extensionUtils.getCurrentExtension();

const Main = imports.ui.main;
const Mainloop = imports.mainloop;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Util = imports.misc.util;

const ICON_CONNECTED = 'mullvad-connected-symbolic';
const ICON_DISCONNECTED = 'mullvad-disconnected-symbolic';

Gettext.bindtextdomain('mullvadindicator', Me.dir.get_child('locale').get_path());
Gettext.textdomain('mullvadindicator');
const _ = Gettext.gettext;

function init(object) {
    // Taskbar icon
    object._icon = new St.Icon({
        style_class: 'system-status-icon',
    });
    updateTrayIcon(object, ICON_DISCONNECTED);
    object.add_child(object._icon);
    // End taskbar icon

    // Popup menu
    let popupMenu = new PopupMenu.PopupMenuSection();
    object.menu.box.style = 'padding: 16px;';
    let parentContainer = new St.BoxLayout({
        x_align: Clutter.ActorAlign.FILL,
        x_expand: true,
        style: 'padding-bottom: 12px;',
    });
    // End popup menu

    // Highest level text box
    object.vpnInfoBox = new St.BoxLayout({
        style_class: 'vpn-info-box',
        vertical: true,
    });
    parentContainer.add_actor(object.vpnInfoBox);
    popupMenu.actor.add(parentContainer);
    object.menu.addMenuItem(popupMenu);
    // End highest level text box

    // Settings button
    let buttonBox = new St.BoxLayout();
    object._settingsIcon = new St.Icon({
        icon_name: 'emblem-system-symbolic',
        style_class: 'popup-menu-icon',
    });
    object._settingsButton = new St.Button({
        child: object._settingsIcon,
        style_class: 'button',
    });
    object._settingsButton.connect('clicked',  () => Util.spawnCommandLine('gnome-extensions prefs amimullvad@pobega.github.com'));
    buttonBox.add_actor(object._settingsButton);
    // End settings button

    // Refresh button
    object._refreshIcon = new St.Icon({
        icon_name: 'view-refresh-symbolic',
        style_class: 'popup-menu-icon',
    });
    object._refreshButton = new St.Button({
        child: object._refreshIcon,
        x_expand: true,
        x_align: Clutter.ActorAlign.END,
        style_class: 'button',
    });
    object._refreshButton.connect('clicked',  () => {
        object._forceUpdate();
    });
    buttonBox.add_actor(object._refreshButton);
    // End refresh button

    popupMenu.actor.add(parentContainer);
    popupMenu.actor.add_actor(buttonBox);
    object.menu.addMenuItem(popupMenu);

    Main.panel.addToStatusArea('AmIMullvad', object, 1);

    // Initial state
    let vpnInfoRow = new St.BoxLayout({
        x_align: Clutter.ActorAlign.START,
        x_expand: true,
    });
    object.vpnInfoBox.add_actor(vpnInfoRow);

    let label = new St.Label({
        style_class: 'vpn-info-vpn-init',
        text: `${_('Mullvad')}: `,
        x_align: Clutter.ActorAlign.CENTER,
        x_expand: true,
    });
    vpnInfoRow.add_actor(label);

    let vpnLabel = new St.Label({
        style_class: 'vpn-info-vpn-init',
        text: 'Checking...',
    });
    vpnInfoRow.add_actor(vpnLabel);

    let vpnIcon = new St.Icon({
        icon_name: 'emblem-synchronizing-symbolic',
        style_class: 'popup-menu-icon vpn-icon-vpn-init',
    });
    vpnInfoRow.add_actor(vpnIcon);

    object.vpnInfoBox.add_actor(new PopupMenu.PopupSeparatorMenuItem());
}

function updateTrayIcon(object, relative_path) {
    object._icon.gicon = Gio.icon_new_for_string(`${Me.path}/icons/${relative_path}.svg`);
}

function update(object, items_to_show) {
    // Destroy current inner text boxes
    object.vpnInfoBox.destroy_all_children();

    let vpnInfoRow = new St.BoxLayout({
        x_align: Clutter.ActorAlign.START,
        x_expand: true,
    });
    object.vpnInfoBox.add_actor(vpnInfoRow);

    let label = new St.Label({
        style_class: object._connected ? 'vpn-info-vpn-on' : 'vpn-info-vpn-off',
        text: `${_('Mullvad')}: `,
        x_align: Clutter.ActorAlign.CENTER,
        x_expand: true,
    });
    vpnInfoRow.add_actor(label);

    let vpnLabel = new St.Label({
        style_class: object._connected ? 'vpn-info-vpn-on' : 'vpn-info-vpn-off',
        text: object._connected ? _('Connected') : _('Disconnected'),
    });
    vpnInfoRow.add_actor(vpnLabel);

    let vpnIcon = new St.Icon({
        icon_name: object._connected ? 'security-high-symbolic' : 'security-low-symbolic',
        style_class: object._connected ? 'popup-menu-icon vpn-icon-vpn-on' : 'popup-menu-icon vpn-icon-vpn-off',
    });
    vpnInfoRow.add_actor(vpnIcon);

    object.vpnInfoBox.add_actor(new PopupMenu.PopupSeparatorMenuItem());

    if (object._connected === true) {
        updateTrayIcon(object, ICON_CONNECTED);
    } else {
        updateTrayIcon(object, ICON_DISCONNECTED);
        return;
    }

    for (let item in items_to_show) {
        if (object._connStatus[item]) {
            let vpnInfoRow = new St.BoxLayout();
            object.vpnInfoBox.add_actor(vpnInfoRow);

            let label = new St.Label({
                style_class: 'vpn-info-item',
                text: `${_(items_to_show[item].name)}: `,
                y_align: Clutter.ActorAlign.CENTER,
                y_expand: true,
            });
            vpnInfoRow.add_actor(label);

            let infoLabel = new St.Label({
                style_class: 'vpn-info-value',
                text: object._connStatus[item].text || '',
                y_align: Clutter.ActorAlign.CENTER,
                y_expand: true,
            });
            let dataLabelBtn = new St.Button({
                child: infoLabel,
            });
            dataLabelBtn.connect('button-press-event', () => {
                Clipboard.set_text(CLIPBOARD_TYPE, dataLabelBtn.child.text);
            });
            vpnInfoRow.add_actor(dataLabelBtn);
        }
    }
}
