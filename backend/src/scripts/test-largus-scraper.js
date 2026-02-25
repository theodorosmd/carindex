/**
 * Quick test: run L'Argus scraper and print sample results (no DB)
 */
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

async function scrapeSample() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
    'Referer': 'https://occasion.largus.fr/'
  });
  await page.goto('https://occasion.largus.fr/auto/?npp=15', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise((r) => setTimeout(r, 2000));

  const items = await page.evaluate((baseUrl) => {
    const results = [];
    const cards = document.querySelectorAll('.list-group-item.result');
    cards.forEach((card) => {
      const link = card.querySelector('a.main-link[href*="annonce-"]') || card.querySelector('a[href*="annonce-"]');
      if (!link) return;
      const href = link.href || (link.getAttribute('href') || '').replace(/^\//, baseUrl + '/');
      if (!href || !href.includes('annonce-')) return;
      const id = link.getAttribute('data-annonceid') || (href.match(/annonce-([a-f0-9]+)_/i) || [])[1];
      if (!id) return;
      const brand = link.getAttribute('data-marque');
      const model = link.getAttribute('data-modele');
      const title = (brand && model) ? `${brand} ${model}` : (card.querySelector('h3.title-model')?.textContent?.trim() || '');
      const prixEl = card.querySelector('.prix');
      const priceMatch = (prixEl?.textContent || '').match(/(\d{1,3}(?:\s?\d{3})*)/);
      const lis = Array.from(card.querySelectorAll('li')).map((li) => li.textContent?.trim()).filter(Boolean);
      let mileage = null, year = null, fuel = null, location = null;
      for (const t of lis) {
        if (/^\d{1,3}\s?\d{3}\s?km/i.test(t)) mileage = t.replace(/\s/g, '').replace(/km/i, '') + ' km';
        else if (/^\d{4}$/.test(t)) year = t;
        else if (/essence|diesel|hybride|electrique|electric|gaz/i.test(t)) fuel = t;
        else location = t;
      }
      results.push({ title, url: href, id, price: priceMatch ? priceMatch[1].replace(/\s/g, '') + ' €' : null, mileage, year, fuel, location });
    });
    return results;
  }, 'https://occasion.largus.fr');

  await browser.close();
  return items;
}

scrapeSample().then((items) => {
  console.log('\n📋 Résultats du scraper L\'Argus (occasion.largus.fr)\n');
  console.log(`Total: ${items.length} annonces extraites\n`);
  items.slice(0, 8).forEach((item, i) => {
    console.log(`${i + 1}. ${item.title}`);
    const km = item.mileage ? (String(item.mileage).includes('km') ? item.mileage : item.mileage + ' km') : '-';
    console.log(`   💶 ${item.price || '-'}  |  📅 ${item.year || '-'}  |  🛣️ ${km}  |  ⛽ ${item.fuel || '-'}`);
    console.log(`   📍 ${item.location || '-'}`);
    console.log(`   🔗 ${item.url}\n`);
  });
  if (items.length > 8) {
    console.log(`... et ${items.length - 8} autres annonces.\n`);
  }
}).catch((e) => {
  console.error('Erreur:', e.message);
  process.exit(1);
});
