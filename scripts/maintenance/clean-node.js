const { rmSync } = require('fs');
const { join } = require('path');

const root = process.cwd();

// Remove top-level artifact dirs
const dirs = [
  '.agents',
  '.freebuff',
  'dist',
  'logs',
  'snapshots',
  'test-output',
  join('agents', 'mcp-server', 'dist'),
  join('packages', 'core', 'dist'),
  join('tauri-app', 'dist'),
  join('tauri-app', 'src-tauri', 'target')
];

dirs.forEach(d => {
  const full = join(root, d);
  try {
    rmSync(full, { recursive: true, force: true });
    console.log(`Removed ${full}`);
  } catch (e) {
    // ignore if not exist
  }
});

// Remove dist/build inside node_modules (keep node_modules itself)
function cleanNodeModules(dir) {
  const subDirs = ['dist', 'build', 'out', 'target'];
  subDirs.forEach(sub => {
    const p = join(dir, sub);
    try {
      rmSync(p, { recursive: true, force: true });
      console.log(`Removed ${p}`);
    } catch (e) {}
  });
}

cleanNodeModules(join(root, 'node_modules'));
cleanNodeModules(join(root, 'agents', 'mcp-server', 'node_modules'));
cleanNodeModules(join(root, 'tauri-app', 'node_modules'));

console.log('Artifact cleanup completed via Node.');
