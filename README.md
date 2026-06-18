# Jibo Studio

Desktop IDE for creating on-robot Jibo Electron skills. Visual editors for Flow, Behavior, MIM, and Rules files; bundled legacy SDK toolchain; robot sync and skill debugger.

## Images

![Start Page](readme-assets/start.webp)
![IDE In use](readme-assets/usage.webp)

## Requirements

- Linux (v1)
- Node.js 18+ (for running Jibo Studio itself)

## Development

```bash
npm install
npm run dev
```

## Vendor SDK Toolchain

Maintainers populate offline toolchain assets:

```bash
npm run vendor
```

This downloads Jibo npm tarballs from pvindex, installs `vendor/skill-deps/node_modules` (used when creating skills — **no network required**), and caches transitive dependencies. End users never need pvindex or npm registry access if releases include the vendored `skill-deps` folder.

## Build & Package

```bash
npm run build
npm run package:linux
```

## License

3-clause BSD — see [license](license).
