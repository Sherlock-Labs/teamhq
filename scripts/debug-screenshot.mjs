import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Set viewport to a standard desktop size
  await page.setViewportSize({ width: 1280, height: 800 });

  console.log('Navigating to http://localhost:3002/tasks.html...');
  await page.goto('http://localhost:3002/tasks.html', { waitUntil: 'networkidle' });

  // Open the bug reporter
  console.log('Opening bug reporter...');
  await page.click('.bug-btn');
  
  // Wait for the screenshot capture to happen (it's async in the JS)
  console.log('Waiting for bug reporter thumbnail...');
  await page.waitForSelector('.bug-panel__screenshot-thumb img[src^="data:image"]', { timeout: 10000 });

  // Take a screenshot of the entire page to see the state
  const debugPath = 'tmp/debug-reporter-state.png';
  await page.screenshot({ path: debugPath });
  console.log(`Saved debug screenshot to ${debugPath}`);

  // Extract the data URL of the thumbnail to see if it looks "weird"
  const thumbnailDataUrl = await page.evaluate(() => {
    const img = document.querySelector('.bug-panel__screenshot-thumb img');
    return img ? img.src : null;
  });

  if (thumbnailDataUrl) {
    const base64Data = thumbnailDataUrl.replace(/^data:image\/\w+;base64,/, '');
    fs.writeFileSync('tmp/debug-thumbnail.jpg', Buffer.from(base64Data, 'base64'));
    console.log('Saved thumbnail to tmp/debug-thumbnail.jpg');
  }

  await browser.close();
})();
