# SHAVDIA

Clothing shop in Georgian. Next.js, Prisma, Postgres, Tailwind.

## Local development

```bash
npm install
cp .env.example .env     # then fill it in
npm run db:start         # local PostgreSQL on port 5433, leave it running
npm run dev              # http://localhost:3030
```

For the local database use `DATABASE_URL="postgres://postgres:postgres@localhost:5433/shavdia?sslmode=disable"`. On a new machine run `npx prisma migrate deploy` once.

## Pages

- `/` home, `/shop` shop with filters, `/product/[slug]` product
- `/admin` admin panel: products, categories, home page banners, site settings

Pages are cached and read from the database when built, so `npm run build` needs a running database with at least one published product. Saving in the admin panel refreshes the cache.

## Importing from the old WooCommerce site

```bash
npm run import:woo
```

Needs `WP_URL`, `WC_CONSUMER_KEY` and `WC_CONSUMER_SECRET`. Safe to re-run. Products are matched by their WooCommerce ID, so a re-run overwrites admin edits to imported products. Empty `importing` placeholders are skipped.

## Photos

Imported photos are in `public/uploads/products`. Photos uploaded in the admin panel go to `UPLOAD_DIR` (default `.data/uploads`), which must be a persistent volume in production.
