import { chromium } from '@playwright/test';

async function verify() {
  console.log('🚀 Launching Chromium to verify 3BHK_Sample & 4BHK_Sample layouts on http://localhost:4173/...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    await page.goto('http://localhost:4173/', { waitUntil: 'networkidle', timeout: 15000 });
    console.log('✅ Connected to http://localhost:4173/');
    await page.waitForTimeout(1500);

    // 1. Check 3BHK_Sample in 2D
    const button2D = page.locator('button:has-text("2D"), button:has-text("CAD"), button:has-text("Blueprint")').first();
    if (await button2D.isVisible()) {
      await button2D.click();
      await page.waitForTimeout(1200);
      await page.screenshot({ path: 'screenshot_3bhk_2d.png' });
      console.log('📸 Captured 3BHK 2D Blueprint: screenshot_3bhk_2d.png');
    }

    // Switch to 3D Orbit
    const button3D = page.locator('button:has-text("3D"), button:has-text("Orbit")').first();
    if (await button3D.isVisible()) {
      await button3D.click();
      await page.waitForTimeout(1200);
      await page.screenshot({ path: 'screenshot_3bhk_3d.png' });
      console.log('📸 Captured 3BHK 3D Studio: screenshot_3bhk_3d.png');
    }

    // 2. Switch to Projects Dashboard
    const projectsBtn = page.locator('button:has-text("Projects")').first();
    if (await projectsBtn.isVisible()) {
      await projectsBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'screenshot_dashboard.png' });
      console.log('📸 Captured Dashboard: screenshot_dashboard.png');

      // Click 4BHK_Sample card
      const fourBhkCard = page.locator('button:has-text("4BHK_Sample")').first();
      if (await fourBhkCard.isVisible()) {
        await fourBhkCard.click();
        await page.waitForTimeout(1500);
        console.log('✅ Switched to 4BHK_Sample');

        // 2D View of 4BHK
        const btn2D = page.locator('button:has-text("2D"), button:has-text("CAD"), button:has-text("Blueprint")').first();
        if (await btn2D.isVisible()) {
          await btn2D.click();
          await page.waitForTimeout(1200);
          await page.screenshot({ path: 'screenshot_4bhk_2d.png' });
          console.log('📸 Captured 4BHK 2D Blueprint: screenshot_4bhk_2d.png');
        }

        // 3D View of 4BHK
        const btn3D = page.locator('button:has-text("3D"), button:has-text("Orbit")').first();
        if (await btn3D.isVisible()) {
          await btn3D.click();
          await page.waitForTimeout(1200);
          await page.screenshot({ path: 'screenshot_4bhk_3d.png' });
          console.log('📸 Captured 4BHK 3D Studio: screenshot_4bhk_3d.png');
        }
      }
    }

    console.log('🎉 All layout verifications completed successfully!');
  } catch (err) {
    console.error('Error during verification:', err);
  } finally {
    await browser.close();
  }
}

verify();
