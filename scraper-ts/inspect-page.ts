/**
 * Inspect CBOE page to find the correct Options Range dropdown
 */

import { chromium } from 'playwright';

async function inspectPage() {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 500,
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });

  const page = await context.newPage();

  try {
    const url = 'https://www.cboe.com/delayed_quotes/SPY/quote_table';
    console.log(`\nNavigating to: ${url}\n`);

    await page.goto(url);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Handle cookies
    try {
      const cookieButton = await page.$('#onetrust-accept-btn-handler');
      if (cookieButton) {
        await cookieButton.click();
        await page.waitForTimeout(1000);
      }
    } catch {}

    console.log('📋 Looking for all ReactSelect dropdowns on the page...\n');

    // Find all ReactSelect controls
    const dropdowns = await page.$$('.ReactSelect__control');
    console.log(`Found ${dropdowns.length} ReactSelect dropdowns\n`);

    for (let i = 0; i < dropdowns.length; i++) {
      const dropdown = dropdowns[i];
      const text = await dropdown.textContent();
      const html = await dropdown.innerHTML();

      console.log(`\n📍 Dropdown ${i + 1}:`);
      console.log(`   Current value: "${text?.trim()}"`);
      console.log(`   HTML preview: ${html.substring(0, 150)}...`);

      // Try to find the label near this dropdown
      const parent = await dropdown.evaluateHandle(el => el.parentElement);
      const parentHtml = await parent.evaluate((el: any) => el?.outerHTML || '');
      if (parentHtml.includes('Options Range') || parentHtml.includes('range')) {
        console.log(`   ⭐ This might be the Options Range dropdown!`);
      }
    }

    console.log('\n\n⏸️  Browser will stay open for 120 seconds to inspect manually...');
    console.log('Look for "Options Range" dropdown and note its current value.\n');

    await page.waitForTimeout(120000);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

inspectPage();
