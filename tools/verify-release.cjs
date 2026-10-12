// Fail before Xcode builds an IPA with stale/missing web resources or version labels.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p));
const release = JSON.parse(read('release.json'));
const index = read('index.html').toString();
const digest = data => crypto.createHash('sha256').update(data).digest('hex');
const resources = new Set(['index.html', 'styles.css', 'manifest.webmanifest', 'apple-touch-icon.png']);
resources.add('review-worker.js');
resources.add('review-worker-bundle.js');
assert.equal(read('review-worker-bundle.js').toString(), require('./build-review-worker.cjs').build(), 'Native review worker is stale');
for (const match of index.matchAll(/(?:src|href)="([^"#]+)"/g)) {
  const name = match[1];
  if (!/^(?:https?:|data:|mailto:)/.test(name)) resources.add(name);
}
for (const match of read('styles.css').toString().matchAll(/url\(['"]?([^)'"\s]+)['"]?\)/g)) resources.add(match[1]);
for (const icon of JSON.parse(read('manifest.webmanifest')).icons) resources.add(icon.src);
assert.match(index, new RegExp('name="cognicode-release" content="' + release.version.replaceAll('.', '\\.') + '\\+' + release.build + '"'));
for (const filename of ['native/CogniCode/Info.plist', 'native/CogniCodeWidgets/Info.plist']) {
  const plist = read(filename).toString();
  for (const [key, value] of [['CFBundleShortVersionString', release.version], ['CFBundleVersion', release.build]]) {
    assert.equal(plist.match(new RegExp('<key>' + key + '</key>\\s*<string>([^<]+)</string>'))?.[1], value, filename + ': ' + key);
  }
}
const project = read('native/project.yml').toString();
for (const match of project.matchAll(/MARKETING_VERSION: "([^"]+)"/g)) assert.equal(match[1], release.version);
for (const match of project.matchAll(/CURRENT_PROJECT_VERSION: "([^"]+)"/g)) assert.equal(match[1], release.build);
const hashes = {};
for (const name of resources) {
  const original = read(name), bundled = read('native/Web/' + name);
  assert.ok(original.equals(bundled), 'Native resource is stale: ' + name);
  hashes[name] = digest(original);
}
assert.ok(resources.has('launch.js') && resources.has('orbital-clock.js'), 'Missing launch or clock entry point');
assert.ok(resources.has('dial-clock.css'), 'Missing dial clock stylesheet');
assert.ok(resources.has('data-rain.js') && resources.has('data-rain.css'), 'Missing DataRain background resources');
assert.ok(!resources.has('matrix-rain.js') && !resources.has('matrix-rain.css') && !resources.has('radio-clock.css'), 'Legacy background/clock must not be shipped');
assert.ok(!resources.has('sonar.js'), 'Old particle background must not be shipped');
const storyboard = read('native/CogniCode/LaunchScreen.storyboard').toString();
assert.ok(storyboard.includes('با کوگنی، کُدت رو تحلیل کن'), 'Missing native launch slogan');
for (const asset of ['LaunchBrain', 'LaunchBackground', 'LaunchSlogan']) {
  assert.ok(storyboard.includes('image="' + asset + '"'));
  const folder = 'native/CogniCode/Assets.xcassets/' + asset + '.imageset/';
  const contents = JSON.parse(read(folder + 'Contents.json'));
  for (const image of contents.images) assert.ok(read(folder + image.filename).length > 0);
}
if (process.argv.includes('--manifest')) {
  fs.writeFileSync(path.join(root, 'release-manifest.json'), JSON.stringify({ ...release, webResources: hashes }, null, 2) + '\n');
}
console.log(`PASS release ${release.version} (${release.build}): ${resources.size} matching web/native resources, launch assets, version labels`);
