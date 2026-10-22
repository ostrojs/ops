const { execSync } = require('child_process');

const ALL_PACKAGES = [
  '@ostro/contracts',
  '@ostro/support',
  '@ostro/container',
  '@ostro/cookie',
  '@ostro/config',
  '@ostro/filesystem',
  '@ostro/session',
  '@ostro/encryption',
  '@ostro/logger',
  '@ostro/router',
  '@ostro/server',
  '@ostro/http',
  '@ostro/console',
  '@ostro/auth',
  '@ostro/database',
  '@ostro/foundation',
  '@ostro/cache',
  '@ostro/serverless',
  '@ostro/view',
  '@ostro/validation',
  '@ostro/pagination',
  '@ostro/framework',
  '@ostro/installer',
];

const action = process.env.ACTION || 'tag';
const targetTag = process.env.TARGET_TAG || 'alpha';
const packagesInput = (process.env.PACKAGES_INPUT || '').trim();

const targetPackages = packagesInput
  ? packagesInput.split(',').map((p) => p.trim()).filter(Boolean)
  : ALL_PACKAGES;

console.log(`Starting execution: action=${action}, tag=${targetTag}`);
console.log(`Target packages (${targetPackages.length}): ${targetPackages.join(', ')}`);

for (const pkg of targetPackages) {
  try {
    console.log(`\n========================================`);
    console.log(`Processing ${pkg}...`);

    let versionsRaw = '';
    let tagsRaw = '';

    try {
      versionsRaw = execSync(`npm view ${pkg} versions --json --registry=https://registry.npmjs.org`, { encoding: 'utf8' }).trim();
    } catch (e) {
      console.error(`Could not fetch versions for ${pkg}:`, e.message);
      continue;
    }

    try {
      tagsRaw = execSync(`npm view ${pkg} dist-tags --json --registry=https://registry.npmjs.org`, { encoding: 'utf8' }).trim();
    } catch (e) {
      console.warn(`Could not fetch dist-tags for ${pkg}:`, e.message);
    }

    const versions = versionsRaw ? JSON.parse(versionsRaw) : [];
    const distTags = tagsRaw ? JSON.parse(tagsRaw) : {};
    const versionList = Array.isArray(versions) ? versions : [versions].filter(Boolean);

    console.log(`Current dist-tags:`, JSON.stringify(distTags));

    // Filter 2.* alpha versions
    const alphaVersions = versionList.filter((v) => typeof v === 'string' && v.startsWith('2.') && v.includes('-alpha'));
    if (!alphaVersions.length) {
      console.log(`No 2.*-alpha version found for ${pkg}, skipping.`);
      continue;
    }

    const latestAlpha = alphaVersions[alphaVersions.length - 1];
    console.log(`Target alpha version: ${latestAlpha}`);

    if (distTags[targetTag] === latestAlpha) {
      console.log(`Tag "${targetTag}" is already pointing to ${latestAlpha}.`);
      continue;
    }

    console.log(`Running: npm dist-tag add ${pkg}@${latestAlpha} ${targetTag} --registry=https://registry.npmjs.org`);
    execSync(`npm dist-tag add ${pkg}@${latestAlpha} ${targetTag} --registry=https://registry.npmjs.org`, {
      stdio: 'inherit',
    });
    console.log(`Successfully tagged ${pkg}@${latestAlpha} as ${targetTag}`);
  } catch (err) {
    console.error(`Error processing ${pkg}:`, err.message);
  }
}
console.log(`\nAll done!`);
