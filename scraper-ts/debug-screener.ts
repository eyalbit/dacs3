/**
 * Debug Screener - Check what's on the page
 */

import { chromium } from 'playwright';
import { BarchartLoginSkill } from './src/skills/BarchartLoginSkill';
import * as dotenv from 'dotenv';

dotenv.config();

async function debug() {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 500,
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

    console.log('✅ Logged in successfully');
    console.log('');
    console.log('📍 Navigating to screener...');

    await page.goto(process.env.BARCHART_SCREENER_URL!);
    await page.waitForLoadState('domcontentloaded');

    console.log('✅ Page loaded');
    console.log('');
    console.log('🔍 Looking for buttons...');

    // Get all buttons
    const buttons = await page.$$eval('button', (btns) =>
      btns.map((btn) => ({
        text: btn.textContent?.trim(),
        class: btn.className,
        id: btn.id,
      }))
    );

    console.log('Found buttons:', JSON.stringify(buttons, null, 2));

    console.log('');
    console.log('🔍 Looking for links...');

    // Get all links
    const links = await page.$$eval('a', (links) =>
      links.slice(0, 20).map((link) => ({
        text: link.textContent?.trim(),
        href: link.getAttribute('href'),
        class: link.className,
      }))
    );

    console.log('Found links:', JSON.stringify(links, null, 2));

    console.log('');
    console.log('⏸️  Browser will stay open for 60 seconds...');
    console.log('Check the page manually!');

    await page.waitForTimeout(60000);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

debug();
