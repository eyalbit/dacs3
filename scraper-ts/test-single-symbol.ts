/**
 * Test single symbol extraction with detailed logging
 */

import { chromium } from 'playwright';
import { CboeOptionChainPage } from './src/pages/CboeOptionChainPage';

async function testSingleSymbol() {
  const browser = await chromium.launch({
    headless: false, // Show browser to see what's happening
    slowMo: 1000, // Slow down to see each step
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
      baseAssetsPath: '../assets',
    });

    const result = await cboe.extractOptionChain();

    if (result.success && result.filePaths) {
      console.log(`\n✅ Success!`);
      console.log(`   Files downloaded: ${result.filePaths.length}`);
      result.filePaths.forEach((path, i) => console.log(`   ${i + 1}. ${path}`));

      // Read and analyze the August file
      const fs = require('fs');
      const augustFile = result.filePaths[1]; // Second file is August
      if (fs.existsSync(augustFile)) {
        const content = fs.readFileSync(augustFile, 'utf-8');
        const lines = content.split('\n');
        console.log(`\n📄 File Analysis: ${augustFile}`);
        console.log(`   Total lines: ${lines.length}`);

        // Count lines with volume > 0
        let linesWithVolume = 0;
        for (let i = 4; i < lines.length; i++) { // Skip header lines
          const cols = lines[i].split(',');
          if (cols.length > 6) {
            const callVolume = parseInt(cols[6]) || 0;
            const putVolume = parseInt(cols[17]) || 0;
            if (callVolume > 0 || putVolume > 0) {
              linesWithVolume++;
            }
          }
        }
        console.log(`   Lines with Volume > 0: ${linesWithVolume}`);

        // Show a few sample lines with different deltas
        console.log(`\n📋 Sample lines (showing Delta values):`);
        for (let i = 4; i < Math.min(lines.length, 14); i++) {
          const cols = lines[i].split(',');
          if (cols.length > 8) {
            const strike = cols[11];
            const callDelta = cols[8];
            const putDelta = cols[19];
            console.log(`   Strike ${strike}: Call Δ=${callDelta}, Put Δ=${putDelta}`);
          }
        }
      }
    } else {
      console.log(`\n❌ Failed: ${result.error}`);
    }

    console.log('\n⏸️  Browser will stay open for 60 seconds to inspect...');
    await page.waitForTimeout(60000);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

testSingleSymbol();
