# The Polite Scraper

A robust, polite, and modular web scraper built in Node.js for the FlyRank Backend AI Engineering assignment. It dynamically crawls catalogue pages from [Books to Scrape](https://books.toscrape.com/), extracts product detail pages, normalizes data, validates schema compliance using Zod, and implements disk-level caching and retry mechanisms.

---

## Table of Contents
- [Project Purpose](#project-purpose)
- [Target Website](#target-website)
- [Ethical & Politeness Rules](#ethical--politeness-rules)
- [Scraping Scope](#scraping-scope)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [How to Run](#how-to-run)
- [Cache & Persistence Behavior](#cache--persistence-behavior)
- [Normalization Rules](#normalization-rules)
- [Zod Schema & Validation](#zod-schema--validation)
- [Failure Handling & Retry Behavior](#failure-handling--retry-behavior)
- [Output Files & Evidence](#output-files--evidence)
- [Example Output](#example-output)
- [Known Limitations](#known-limitations)

---

## Project Purpose
The purpose of this project is to build an idempotent, fault-tolerant web scraper that extracts book data from a public practice sandbox while adhering strictly to ethical scraping principles, rate-limiting, schema validation, and structured output generation.

---

## Target Website
- **Name**: Books to Scrape
- **Base URL**: `https://books.toscrape.com/`
- **Purpose**: Public scraping practice sandbox

---

## Ethical & Politeness Rules
1. **`robots.txt` Verification**: Inspected `https://books.toscrape.com/robots.txt`. The server returns `404 Not Found` (no custom crawl restrictions are specified).
2. **Politeness Delay**: Enforces a minimum **500 ms delay** between live network requests to prevent server strain.
3. **Descriptive User-Agent**: Sends a custom, descriptive header identifying the scraper:
   `User-Agent: ThePoliteScraper/1.0 (Public Practice Sandbox; +https://books.toscrape.com/)`
4. **Ethical Commitment**:
   > *I will not reuse this code on another site without checking its rules and terms first.*

---

## Scraping Scope
- **Catalogue Scope**: First 3 catalogue pages (followed dynamically via pagination `<li class="next"><a href="...">`).
- **Expected & Discovered Book Count**: Exactly 60 unique books (20 books per page).
- **Target Fields**: `title`, `product_url`, `price_text`, `price_gbp`, `availability_text`, `rating_text`, `description`, `source_page`, `fetched_at`.

---

## Prerequisites
- **Node.js**: `v18.0.0` or higher (tested on `v24.3.0`)
- **npm**: `v9.0.0` or higher

---

## Installation & Setup
Clone the repository and install dependencies:
```bash
npm install
```

*Dependencies installed:*
- `cheerio`: HTML parsing and DOM manipulation.
- `zod`: Strict schema definition and runtime validation.

---

## How to Run

### 1. Standard Production Run
Runs the full pipeline across all 3 catalogue pages and 60 book detail pages:
```bash
npm start
```
*or directly via Node:*
```bash
node src/index.js
```

### 2. Controlled Failure Test Run
Injects a deliberate fake URL (`https://fake-book-url.local/test-failure/index.html`) to test independent failure handling and retry logic without straining the target website:
```bash
npm run test:failure
```

---

## Cache & Persistence Behavior
To minimize network overhead and ensure efficiency across reruns:
- **Catalogue Cache**: `cache/catalogue-page-1.html`, `cache/catalogue-page-2.html`, `cache/catalogue-page-3.html`.
- **Detail Page Cache**: `cache/book-detail-1.html` through `cache/book-detail-60.html`.
- **Persistence Logic**: Before fetching any URL live, the scraper checks if a corresponding HTML file exists on disk.
  - **Cache Hit**: Loaded directly from disk in `< 1ms` (0 network delay).
  - **Cache Miss**: Pauses 500 ms, fetches live HTML, saves to disk, and continues.
- **Rerun Efficiency**: Subsequent runs finish in `~200 ms` by reusing disk cache.

---

## Normalization Rules
1. **Numeric Price Conversion**: Parses raw `price_text` (e.g., `"£51.77"`) to extract numeric float `price_gbp` (`51.77`).
2. **URL Normalization**: Converts all relative links into canonical absolute HTTPS URLs using the WHATWG `URL` API (`new URL(relHref, base).href`).
3. **Whitespace Cleaning**: Normalizes `availability_text` by collapsing extra newlines and tabs (`In stock (22 available)`).
4. **Rating Class Normalization**: Extracts rating string (e.g., `"Three"`) from CSS class `star-rating Three`.
5. **Raw Field Preservation**: Preserves original `price_text`, `availability_text`, `rating_text`, `description`, `source_page`, and `fetched_at`.

---

## Zod Schema & Validation
Every normalized book record is validated before outputting to ensure complete data integrity.

### Zod Schema Definition (`src/schema.js`)
```typescript
const BookSchema = z.object({
  title: z.string().min(1),
  product_url: z.string().url().refine((val) => val.startsWith('https://')),
  price_text: z.string().min(1),
  price_gbp: z.number().positive(),
  availability_text: z.string().min(1),
  rating_text: z.string().min(1),
  description: z.string().nullable(),
  source_page: z.string().url().refine((val) => val.startsWith('https://')),
  fetched_at: z.string().min(1),
});
```

- **Valid Records**: Saved to `output/books.json` (exactly 60 unique records).
- **Invalid Records**: Saved to `output/errors.json` along with issue details.

---

## Failure Handling & Retry Behavior
1. **Isolated Execution**: Each book URL is processed within an independent `try...catch` block so a failure on one page never crashes the execution run.
2. **Automatic Retries**: Timeouts and 5xx server errors are retried **exactly once** after a 500 ms delay.
3. **Non-Retryable Errors**: HTTP 404 (Not Found) and HTTP 403 (Forbidden) errors are **not retried** because they represent deterministic server responses; retrying wastes bandwidth and yields identical errors.
4. **Failure Telemetry**: Any skipped failure is recorded in `output/run-report.json` under `failed_pages`.

---

## Output Files & Evidence
All output artifacts are generated in the `output/` directory:
- `output/books.json`: Validated array of 60 unique normalized book records.
- `output/errors.json`: List of records failing schema validation (empty `[]` on clean run).
- `output/run-report.json`: Comprehensive execution report detailing run time, cache hits, pages fetched, and failures.

---

## Example Output

### Sample Book Record (`output/books.json`)
```json
{
  "title": "A Light in the Attic",
  "product_url": "https://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html",
  "price_text": "£51.77",
  "price_gbp": 51.77,
  "availability_text": "In stock (22 available)",
  "rating_text": "Three",
  "description": "It's a Selection of Poems and Drawings By Shel Silverstein...",
  "source_page": "https://books.toscrape.com/",
  "fetched_at": "2026-08-12T07:04:37.240Z"
}
```

### Sample Run Report (`output/run-report.json`)
```json
{
  "start_time": "2026-08-12T07:11:20.500Z",
  "end_time": "2026-08-12T07:11:20.718Z",
  "duration_ms": 218,
  "pages_fetched": 0,
  "cache_hits": 63,
  "valid_records": 60,
  "invalid_records": 0,
  "failed_pages_count": 0,
  "failed_pages": []
}
```

---

## Known Limitations
- **Static HTML Dependency**: Designed for static server-rendered HTML. Client-side Single Page Applications (SPAs) relying heavily on React/Vue rendering or Cloudflare CAPTCHAs would require headless browser automation (e.g. Playwright/Puppeteer).
