# The Polite Scraper

## Project Details
- **target**: Books to Scrape
- **purpose**: public scraping practice sandbox
- **scope**: first 3 catalogue pages
- **expected scope**: 60 unique books
- **future fields**: title, product_url, price_text, availability_text, rating_text, description, source_page, fetched_at

---

## Stage 0 Verification Result

### Target Site Verification
- **URL**: https://books.toscrape.com/
- **HTTP Status**: `200 OK`
- **Status**: Verified reachable.

### `robots.txt` Verification Result
- **URL**: https://books.toscrape.com/robots.txt
- **HTTP Status**: `404 Not Found`
- **Actual Content Returned**:
```html
<html>
<head><title>404 Not Found</title></head>
<body>
<center><h1>404 Not Found</h1></center>
<hr><center>nginx/1.21.6</center>
</body>
</html>
```
- **Note**: The file does not exist on the target server (HTTP 404).

---

## Stage 1 Documentation

### Page Fetching Details
Stage 1 implements a modular, reusable HTTP fetcher (`src/fetcher.js`) that:
1. Makes an HTTP `GET` request using Node.js native `fetch`.
2. Sends a custom, descriptive `User-Agent` header.
3. Configures a request timeout (10,000 ms) using `AbortController`.
4. Checks response status (`response.ok`) and throws an explicit error for non-2xx status codes.
5. Saves the exact raw HTML response directly to local disk cache.

### Stage 1 Execution Parameters
- **URL Fetched**: `https://books.toscrape.com/`
- **User-Agent Used**: `ThePoliteScraper/1.0 (Public Practice Sandbox; +https://books.toscrape.com/)`
- **Cached HTML Storage Path**: `cache/catalogue-page-1.html`
- **Raw HTML Cache Confirmation**: Confirmed. `cache/catalogue-page-1.html` exists and contains 51,294 bytes (50.09 KB) of raw HTML.

---

## Stage 2 Documentation

### Catalogue Discovery Details
Stage 2 implements dynamic catalogue page discovery (`src/parser.js` and `src/index.js`):
1. **HTML Parsing via Cheerio**: Each catalogue page is parsed with Cheerio to extract book detail links from `article.product_pod h3 a`.
2. **Dynamic Pagination via Next Link**: The scraper dynamically follows the target site's own `<li class="next"><a href="...">` link to navigate from page to page (Page 1 -> Page 2 -> Page 3). No book or page URLs are hardcoded.
3. **URL Normalization**: All relative links are converted to absolute HTTPS URLs using the WHATWG `URL` API (`new URL(href, currentUrl).href`), eliminating duplicate or relative path ambiguities.
4. **Caching & Politeness Delay**:
   - Cached pages (`cache/catalogue-page-1.html`, `cache/catalogue-page-2.html`, `cache/catalogue-page-3.html`) read directly from disk.
   - Any live HTTP request enforces a minimum politeness delay of 500 ms before dispatching.

### Stage 2 Checkpoint Result
```text
catalogue_pages=3
discovered=60
unique_urls=60
```
- **Catalogue Pages Processed**: 3
- **Total Book URLs Discovered**: 60
- **Unique Book URLs**: 60

---

## Stage 3 Documentation

### Detail Page Extraction Details
Stage 3 implements detail page fetching and field extraction (`src/parser.js` and `src/index.js`):
1. **Detail Page Caching & Politeness**: All 60 discovered book detail pages are cached locally under `cache/book-detail-1.html` through `cache/book-detail-60.html`. Requests enforce a minimum 500 ms delay for live requests and reuse cached HTML on subsequent runs.
2. **Field Extraction**: Extracts exactly 8 fields per book using Cheerio:
   - `title`: Extracted raw from `div.product_main h1`.
   - `product_url`: Absolute product URL.
   - `price_text`: Extracted raw from `div.product_main p.price_color`.
   - `availability_text`: Extracted raw from `div.product_main p.instock.availability`.
   - `rating_text`: Extracted raw rating class name (e.g. `"Three"`).
   - `description`: Text from `#product_description + p` (or `null` if missing).
   - `source_page`: Catalogue URL where book was discovered.
   - `fetched_at`: ISO timestamp of when the page was fetched or cached.
3. **Data Integrity & Validation**: Every extracted record is validated to ensure all 8 keys exist with no invented data.

### Stage 3 Checkpoint Result
```text
detail_pages=60
records_validated=60
cached_pages_reused=60
```

### Sample Extracted Record
```json
{
  "title": "A Light in the Attic",
  "product_url": "https://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html",
  "price_text": "£51.77",
  "availability_text": "In stock (22 available)",
  "rating_text": "Three",
  "description": "It's a Selection of Poems and Drawings By Shel Silverstein. It covers various topics from funny to dark. It has 176 pages and was published in 1981.",
  "source_page": "https://books.toscrape.com/",
  "fetched_at": "2026-08-12T07:04:36.439Z"
}
```

---

## How to Run the Scraper
Run the scraper using:
```bash
npm start
```
or
```bash
node src/index.js
```

---

## Compliance & Terms
I will not reuse this code on another site without checking its rules and terms first.
