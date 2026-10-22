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

    const viewRaw = execSync(`npm view ${pkg} versions dist-tags --json`, { encoding: 'utf8' });
    const viewData = JSON.parse(viewRaw);

    const versions = Array.isArray(viewData.versions)
      ? viewData.versions
      : [viewData.versions].filter(Boolean);
    const distTags = viewData['dist-tags'] || {};

    console.log(`Current dist-tags:`, JSON.stringify(distTags));

    // Find latest alpha release
    const alphaVersions = versions.filter((v) => v.includes('-alpha'));
    if (!alphaVersions.length) {
      console.log(`No alpha version found for ${pkg}, skipping.`);
      continue;
    }

    const latestAlpha = alphaVersions[alphaVersions.length - 1];
    console.log(`Latest alpha version: ${latestAlpha}`);

    if (distTags[targetTag] === latestAlpha) {
      console.log(`Tag "${targetTag}" is already at ${latestAlpha}.`);
      continue;
    }

    console.log(`Setting dist-tag: npm dist-tag add ${pkg}@${latestAlpha} ${targetTag}`);
    execSync(`npm dist-tag add ${pkg}@${latestAlpha} ${targetTag}`, {
      stdio: 'inherit',
    });
    console.log(`Successfully tagged ${pkg}@${latestAlpha} as ${targetTag}`);
  } catch (err) {
    console.error(`Error processing ${pkg}:`, err.message);
  }
}
console.log(`\nAll done!`);
