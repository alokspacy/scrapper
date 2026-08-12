const path = require('path');
const { fetchPage, saveToCache } = require('./fetcher');

const TARGET_URL = 'https://books.toscrape.com/';
const CACHE_FILE_PATH = path.resolve('cache/catalogue-page-1.html');

async function main() {
  try {
    console.log(`[Stage 1] Fetching URL: ${TARGET_URL}...`);
    const result = await fetchPage(TARGET_URL);

    await saveToCache(CACHE_FILE_PATH, result.html);
    const byteLength = Buffer.byteLength(result.html, 'utf-8');

    console.log('\n--- Stage 1 Execution Summary ---');
    console.log(`URL Fetched:     ${TARGET_URL}`);
    console.log(`HTTP Status:     ${result.status} ${result.statusText}`);
    console.log(`Cache File Path: ${CACHE_FILE_PATH}`);
    console.log(`Response Size:   ${byteLength} bytes (${(byteLength / 1024).toFixed(2)} KB)`);
    console.log('---------------------------------\n');
  } catch (error) {
    console.error(`[Stage 1 Error] ${error.message}`);
    process.exit(1);
  }
}

main();
