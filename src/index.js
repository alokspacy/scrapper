const fs = require('fs/promises');
const path = require('path');
const { getCachedOrFetchPage } = require('./fetcher');
const { parseCataloguePage, parseBookDetailPage } = require('./parser');
const { BookSchema, normalizeBookRecord } = require('./schema');

const START_URL = 'https://books.toscrape.com/';
const TARGET_CATALOGUE_PAGES = 3;
const BOOKS_JSON_PATH = path.resolve('output/books.json');
const ERRORS_JSON_PATH = path.resolve('output/errors.json');

async function main() {
  try {
    console.log(`[Stage 4] Starting Scraper & Stage 4 Record Validation...`);

    // --- Step 1: Discover Book URLs across 3 Catalogue Pages ---
    let currentUrl = START_URL;
    const discoveredBooks = [];
    const uniqueUrlSet = new Set();

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

      currentUrl = nextUrl;
    }

    console.log(`Discovered ${discoveredBooks.length} unique book URLs.`);

    // --- Step 2: Extract & Normalize Detail Records ---
    const validBooksMap = new Map(); // product_url -> record (canonical deduplication)
    const invalidRecords = [];

    for (let i = 0; i < discoveredBooks.length; i++) {
      const bookInfo = discoveredBooks[i];
      const detailCacheKey = `book-detail-${i + 1}`;

      const pageResult = await getCachedOrFetchPage(bookInfo.url, detailCacheKey);
      const rawRecord = parseBookDetailPage(
        pageResult.html,
        bookInfo.url,
        bookInfo.sourcePage,
        pageResult.fetchedAt
      );

      const normalizedRecord = normalizeBookRecord(rawRecord);

      // Validate with Zod
      const validationResult = BookSchema.safeParse(normalizedRecord);

      if (validationResult.success) {
        validBooksMap.set(normalizedRecord.product_url, validationResult.data);
      } else {
        invalidRecords.push({
          record: normalizedRecord,
          errors: validationResult.error.issues,
        });
      }
    }

    const validBooks = Array.from(validBooksMap.values());

    // --- Step 3: Write Output Files Idempotently ---
    const outputDir = path.resolve('output');
    await fs.mkdir(outputDir, { recursive: true });

    await fs.writeFile(BOOKS_JSON_PATH, JSON.stringify(validBooks, null, 2), 'utf-8');
    await fs.writeFile(ERRORS_JSON_PATH, JSON.stringify(invalidRecords, null, 2), 'utf-8');

    // --- Step 4: Verification Checks ---
    const allPricesNumeric = validBooks.every(
      (b) => typeof b.price_gbp === 'number' && !isNaN(b.price_gbp) && b.price_gbp > 0
    );
    const allUrlsHttps = validBooks.every((b) => b.product_url.startsWith('https://'));

    console.log('\n=================================');
    console.log('Stage 4 Checkpoint Summary');
    console.log('=================================');
    console.log(`total_processed=${discoveredBooks.length}`);
    console.log(`valid_records=${validBooks.length}`);
    console.log(`invalid_records=${invalidRecords.length}`);
    console.log(`books_json_count=${validBooks.length}`);
    console.log(`all_prices_numeric=${allPricesNumeric}`);
    console.log(`all_urls_https=${allUrlsHttps}`);
    console.log('=================================\n');

    if (validBooks.length !== 60) {
      throw new Error(`Expected exactly 60 valid records in books.json, found ${validBooks.length}`);
    }
    if (!allPricesNumeric) {
      throw new Error('Validation failed: Not all price_gbp values are numeric numbers.');
    }
    if (!allUrlsHttps) {
      throw new Error('Validation failed: Not all product_url values start with https://');
    }

  } catch (error) {
    console.error(`[Stage 4 Error] ${error.message}`);
    process.exit(1);
  }
}

main();
