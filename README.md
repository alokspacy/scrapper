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

---

## Stage 3 Documentation

### Detail Page Extraction Details
Stage 3 implements detail page fetching and field extraction (`src/parser.js` and `src/index.js`):
1. **Detail Page Caching & Politeness**: All 60 discovered book detail pages are cached locally under `cache/book-detail-1.html` through `cache/book-detail-60.html`. Requests enforce a minimum 500 ms delay for live requests and reuse cached HTML on subsequent runs.
2. **Field Extraction**: Extracts exactly 8 fields per book using Cheerio:
   - `title`, `product_url`, `price_text`, `availability_text`, `rating_text`, `description`, `source_page`, `fetched_at`.

### Stage 3 Checkpoint Result
```text
detail_pages=60
records_validated=60
cached_pages_reused=60
```

---

## Stage 4 Documentation

### Final Record Schema & Zod Validation
Stage 4 defines strict schema validation using Zod (`src/schema.js`):

```typescript
const BookSchema = z.object({
  title: z.string().min(1),
  product_url: z.string().url().refine(val => val.startsWith('https://')),
  price_text: z.string().min(1),
  price_gbp: z.number().positive(),
  availability_text: z.string().min(1),
  rating_text: z.string().min(1),
  description: z.string().nullable(),
  source_page: z.string().url().refine(val => val.startsWith('https://')),
  fetched_at: z.string().min(1)
});
```

### Normalization Rules
1. **Price Normalization**: Parses `price_text` (e.g., `"£51.77"`) to extract numeric float `price_gbp` (`51.77`).
2. **Raw Preservations**: Keeps original `price_text`, `availability_text`, `rating_text`, `description`, `source_page`, and `fetched_at`.
3. **Canonical URL Identity**: Uses absolute HTTPS `product_url` as the canonical deduplication key.

### Validation & Output Routing
- **Valid Records**: Stored in `output/books.json` (exactly 60 unique records).
- **Invalid Records**: Any record failing Zod validation is logged to `output/errors.json` along with issue details.

### Stage 4 Checkpoint Result
```text
total_processed=60
valid_records=60
invalid_records=0
books_json_count=60
all_prices_numeric=true
all_urls_https=true
```

---

## Stage 5 Documentation

### Independent Failure Handling
Each book URL is processed in an isolated `try...catch` block. A network or parsing error on a single URL will log a warning, record the failure, and allow the remaining books to complete without crashing the application.

### Retry Policy
- **Transient Errors & Timeouts (5xx, AbortError, Network Drop)**: Automatically retried **exactly once** after a 500 ms politeness pause.
- **Why 404 & 403 Are NOT Retried**: HTTP 404 (Not Found) and HTTP 403 (Forbidden) indicate deterministic client/server permissions or resource absences. Retrying immediately will yield the same error while wasting server bandwidth.

### Execution Run Report (`output/run-report.json`)
The run report captures execution telemetry:
- `start_time` & `end_time`: ISO timestamps marking run boundaries.
- `duration_ms`: Total execution time in milliseconds.
- `pages_fetched`: Count of live HTTP page requests made.
- `cache_hits`: Count of pages retrieved directly from disk cache.
- `valid_records`: Count of records passing Zod schema validation (saved in `output/books.json`).
- `invalid_records`: Count of records failing validation (saved in `output/errors.json`).
- `failed_pages_count` & `failed_pages`: Count and detailed array of failed page URLs and their error messages.

### Controlled Failure Test Result (`npm run test:failure`)
When executing with a deliberate controlled fake URL (`npm run test:failure`), the scraper:
1. Attempted to fetch `https://fake-book-url.local/test-failure/index.html`.
2. Retried once after 500 ms on initial failure.
3. Logged the error and recorded `failed_pages_count: 1` in `output/run-report.json`.
4. Successfully outputted all 60 valid records in `output/books.json` without crashing.

### Honest Limitation
This static HTML scraper depends on server-rendered HTML. Sites relying heavily on client-side Single Page Application (SPA) JavaScript rendering or Cloudflare CAPTCHA challenges are out of scope for pure HTTP fetchers and would require headless browser automation (Playwright/Puppeteer).

---

## How to Run the Scraper
Run standard scraper:
```bash
npm start
```

Run controlled failure test:
```bash
npm run test:failure
```

---

## Compliance & Terms
I will not reuse this code on another site without checking its rules and terms first.
