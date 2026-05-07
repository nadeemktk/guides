# Build Assets

Place your app icon here before running `npm run build:win`.

## Required Files

| File | Size | Purpose |
|------|------|---------|
| `icon.ico` | 256×256 (multi-size ICO) | Windows app icon, taskbar, installer |

## How to Create the Icon

1. Take your company logo (PNG, min 256×256 px)
2. Convert it to ICO using one of these free tools:
   - https://icoconvert.com
   - https://convertico.com
   - https://cloudconvert.com/png-to-ico
3. Make sure the ICO includes sizes: 16, 32, 48, 128, 256 px
4. Save as `build/icon.ico`

## Without an Icon

If `build/icon.ico` is missing, the build will use Electron's default icon.
The app will still work — only the taskbar/desktop icon will be the Electron default.

To build WITHOUT an icon, remove the `"icon"` lines from `package.json` `win` and `nsis` sections temporarily.
