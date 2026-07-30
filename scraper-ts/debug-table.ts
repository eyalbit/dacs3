/**
 * Debug - Find tables on page
 */

import { chromium } from 'playwright';
import { BarchartLoginSkill } from './src/skills/BarchartLoginSkill';
import * as dotenv from 'dotenv';

dotenv.config();

async function debug() {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 1000,
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });

  const page = await context.newPage();

  try {
    console.log('🔐 Logging in...');

    const loginSkill = new BarchartLoginSkill(page, {
      email: process.env.BARCHART_EMAIL!,
      password: process.env.BARCHART_PASSWORD!,
      loginUrl: process.env.BARCHART_LOGIN_URL!,
    });

    await loginSkill.execute();
    console.log('✅ Logged in');

    console.log('📍 Navigating to screener...');
    await page.goto(process.env.BARCHART_SCREENER_URL!);
    await page.waitForLoadState('networkidle', { timeout: 60000 });

    console.log('✅ Page loaded');
    console.log('');

    // Wait a bit for Angular to render
    await page.waitForTimeout(5000);

    console.log('🔍 Looking for tables...');
    const tables = await page.$$('table');
    console.log(`Found ${tables.length} tables`);

    for (let i = 0; i < tables.length; i++) {
      const table = tables[i];
      const className = await table.getAttribute('class');
      const id = await table.getAttribute('id');
      const rowCount = await table.$$eval('tr', (rows) => rows.length);

      console.log(`\nTable ${i + 1}:`);
      console.log(`  Class: ${className}`);
      console.log(`  ID: ${id}`);
      console.log(`  Rows: ${rowCount}`);

      if (rowCount > 1) {
        // Get first few cells
        const cells = await table.$$eval('tr:first-child td, tr:first-child th', (cells) =>
          cells.map((c) => c.textContent?.trim())
        );
        console.log(`  First row: ${cells.join(' | ')}`);
      }
    }

    console.log('');
    console.log('🔍 Looking for divs with "screener" in class...');
    const screenerDivs = await page.$$eval('[class*="screener"]', (divs) =>
      divs.slice(0, 10).map((div) => ({
        class: div.className,
        tag: div.tagName,
      }))
    );
    console.log(JSON.stringify(screenerDivs, null, 2));

    console.log('');
    console.log('⏸️  Browser will stay open for 120 seconds...');
    console.log('📸 Take a screenshot if needed!');

    await page.waitForTimeout(120000);
  } catch (error) {
    console.error('Error:', error);
    await page.screenshot({ path: 'error-screener.png', fullPage: true });
    console.log('Screenshot saved: error-screener.png');
  } finally {
    await browser.close();
  }
}

debug();
