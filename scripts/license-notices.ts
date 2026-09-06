import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

// Generate notices for packages actually included in the browser bundle.
export function licenseNotices(): Plugin {
  return {
    name: 'runtime-license-notices',
    generateBundle() {
      const packages = new Map<string, string>();
      for (const id of this.getModuleIds()) {
        if (!id.includes('node_modules') || id.startsWith('\0')) continue;
        let directory = path.dirname(id.split('?')[0]);
        while (directory.includes('node_modules')) {
          const manifest = path.join(directory, 'package.json');
          if (fs.existsSync(manifest)) {
            const pkg = JSON.parse(fs.readFileSync(manifest, 'utf8')) as { name: string; version: string };
            const names = fs.readdirSync(directory).filter((name) => /^(licen[sc]e|copying|notice)(\.|$)/i.test(name) && fs.statSync(path.join(directory, name)).isFile());
            if (!names.length) this.error(`Missing runtime license: ${pkg.name}. Review before publishing.`);
            packages.set(`${pkg.name}@${pkg.version}`, names.map((name) => fs.readFileSync(path.join(directory, name), 'utf8')).join('\n'));
            break;
          }
          directory = path.dirname(directory);
        }
      }
      const notices = [...packages]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, license]) => `${'='.repeat(72)}\n${name}\n${'='.repeat(72)}\n${license}`)
        .join('\n\n');
      this.emitFile({ type: 'asset', fileName: 'OPEN_SOURCE_LICENSES.txt', source: notices });
    },
  };
}
