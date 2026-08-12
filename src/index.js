const { getCachedOrFetchPage } = require('./fetcher');
const { parseCataloguePage } = require('./parser');

const START_URL = 'https://books.toscrape.com/';
const TARGET_PAGE_COUNT = 3;

async function main() {
  try {
    console.log(`[Stage 2] Starting catalogue discovery for ${TARGET_PAGE_COUNT} pages...`);

    let currentUrl = START_URL;
    const discoveredBookUrls = [];
    const uniqueUrlSet = new Set();
    let pagesProcessed = 0;

    for (let pageNum = 1; pageNum <= TARGET_PAGE_COUNT; pageNum++) {
      if (!currentUrl) {
        console.warn(`[Stage 2 Warning] No next page URL found at page ${pageNum}`);
        break;
      }

      console.log(`\n--- Processing Catalogue Page ${pageNum} ---`);
      console.log(`URL: ${currentUrl}`);

      const pageResult = await getCachedOrFetchPage(currentUrl, pageNum);
      console.log(`Source: ${pageResult.fromCache ? 'Cache (' + pageResult.cachePath + ')' : 'Live Fetch'}`);

      const { bookUrls, nextUrl } = parseCataloguePage(pageResult.html, currentUrl);
      console.log(`Book URLs found on page ${pageNum}: ${bookUrls.length}`);

      for (const url of bookUrls) {
        discoveredBookUrls.push(url);
        uniqueUrlSet.add(url);
      }

      pagesProcessed++;
      currentUrl = nextUrl;
    }

    console.log('\n=================================');
    console.log('Catalogue Discovery Summary');
    console.log('=================================');
    console.log(`catalogue_pages=${pagesProcessed}`);
    console.log(`discovered=${discoveredBookUrls.length}`);
    console.log(`unique_urls=${uniqueUrlSet.size}`);
    console.log('=================================\n');

  } catch (error) {
    console.error(`[Stage 2 Error] ${error.message}`);
    process.exit(1);
  }
}

main();
