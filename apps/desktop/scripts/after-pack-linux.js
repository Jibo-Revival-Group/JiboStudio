/**
 * Wrap the Linux Electron binary so AppImage/direct launches pass --no-sandbox
 * before Chromium initializes (app.commandLine.appendSwitch is too late).
 */
const fs = require('fs');
const path = require('path');

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'linux') {
    return;
  }

  const exeName = context.packager.executableName;
  const exePath = path.join(context.appOutDir, exeName);
  const realPath = `${exePath}.bin`;

  if (!fs.existsSync(exePath)) {
    throw new Error(`Expected Linux executable at ${exePath}`);
  }

  fs.renameSync(exePath, realPath);
  fs.writeFileSync(
    exePath,
    `#!/bin/sh
exec "$(dirname "$0")/${exeName}.bin" --no-sandbox "$@"
`,
  );
  fs.chmodSync(exePath, 0o755);
};
