const Gio = imports.gi.Gio;

const Me = imports.misc.extensionUtils.getCurrentExtension();

function _getSchema() {
    const GioSSS = Gio.SettingsSchemaSource;
    const schemaSource = GioSSS.new_from_directory(
        Me.dir.get_child('schemas').get_path(),
        GioSSS.get_default(),
        false,
    );
    const schemaObj = schemaSource.lookup(
        'org.gnome.shell.extensions.mullvadindicator',
        true,
    );

    return schemaObj;
}

function _getSettings() {
    const schemaObj = _getSchema();

    if (!schemaObj)
        throw new Error('cannot find schemas');

    return new Gio.Settings({settings_schema: schemaObj});
}
