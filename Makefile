.PHONY: dev build preview install to-avif

install:
	npm install

dev:
	npm run dev

build:
	npm run build

preview:
	npm run preview

to-avif:
	node scripts/to-avif.mjs ~/Desktop ~/Desktop
