const { getCachedOrFetchPage } = require('./fetcher');
const { parseCataloguePage, parseBookDetailPage } = require('./parser');

const START_URL = 'https://books.toscrape.com/';
const TARGET_CATALOGUE_PAGES = 3;
const REQUIRED_KEYS = [
  'title',
  'product_url',
  'price_text',
  'availability_text',
  'rating_text',
  'description',
  'source_page',
  'fetched_at',
];

async function main() {
  try {
    console.log(`[Stage 3] Starting Stage 3: Book Detail Page Extraction...`);

    // --- Step 1: Discover Book URLs across 3 Catalogue Pages ---
    let currentUrl = START_URL;
    const discoveredBooks = [];
    const uniqueUrlSet = new Set();
    let cataloguePagesProcessed = 0;

    for (let pageNum = 1; pageNum <= TARGET_CATALOGUE_PAGES; pageNum++) {
      if (!currentUrl) break;

      const cacheKey = `catalogue-page-${pageNum}`;
      const pageResult = await getCachedOrFetchPage(currentUrl, cacheKey);
      const { bookUrls, nextUrl } = parseCataloguePage(pageResult.html, currentUrl);

      for (const url of bookUrls) {
        if (!uniqueUrlSet.has(url)) {
          uniqueUrlSet.add(url);
          discoveredBooks.push({
            url,
            sourcePage: currentUrl,
          });
        }
      }

      cataloguePagesProcessed++;
      currentUrl = nextUrl;
    }

    console.log(`Discovered ${discoveredBooks.length} unique book URLs across ${cataloguePagesProcessed} catalogue pages.`);

    // --- Step 2: Extract Details for all 60 Books ---
    const extractedBooks = [];
    let detailPagesCount = 0;
    let cachedReusedCount = 0;

    for (let i = 0; i < discoveredBooks.length; i++) {
      const bookInfo = discoveredBooks[i];
      const detailCacheKey = `book-detail-${i + 1}`;

      const pageResult = await getCachedOrFetchPage(bookInfo.url, detailCacheKey);
      if (pageResult.fromCache) {
        cachedReusedCount++;
      }

      const bookRecord = parseBookDetailPage(
        pageResult.html,
        bookInfo.url,
        bookInfo.sourcePage,
        pageResult.fetchedAt
      );

      extractedBooks.push(bookRecord);
      detailPagesCount++;
    }

    // --- Step 3: Verification & Checkpoint Validation ---
    console.log('\n--- Sample Extracted Raw Book Record ---');
    console.log(JSON.stringify(extractedBooks[0], null, 2));

    // Verify all 60 records contain all 8 exact keys
    const invalidRecords = extractedBooks.filter((record) => {
      const keys = Object.keys(record);
      return keys.length !== REQUIRED_KEYS.length || !REQUIRED_KEYS.every((k) => k in record);
    });

    if (invalidRecords.length > 0) {
      throw new Error(`Validation failed: ${invalidRecords.length} records do not contain all 8 required keys.`);
    }

    console.log('\n=================================');
    console.log('Stage 3 Checkpoint Summary');
    console.log('=================================');
    console.log(`detail_pages=${detailPagesCount}`);
    console.log(`records_validated=${extractedBooks.length}`);
    console.log(`cached_pages_reused=${cachedReusedCount}`);
    console.log('=================================\n');

  } catch (error) {
    console.error(`[Stage 3 Error] ${error.message}`);
    process.exit(1);
  }
}

main();
