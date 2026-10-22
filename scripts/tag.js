const https = require("https");
const { execSync } = require("child_process");

const targetTag = process.argv[2] || "alpha";

const pkgs = [
  "@ostro/contracts", "@ostro/support", "@ostro/container", "@ostro/cookie",
  "@ostro/config", "@ostro/filesystem", "@ostro/session", "@ostro/encryption",
  "@ostro/logger", "@ostro/router", "@ostro/server", "@ostro/http",
  "@ostro/view", "@ostro/console", "@ostro/validation", "@ostro/pagination",
  "@ostro/auth", "@ostro/database", "@ostro/foundation", "@ostro/framework",
  "@ostro/installer", "@ostro/cache", "@ostro/serverless"
];

function fetchPkg(pkg) {
  return new Promise((resolve) => {
    https.get(`https://registry.npmjs.org/${pkg}`, res => {
      let d = "";
      res.on("data", c => d += c);
      res.on("end", () => {
        try { resolve(JSON.parse(d)); } catch(e) { resolve(null); }
      });
    }).on("error", () => resolve(null));
  });
}

async function run() {
  for (const pkg of pkgs) {
    const data = await fetchPkg(pkg);
    if (!data) continue;
    const versions = Object.keys(data.versions || {});
    const matchingVersions = versions.filter(v => v.startsWith("2.") && v.includes("alpha"));
    const latestVersion = matchingVersions[matchingVersions.length - 1];
    if (latestVersion) {
      try {
        console.log(`Tagging ${pkg}@${latestVersion} as ${targetTag}...`);
        const out = execSync(`npm dist-tag add ${pkg}@${latestVersion} ${targetTag}`).toString().trim();
        console.log(`[SUCCESS] ${pkg}@${latestVersion} -> ${targetTag}: ${out}`);
      } catch (err) {
        console.error(`[ERROR] ${pkg}:`, err.message);
      }
    }
  }
}
run();
