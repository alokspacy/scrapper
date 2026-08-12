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
