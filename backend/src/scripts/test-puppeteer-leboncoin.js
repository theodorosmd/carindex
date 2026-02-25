#!/usr/bin/env node

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const searchUrl = 'https://www.leboncoin.fr/recherche?category=2&text=BMW+i4&regions=13,30,34,06,83,84&sort=time&order=desc';

async function testPuppeteer() {
  let browser = null;
  try {
    console.log('Launching browser...');
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
    });
    
    // Handle page errors
    page.on('error', (err) => {
      console.error('Page error:', err.message);
    });
    
    page.on('pageerror', (err) => {
      console.error('Page error:', err.message);
    });
    
    console.log('Navigating to:', searchUrl);
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    
    console.log('Waiting for content...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Scroll to trigger lazy loading
    try {
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight / 2);
      });
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (e) {
      console.warn('Scroll error (ignored):', e.message);
    }
    
    // Take a screenshot
    try {
      await page.screenshot({ path: 'leboncoin-debug.png', fullPage: true });
      console.log('Screenshot saved to leboncoin-debug.png');
    } catch (e) {
      console.warn('Screenshot error (ignored):', e.message);
    }
    
    // Analyze the page structure - retry if frame is detached
    let pageInfo;
    let retries = 3;
    while (retries > 0) {
      try {
        pageInfo = await page.evaluate(() => {
      const info = {
        title: document.title,
        url: window.location.href,
        bodyText: document.body.innerText.substring(0, 500),
        allLinks: Array.from(document.querySelectorAll('a[href*="/ad/"]')).length,
        testIdAds: Array.from(document.querySelectorAll('[data-test-id="ad"]')).length,
        qaIdContainers: Array.from(document.querySelectorAll('[data-qa-id="aditem_container"]')).length,
        anyAdLinks: Array.from(document.querySelectorAll('a[href*="/ad/"]')).slice(0, 5).map(a => ({
          href: a.href,
          text: a.textContent?.trim().substring(0, 50)
        }))
      };
          return info;
        });
        break; // Success
      } catch (e) {
        retries--;
        if (e.message.includes('detached')) {
          console.warn(`Frame detached, retrying... (${retries} retries left)`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          // Try to get the page again
          const pages = await browser.pages();
          if (pages.length > 0) {
            page = pages[0];
          }
        } else {
          throw e;
        }
      }
    }
    
    if (!pageInfo) {
      console.error('Failed to get page info after retries');
      return;
    }
    
    console.log('\n=== PAGE ANALYSIS ===');
    console.log('Title:', pageInfo.title);
    console.log('URL:', pageInfo.url);
    console.log('Links to /ad/:', pageInfo.allLinks);
    console.log('[data-test-id="ad"] elements:', pageInfo.testIdAds);
    console.log('[data-qa-id="aditem_container"] elements:', pageInfo.qaIdContainers);
    console.log('\nFirst 5 ad links:');
    pageInfo.anyAdLinks.forEach((link, i) => {
      console.log(`  ${i + 1}. ${link.href}`);
      console.log(`     Text: ${link.text}`);
    });
    
    console.log('\n=== BODY TEXT (first 500 chars) ===');
    console.log(pageInfo.bodyText);
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    if (browser) {
      console.log('\nClosing browser...');
      await browser.close();
    }
  }
}

testPuppeteer();
