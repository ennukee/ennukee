import { chromium } from "playwright";
import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

const repoRoot = process.cwd();
const appDir = path.resolve(repoRoot, "display/display");

const PORT = process.env.PORT ?? "4173";
const BASE_URL = `http://127.0.0.1:${PORT}`;
const ROUTE = process.env.SCREENSHOT_ROUTE ?? "/";

const OUTPUT = process.env.OUTPUT_PATH ?? path.resolve(repoRoot, "data/image/profile.png");

const CLIP = {
  x: Number(process.env.CLIP_X ?? 0),
  y: Number(process.env.CLIP_Y ?? 0),
  width: Number(process.env.CLIP_W ?? 1100 + 64),
  height: Number(process.env.CLIP_H ?? 900 + 64),
};

function assertDirExists(dir, label) {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    throw new Error(`${label} does not exist or is not a directory: ${dir}`);
  }
}

function run(command, args, opts = {}) {
  return new Promise((resolve, reject) => {
    // Helpful debug
    console.log(`\n$ ${command} ${args.join(" ")}`);
    if (opts.cwd) console.log(`  (cwd: ${opts.cwd})`);

    const p = spawn(command, args, {
      stdio: "inherit",
      shell: true,         // ✅ Windows-friendly: resolves npm like your terminal does
      windowsHide: true,
      ...opts,
    });

    p.on("error", reject);
    p.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code}`));
    });
  });
}

async function waitForServer(url, timeoutMs = 30_000) {
  const start = Date.now();
  while (true) {
    try {
      const res = await fetch(url, { redirect: "manual" });
      if (res.status >= 200 && res.status < 500) return;
    } catch {}
    if (Date.now() - start > timeoutMs) throw new Error(`Timed out waiting for ${url}`);
    await new Promise((r) => setTimeout(r, 300));
  }
}

async function main() {
  assertDirExists(appDir, "Vite app directory");

  // Build the Vite app
  await run("npm", ["install"], { cwd: appDir });
  await run("npm", ["run", "build"], { cwd: appDir });

  // Start Vite preview
  const server = spawn("npm", ["run", "preview", "--", "--host", "127.0.0.1", "--port", PORT], {
    cwd: appDir,
    stdio: "inherit",
    shell: true,          // ✅ same here
    windowsHide: true,
  });

  const targetUrl = `${BASE_URL}${ROUTE}`;

  try {
    await waitForServer(targetUrl);

    const browser = await chromium.launch();
    const page = await browser.newPage({
      viewport: {
        width: Math.max(CLIP.x + CLIP.width, 1280),
        height: Math.max(CLIP.y + CLIP.height, 720),
      },
      deviceScaleFactor: Number(process.env.DPR ?? 1),
    });

    await page.goto(targetUrl, { waitUntil: "networkidle" });
    await page.screenshot({ path: OUTPUT, clip: CLIP, type: "png" });

    await browser.close();
    console.log(`✅ Wrote ${OUTPUT}`);
  } finally {
    server.kill("SIGTERM");
  }
}

main().catch((err) => {
  console.error("❌", err);
  process.exit(1);
});
