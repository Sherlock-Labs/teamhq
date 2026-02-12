import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });

  console.log('Navigating to http://localhost:3002/tasks.html...');
  await page.goto('http://localhost:3002/tasks.html', { waitUntil: 'networkidle' });

  // Open bug reporter
  await page.click('.bug-btn');
  await page.waitForSelector('.bug-panel__screenshot-thumb img[src^="data:image"]');

  // Fill description
  await page.fill('#bug-textarea', 'Test bug for visual inspection');
  
  // Submit
  console.log('Submitting bug...');
  await page.click('.bug-panel__submit');
  
  // Wait for success toast
  await page.waitForSelector('.bug-toast--visible');
  console.log('Bug submitted successfully.');

  // The new bug should appear in the grid. We might need to reload or it might be optimistic.
  // The current implementation of bug-reporter.js does NOT reload the grid.
  // So we MUST reload to see the new bug.
  await page.reload({ waitUntil: 'networkidle' });

  // Find the new bug (it should be BUG-X, where X is highest)
  // We'll just click the first row if it's sorted by ID descending, but it's sorted by status.
  // Let's search for the title we just entered.
  console.log('Opening the new bug detail panel...');
  await page.click('text="Test bug for visual inspection"');

  // Wait for detail panel to open and image to load
  await page.waitForSelector('.task-detail--open');
  await page.waitForSelector('#panel-screenshot-img[src^="data/bug-screenshots"]');

  // Take a screenshot of the detail panel
  const panelPath = 'debug-detail-panel.png';
  await page.screenshot({ path: panelPath });
  console.log(`Saved detail panel screenshot to ${panelPath}`);

  await browser.close();
})();
