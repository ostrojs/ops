const https = require("https");
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

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
  const tmpDir = path.join(process.cwd(), "tmp_pkg");
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  for (const pkg of pkgs) {
    const data = await fetchPkg(pkg);
    if (!data) continue;
    const versions = Object.keys(data.versions || {});
    const matchingVersions = versions.filter(v => v.startsWith("2.") && v.includes("alpha"));
    const latestVersion = matchingVersions[matchingVersions.length - 1];
    if (latestVersion) {
      const tarballUrl = data.versions[latestVersion].dist.tarball;
      console.log(`Processing ${pkg}@${latestVersion}...`);
      
      const pkgDir = path.join(tmpDir, pkg.replace("@ostro/", ""));
      if (fs.existsSync(pkgDir)) fs.rmSync(pkgDir, { recursive: true, force: true });
      fs.mkdirSync(pkgDir, { recursive: true });

      try {
        // Download tarball and extract
        execSync(`curl -sL "${tarballUrl}" | tar -xz --strip-components=1 -C "${pkgDir}"`);
        // Publish to target tag with provenance (OIDC)
        const cmd = `cd "${pkgDir}" && npm publish --access public --tag ${targetTag} --provenance`;
        const out = execSync(cmd).toString().trim();
        console.log(`[SUCCESS] ${pkg}@${latestVersion} published to tag '${targetTag}': ${out}`);
      } catch (err) {
        // If npm publish says version already exists, npm dist-tag add can be attempted
        console.log(`[INFO] publish attempt on ${pkg}:`, err.message.split("\n")[0]);
        try {
          const tagOut = execSync(`npm dist-tag add ${pkg}@${latestVersion} ${targetTag}`).toString().trim();
          console.log(`[SUCCESS] dist-tag fallback ${pkg}@${latestVersion} -> ${targetTag}: ${tagOut}`);
        } catch (tagErr) {
          console.error(`[ERROR] tag error for ${pkg}:`, tagErr.message);
        }
      }
    }
  }
}
run();
