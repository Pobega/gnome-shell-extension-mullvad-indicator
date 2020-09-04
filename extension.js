const St = imports.gi.St;
const Lang = imports.lang;
const Main = imports.ui.main;
const Mainloop = imports.mainloop;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const GObject = imports.gi.GObject;
const Gio = imports.gi.Gio;
const Soup = imports.gi.Soup;

const API_URL = 'https://am.i.mullvad.net/json';

const ConnectedIcon = 'mullvad-connected-symbolic';
const DisconnectedIcon = 'mullvad-disconnected-symbolic';

let mvIndicator;

const Me = imports.misc.extensionUtils.getCurrentExtension();

let MVSTATUS;
let MVIPADDR;
let MVSERVER;

function log(msg) {
  global.log('[AmIMullvad] ' + msg);
}

const MullvadIndicator = GObject.registerClass({
  GTypeName: 'MullvadIndicator'
}, class MullvadIndicator extends PanelMenu.Button {

  _init () {
    super._init(0);

    this.icon = new St.Icon({
      style_class : 'system-status-icon',
    });
    this.icon.gicon = Gio.icon_new_for_string(`${Me.path}/icons/${DisconnectedIcon}.svg`);

    this.add_child(this.icon);

    this.conn_status = new St.Label({ text : 'Checking...' });
    let conn_status = new PopupMenu.PopupMenuItem(
      'Mullvad:',
      { reactive : false }
    );
    conn_status.add_child(this.conn_status);
    this.menu.addMenuItem(conn_status);

    this.ip_addr = new St.Label({ text : '' });
    let ip_addr = new PopupMenu.PopupMenuItem(
      'IP Address:',
      { reactive : false }
    );
    ip_addr.add_child(this.ip_addr);
    this.menu.addMenuItem(ip_addr);

    this.server = new St.Label({ text : '' });
    let server = new PopupMenu.PopupMenuItem(
      'Server:',
      { reactive : false }
    );
    server.add_child(this.server);
    this.menu.addMenuItem(server);

    this._refresh();
  }

  _refresh () {
    this._get_status();
    if (this._timeout) {
      Mainloop.source_remove(this._timeout);
      this._timeout = null;
    }
    this._timeout = Mainloop.timeout_add_seconds(10, Lang.bind(this, this._refresh));
  }

  _get_status () {
    let _httpSession = new Soup.Session();
    let message = Soup.Message.new('GET', API_URL);
    message.request_headers.append('User-Agent', 'curl/7.55.1');  // Fake CURL to prevent 403
    message.request_headers.append('Accept', '*/*');  // Fake CURL to prevent 403
    /* Don't want to use Lang.bind but can't figure out how to pass 'this'
    _httpSession.queue_message(message, function(session, message) {
      let response = JSON.parse(JSON.stringify(message.response_body.data));
      this._check_if_status_changed(response);
    });
    */
    _httpSession.queue_message(message, Lang.bind(this, function (_httpSession, message) {
      let response = JSON.parse(JSON.stringify(message.response_body.data));
      this._check_if_status_changed(JSON.parse(response));
    }));
  }

  _check_if_status_changed(api_response) {
    // Only update if our status has changed
    log("in");
    if (MVSTATUS != api_response.mullvad_exit_ip ||
        MVIPADDR != api_response.ip ||
        MVSERVER != api_response.mullvad_exit_ip_hostname) {
      MVSTATUS = api_response.mullvad_exit_ip;
      MVIPADDR = api_response.ip;
      MVSERVER = api_response.mullvad_exit_ip_hostname;
      this._update();
    }
  }

  _update() {
    if (MVSTATUS === true) {
      this.conn_status.set_text('Connected');
      this.icon.gicon = Gio.icon_new_for_string(`${Me.path}/icons/${ConnectedIcon}.svg`);
    } else {
      log("Disconnected");
      this.conn_status.set_text('Disconnected');
      this.icon.gicon = Gio.icon_new_for_string(`${Me.path}/icons/${DisconnectedIcon}.svg`);
    }
    this.ip_addr.set_text(MVIPADDR || '');
    this.server.set_text(MVSERVER || '');
  }

  stop () {
  if (this._timeout)
    Mainloop.source_remove(this._timeout);
  this._timeout = undefined;
  }

});

function init()
{
}

function enable()
{
  mvIndicator = new MullvadIndicator();
  Main.panel.addToStatusArea('Mullvad Indicator', mvIndicator, 1);
}

function disable()
{
  mvIndicator.stop();
  mvIndicator.destroy();
}
