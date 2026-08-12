const { z } = require('zod');

/**
 * Zod schema defining the required structure and validation rules for a normalized book record.
 */
const BookSchema = z.object({
  title: z.string().min(1, 'Title must not be empty'),
  product_url: z
    .string()
    .url('Must be a valid URL')
    .refine((val) => val.startsWith('https://'), {
      message: 'product_url must start with https://',
    }),
  price_text: z.string().min(1, 'price_text must not be empty'),
  price_gbp: z.number().positive('price_gbp must be a positive number'),
  availability_text: z.string().min(1, 'availability_text must not be empty'),
  rating_text: z.string().min(1, 'rating_text must not be empty'),
  description: z.string().nullable(),
  source_page: z
    .string()
    .url('Must be a valid URL')
    .refine((val) => val.startsWith('https://'), {
      message: 'source_page must start with https://',
    }),
  fetched_at: z.string().min(1, 'fetched_at must not be empty'),
});

/**
 * Normalizes a raw book record by extracting numeric price_gbp from price_text.
 *
 * @param {object} rawBook - Raw record from Stage 3
 * @returns {object} Normalized book record
 */
function normalizeBookRecord(rawBook) {
  const priceMatch = rawBook && rawBook.price_text ? rawBook.price_text.match(/(\d+\.\d+)/) : null;
  const price_gbp = priceMatch ? parseFloat(priceMatch[1]) : NaN;

  return {
    title: rawBook.title,
    product_url: rawBook.product_url,
    price_text: rawBook.price_text,
    price_gbp,
    availability_text: rawBook.availability_text,
    rating_text: rawBook.rating_text,
    description: rawBook.description,
    source_page: rawBook.source_page,
    fetched_at: rawBook.fetched_at,
  };
}

module.exports = {
  BookSchema,
  normalizeBookRecord,
};
