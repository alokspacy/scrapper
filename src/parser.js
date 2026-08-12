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

  // Extract all book detail page links from article.product_pod
  $('article.product_pod h3 a').each((_, element) => {
    const href = $(element).attr('href');
    if (href) {
      const absoluteUrl = new URL(href, baseUrl).href;
      bookUrls.push(absoluteUrl);
    }
  });

  // Extract next page relative link if available (e.g. <li class="next"><a href="...">)
  const nextHref = $('li.next a, .pager .next a').attr('href');
  const nextUrl = nextHref ? new URL(nextHref, baseUrl).href : null;

  return {
    bookUrls,
    nextUrl,
  };
}

module.exports = {
  parseCataloguePage,
};
