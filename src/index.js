const fs = require('fs/promises');
const path = require('path');
const { getCachedOrFetchPage } = require('./fetcher');
const { parseCataloguePage, parseBookDetailPage } = require('./parser');
const { BookSchema, normalizeBookRecord } = require('./schema');

const START_URL = 'https://books.toscrape.com/';
const TARGET_CATALOGUE_PAGES = 3;
const BOOKS_JSON_PATH = path.resolve('output/books.json');
const ERRORS_JSON_PATH = path.resolve('output/errors.json');
const RUN_REPORT_PATH = path.resolve('output/run-report.json');

async function main() {
  const startTime = new Date();
  const testFailureMode = process.argv.includes('--test-failure') || process.env.TEST_FAILURE === 'true';

  let pagesFetched = 0;
  let cacheHits = 0;
  const failedPages = [];

  try {
    console.log(`[Stage 5] Starting Scraper (Failure Test Mode: ${testFailureMode ? 'ON' : 'OFF'})...`);

    // --- Step 1: Discover Book URLs across 3 Catalogue Pages ---
    let currentUrl = START_URL;
    const discoveredBooks = [];
    const uniqueUrlSet = new Set();

    for (let pageNum = 1; pageNum <= TARGET_CATALOGUE_PAGES; pageNum++) {
      if (!currentUrl) break;

      const cacheKey = `catalogue-page-${pageNum}`;
      const pageResult = await getCachedOrFetchPage(currentUrl, cacheKey);

      if (pageResult.fromCache) {
        cacheHits++;
      } else {
        pagesFetched++;
      }

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

    // Inject deliberate fake URL ONLY if failure test mode is explicitly enabled
    if (testFailureMode) {
      console.log('[Stage 5 Test] Injecting controlled fake book URL for failure handling test...');
      discoveredBooks.push({
        url: 'https://fake-book-url.local/test-failure/index.html',
        sourcePage: START_URL,
      });
    }

    console.log(`Discovered ${discoveredBooks.length} target book URLs.`);

    // --- Step 2: Extract, Normalize & Validate Each Book Independently ---
    const validBooksMap = new Map();
    const invalidRecords = [];

    for (let i = 0; i < discoveredBooks.length; i++) {
      const bookInfo = discoveredBooks[i];
      const detailCacheKey = `book-detail-${i + 1}`;

      try {
        const pageResult = await getCachedOrFetchPage(bookInfo.url, detailCacheKey);

        if (pageResult.fromCache) {
          cacheHits++;
        } else {
          pagesFetched++;
        }

        const rawRecord = parseBookDetailPage(
          pageResult.html,
          bookInfo.url,
          bookInfo.sourcePage,
          pageResult.fetchedAt
        );

        const normalizedRecord = normalizeBookRecord(rawRecord);
        const validationResult = BookSchema.safeParse(normalizedRecord);

        if (validationResult.success) {
          validBooksMap.set(normalizedRecord.product_url, validationResult.data);
        } else {
          invalidRecords.push({
            record: normalizedRecord,
            errors: validationResult.error.issues,
          });
        }
      } catch (error) {
        console.warn(`[Stage 5 Warning] Skipped failed page (${bookInfo.url}): ${error.message}`);
        failedPages.push({
          url: bookInfo.url,
          error: error.message,
        });
      }
    }

    const validBooks = Array.from(validBooksMap.values());
    const endTime = new Date();
    const durationMs = endTime.getTime() - startTime.getTime();

    // --- Step 3: Write Output Files ---
    const outputDir = path.resolve('output');
    await fs.mkdir(outputDir, { recursive: true });

    await fs.writeFile(BOOKS_JSON_PATH, JSON.stringify(validBooks, null, 2), 'utf-8');
    await fs.writeFile(ERRORS_JSON_PATH, JSON.stringify(invalidRecords, null, 2), 'utf-8');

    const runReport = {
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      duration_ms: durationMs,
      pages_fetched: pagesFetched,
      cache_hits: cacheHits,
      valid_records: validBooks.length,
      invalid_records: invalidRecords.length,
      failed_pages_count: failedPages.length,
      failed_pages: failedPages,
    };

    await fs.writeFile(RUN_REPORT_PATH, JSON.stringify(runReport, null, 2), 'utf-8');

    console.log('\n=================================');
    console.log('Stage 5 Checkpoint Summary');
    console.log('=================================');
    console.log(`pages_fetched=${pagesFetched}`);
    console.log(`cache_hits=${cacheHits}`);
    console.log(`valid_records=${validBooks.length}`);
    console.log(`invalid_records=${invalidRecords.length}`);
    console.log(`failed_pages_count=${failedPages.length}`);
    console.log(`duration_ms=${durationMs}`);
    console.log('=================================\n');

  } catch (error) {
    console.error(`[Stage 5 Error] Fatal execution error: ${error.message}`);
    process.exit(1);
  }
}

main();
