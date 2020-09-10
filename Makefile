genlocale:
	xgettext --output=locale/org.gnome.Shell.Extensions.MullvadIndicator.pot *.{js,ui}

genschema:
	glib-compile-schemas schemas/
