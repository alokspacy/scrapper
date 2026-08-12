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

### How to Run the Scraper
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
