const cheerio = require('cheerio');

/**
 * Parses a catalogue page HTML content to extract book detail URLs and the next page link.
 *
 * @param {string} html - Raw HTML of the catalogue page
 * @param {string} baseUrl - Base URL used for converting relative links to absolute URLs
 * @returns {{ bookUrls: string[], nextUrl: string | null }}
 */
function parseCataloguePage(html, baseUrl) {
  const $ = cheerio.load(html);
  const bookUrls = [];

  $('article.product_pod h3 a').each((_, element) => {
    const href = $(element).attr('href');
    if (href) {
      const absoluteUrl = new URL(href, baseUrl).href;
      bookUrls.push(absoluteUrl);
    }
  });

  const nextHref = $('li.next a, .pager .next a').attr('href');
  const nextUrl = nextHref ? new URL(nextHref, baseUrl).href : null;

  return {
    bookUrls,
    nextUrl,
  };
}

/**
 * Parses a book detail page HTML to extract required book fields.
 *
 * @param {string} html - Raw detail page HTML
 * @param {string} productUrl - Absolute URL of the book product page
 * @param {string} sourcePage - Catalogue page URL where link was discovered
 * @param {string} fetchedAt - Timestamp ISO string when page was fetched
 * @returns {object} Extracted book details with 8 exact keys
 */
function parseBookDetailPage(html, productUrl, sourcePage, fetchedAt) {
  const $ = cheerio.load(html);

  const title = $('div.product_main h1').text().trim();
  const price_text = $('div.product_main p.price_color').text().trim();

  // Availability text: collapse redundant whitespace/newlines
  const rawAvailability = $('div.product_main p.instock.availability').text().trim();
  const availability_text = rawAvailability.replace(/\s+/g, ' ');

  // Rating class string: e.g. "star-rating Three" -> "Three"
  const ratingClass = $('div.product_main p.star-rating').attr('class') || '';
  const rating_text = ratingClass.replace('star-rating', '').trim();

  // Description: element directly after #product_description
  const descEl = $('#product_description').next('p');
  const descriptionText = descEl.length > 0 ? descEl.text().trim() : null;
  const description = descriptionText ? descriptionText : null;

  return {
    title,
    product_url: productUrl,
    price_text,
    availability_text,
    rating_text,
    description,
    source_page: sourcePage,
    fetched_at: fetchedAt,
  };
}

module.exports = {
  parseCataloguePage,
  parseBookDetailPage,
};
