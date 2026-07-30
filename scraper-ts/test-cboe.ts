/**
 * Test CBOE Option Chain extraction
 */

import { chromium } from 'playwright';
import { CboeOptionChainPage } from './src/pages/CboeOptionChainPage';

async function testCboe() {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 500,
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });

  const page = await context.newPage();

  try {
    const symbol = 'SPY';
    console.log(`\n📊 Testing option chain extraction for ${symbol}...\n`);

    const cboe = new CboeOptionChainPage(page, {
      symbol,
      baseAssetsPath: './assets',
    });

    const result = await cboe.extractOptionChain();

    if (result.success && result.filePaths) {
      console.log(`\n✅ Success!`);
      console.log(`   Files downloaded: ${result.filePaths.length}`);
      result.filePaths.forEach((path, i) => console.log(`   ${i + 1}. ${path}`));
    } else {
      console.log(`\n❌ Failed: ${result.error}`);
    }

    console.log('\n⏸️  Browser will stay open for 30 seconds...');
    await page.waitForTimeout(30000);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

testCboe();
