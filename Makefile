all: genlocale genschema zip

# Generate a root application locale for translations
genlocale:
	xgettext --output=locale/org.gnome.shell.extensions.MullvadIndicator.pot *.js

# Generate a compiled schema
genschema:
	glib-compile-schemas schemas/

# Build a zip for extensions.gnome.org releases
zip:
	zip -r mullvadindicator@pobega.github.com.zip \
		extension.js mullvad.js prefs.js \
		metadata.json \
		schemas icons \
		LICENSE README.md

lint:
	npx eslint . --ext .js --fix

install:
	mkdir -p ~/.local/share/gnome-shell/extensions/mullvadindicator\@pobega.github.com/
	unzip mullvadindicator@pobega.github.com.zip -d ~/.local/share/gnome-shell/extensions/mullvadindicator\@pobega.github.com/
