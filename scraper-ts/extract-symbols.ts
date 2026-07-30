/**
 * Simple symbol extraction script
 */

import { chromium } from 'playwright';
import { BarchartLoginSkill } from './src/skills/BarchartLoginSkill';
import * as dotenv from 'dotenv';

dotenv.config();

async function extractSymbols() {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 500,
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('🔐 Logging in...');
    const loginSkill = new BarchartLoginSkill(page, {
      email: process.env.BARCHART_EMAIL!,
      password: process.env.BARCHART_PASSWORD!,
      loginUrl: process.env.BARCHART_LOGIN_URL!,
    });

    await loginSkill.execute();
    console.log('✅ Logged in\n');

    console.log('📍 Navigating to screener...');
    await page.goto(process.env.BARCHART_SCREENER_URL!);
    await page.waitForLoadState('networkidle');
    console.log('✅ Page loaded\n');

    console.log('⏳ Waiting 3 seconds...');
    await page.waitForTimeout(3000);

    console.log('🔍 Looking for "See Results" button...');
    const seeResultsButton = 'a.bc-screener__see-results-button, a:has-text("See Results")';

    try {
      await page.waitForSelector(seeResultsButton, { timeout: 10000 });
      console.log('✅ Found "See Results" button, clicking...');
      await page.click(seeResultsButton);
      console.log('✅ Clicked!\n');

      console.log('⏳ Waiting for results to load...');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(5000);
    } catch (error) {
      console.log('⚠️ Button not found or already clicked\n');
    }

    console.log('🔍 Extracting symbols...');

    // Method 1: Symbol links
    const symbolLinks = await page.$$('div._cell.symbol a');
    console.log(`Found ${symbolLinks.length} symbol links`);

    if (symbolLinks.length > 0) {
      const symbols = [];
      for (const link of symbolLinks) {
        const href = await link.getAttribute('href');

        // Extract symbol from href: /stocks/quotes/SPY/overview → SPY
        if (href) {
          const match = href.match(/\/quotes\/([^\/]+)/);
          if (match && match[1]) {
            const symbol = match[1];
            symbols.push(symbol);
            console.log(`✓ Found: ${symbol}`);
          }
        }
      }

      console.log('\n✅ Symbols extracted:');
      console.log(JSON.stringify(symbols, null, 2));
      console.log(`\nTotal: ${symbols.length} symbols`);
    } else {
      console.log('❌ No symbols found');

      // Debug: Check what's in the grid
      const gridHTML = await page.$eval('div#_grid', (el) => el.outerHTML);
      console.log('Grid HTML (first 1000 chars):');
      console.log(gridHTML.substring(0, 1000));
    }

    console.log('\n⏸️  Browser will stay open for 30 seconds...');
    await page.waitForTimeout(30000);
  } catch (error) {
    console.error('❌ Error:', error);
    await page.screenshot({ path: 'error.png', fullPage: true });
    console.log('Screenshot saved: error.png');
  } finally {
    await browser.close();
  }
}

extractSymbols();
