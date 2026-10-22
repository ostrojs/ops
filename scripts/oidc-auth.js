const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

async function setupOidc() {
  const tokenUrl = process.env.ACTIONS_ID_TOKEN_REQUEST_URL;
  const bearerToken = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;

  if (!tokenUrl || !bearerToken) {
    console.error("Missing GitHub OIDC environment variables.");
    process.exit(1);
  }

  // 1. Fetch GitHub Actions OIDC ID Token
  const res = await fetch(`${tokenUrl}&audience=npm:registry`, {
    headers: {
      Authorization: `Bearer ${bearerToken}`,
      Accept: "application/json"
    }
  });

  if (!res.ok) {
    console.error("Failed to fetch OIDC token from GitHub:", res.status, await res.text());
    process.exit(1);
  }

  const { value: idToken } = await res.json();

  // 2. Exchange GitHub ID Token with npmjs registry for a short-lived bearer token
  const npmRes = await fetch("https://registry.npmjs.org/-/npm/v1/tokens/oidc", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ token: idToken })
  });

  if (!npmRes.ok) {
    console.error("Failed to exchange OIDC token with npm:", npmRes.status, await npmRes.text());
    process.exit(1);
  }

  const { token: npmSessionToken } = await npmRes.json();

  // 3. Configure ~/.npmrc so all npm commands (like npm dist-tag) are authenticated via OIDC
  const npmrcPath = path.join(os.homedir(), ".npmrc");
  const configLine = `//registry.npmjs.org/:_authToken=${npmSessionToken}\n`;
  fs.appendFileSync(npmrcPath, configLine);

  console.log("Successfully authenticated with npm via OIDC!");
}

setupOidc().catch(err => {
  console.error(err);
  process.exit(1);
});
