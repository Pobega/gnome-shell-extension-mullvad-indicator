# Generate a root application locale for translations
genlocale:
	xgettext --output=locale/org.gnome.Shell.Extensions.MullvadIndicator.pot *.{js,ui}

# Generate a compiled schema
genschema:
	glib-compile-schemas schemas/

# Build a zip for extensions.gnome.org releases
zip:
	zip -r mullvadindicator@pobega.github.com.zip \
		extension.js mullvad.js prefs.js prefs.ui \
		metadata.json \
		schemas locale icons \
		LICENSE README.md
