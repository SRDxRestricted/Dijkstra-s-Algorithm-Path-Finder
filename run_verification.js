const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = __dirname;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
  console.log("Launching Playwright...");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.error('PAGE ERROR:', err.stack || err.message));

  console.log("Navigating to http://localhost:5173/...");
  await page.goto('http://localhost:5173/');

  // Auth Rider click
  console.log('Clicking "Authenticate Rider"...');
  await page.click('text=Authenticate Rider');

  // Select Scenario 1
  console.log('Selecting Scenario 1...');
  await page.click('text=Scenario 1');

  // Wait and Accept route
  console.log('Accepting route for John Doe (Cardiac)...');
  await page.click('text=John Doe (Cardiac)');

  // Wait for Animate button
  console.log('Waiting for Animate Pathfinding button...');
  await page.waitForSelector('text=Animate Pathfinding');

  // Click Animate
  console.log('Clicking "Animate Pathfinding"...');
  await page.click('text=Animate Pathfinding');

  // Wait 1.2 seconds during active scan phase
  console.log('Waiting 1.2 seconds during the pathfinding animation phase...');
  await delay(1200);

  // Take screenshot during scan
  const scanScreenshotPath = path.join(ARTIFACT_DIR, 'scan_phase.png');
  console.log(`Taking screenshot during scan phase: ${scanScreenshotPath}`);
  await page.screenshot({ path: scanScreenshotPath });

  // Wait for animation to finish
  console.log('Waiting for animation to finish (approx 6.0 seconds)...');
  await delay(6000);

  // Take final screenshot
  const finalScreenshotPath = path.join(ARTIFACT_DIR, 'optimal_route.png');
  console.log(`Taking final screenshot: ${finalScreenshotPath}`);
  await page.screenshot({ path: finalScreenshotPath });

  const routeOptimalVisible = await page.locator('text=ROUTE OPTIMAL').isVisible();
  console.log(`"ROUTE OPTIMAL" visible: ${routeOptimalVisible}`);

  const hasNeonPath = await page.locator('.neon-path').count() > 0;
  console.log(`Neon path elements found: ${hasNeonPath}`);

  await browser.close();

  if (routeOptimalVisible && hasNeonPath) {
    console.log("SUCCESS: Scan wavefront lines were drawn and optimal route was highlighted.");
    process.exit(0);
  } else {
    console.log("FAILURE: Validation failed.");
    process.exit(1);
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
