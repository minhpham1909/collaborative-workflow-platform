import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url), { chromium } = require(process.env.WORKFLOW_PLAYWRIGHT_MODULE || 'playwright');
const out = fileURLToPath(new URL('../../.local/feedback/', import.meta.url)); await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.WORKFLOW_BROWSER_EXECUTABLE, headless: true }); const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } }); page.setDefaultTimeout(15000); page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://localhost:5173/test-support/feedback-harness.html');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await page.getByRole('button', { name: 'Burst', exact: true }).click(); assert.equal(await page.locator('.system-toast').count(), 1); await page.getByText('3 more updates', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Duplicate', exact: true }).click(); assert.equal(await page.locator('.system-toast').count(), 1);
  await page.getByRole('button', { name: 'Error', exact: true }).click(); await page.getByRole('alert').getByText('Critical error', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Dismiss notification', exact: true }).focus(); await page.waitForTimeout(6500); await page.getByText('Critical error', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Dismiss notification', exact: true }).press('Enter'); assert.equal(await page.locator('.system-toast').count(), 1);
  await page.getByRole('button', { name: 'Open form', exact: true }).click(); await page.getByRole('dialog', { name: 'Fixture form' }).waitFor(); assert.equal(await page.locator('.system-toast').count(), 0);
  await page.getByLabel('Draft', { exact: true }).fill('Draft kept'); await page.getByRole('button', { name: 'Notify inside dialog', exact: true }).click(); await page.waitForTimeout(6500); assert.equal(await page.locator('.system-toast').count(), 0);
  await page.getByRole('button', { name: 'Nested confirm', exact: true }).click(); await page.getByRole('dialog', { name: 'Confirm action', exact: true }).waitFor(); await page.keyboard.press('Escape'); assert.equal(await page.getByLabel('Draft', { exact: true }).inputValue(), 'Draft kept');
  await page.keyboard.press('Tab'); assert.equal(await page.getByRole('dialog', { name: 'Fixture form' }).evaluate(node => node.contains(document.activeElement)), true); await page.getByRole('button', { name: 'Close fixture form', exact: true }).click(); await page.locator('.system-toast').waitFor();
  for (const width of [375,768,1024,1280,1440]) { await page.setViewportSize({ width, height: 900 }); await page.screenshot({ path: out+'/feedback-'+width+'.png', fullPage: true }); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false); assert.equal(await page.locator('.system-toast').count(), 1); }
  await page.getByRole('button', { name: 'Change account fixture', exact: true }).click(); assert.equal(await page.locator('.system-toast').count(), 0);
  await page.getByRole('button', { name: 'Burst', exact: true }).click(); await page.getByRole('button', { name: 'Bottom action', exact: true }).scrollIntoViewIfNeeded(); const bounds = await page.getByRole('button', { name: 'Bottom action', exact: true }).boundingBox(), toast = await page.locator('.system-toast').boundingBox(); assert.ok(bounds.y + bounds.height <= toast.y, 'Bottom action must scroll above feedback');
  await page.mouse.move(toast.x + 30, toast.y + 30); await page.waitForTimeout(6500); assert.equal(await page.locator('.system-toast').count(), 1);
  assert.deepEqual(errors, []); console.log('PASS feedback: one visible/priority/dedup/bounded, focus pause, dialog defer/nested focus/draft, account reset, bottom action and5width; UI fixture only/no API/DB/providers.');
} finally { await browser.close(); }
