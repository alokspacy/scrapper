# The Polite Scraper - Stage 0

## Project Details
- **target**: Books to Scrape
- **purpose**: public scraping practice sandbox
- **scope**: first 3 catalogue pages
- **expected scope**: 60 unique books
- **future fields**: title, product_url, price_text, availability_text, rating_text, description, source_page, fetched_at

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

## Compliance & Terms
I will not reuse this code on another site without checking its rules and terms first.
