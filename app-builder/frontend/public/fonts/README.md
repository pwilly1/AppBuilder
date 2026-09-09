# Bundled App Fonts

Lato, Lusitana, and Space Mono regular/bold TTF files are bundled unchanged from
https://github.com/google/fonts/tree/main/ofl (family directories: `lato`, `lusitana`, `spacemono`).
Each family includes its upstream SIL Open Font License notice.

The same bytes are packaged in Android `app/src/main/res/font`; license copies are
in `app/src/main/assets/font-licenses`. The backend font tests verify file parity.
Font rendering does not require Google Fonts requests at runtime.

When updating a font, update both platforms and retain its license notice. Do not
replace a bundled font ID with a different typeface; saved projects refer to these IDs.
