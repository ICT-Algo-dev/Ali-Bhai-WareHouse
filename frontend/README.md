# Warehouse & Fulfilment Website

A responsive React 18 + Vite frontend for a third-party warehousing and fulfilment provider based in the United Kingdom. This is not a courier company: the service covers inventory, storage and order preparation, with dispatch handed to the carrier selected for an order.

## Run locally

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and set `VITE_API_BASE_URL` to the backend origin, without an `/api/v1` suffix.
3. Replace the business detail placeholders in `src/lib/constants.js` with client-approved UK contact details and, once confirmed, a location-specific `MAP_EMBED_URL`.
4. Start the development server with `npm run dev`.

Run `npm run build` to create the production bundle, or `npm run preview` to serve that bundle locally.

## Business details and images

Phone, email, address, opening hours and map settings live in `src/lib/constants.js` and are clearly marked as placeholders. Replace them with verified details before launch. The hero, warehouse and packing images are illustrative Unsplash URLs; replace them with approved local brand photography and preserve meaningful alt text and image dimensions.

Testimonials are deliberately labelled sample content and must be replaced with approved customer testimonials before publishing. Carrier names are text-only dispatch examples, not endorsements or claims of official partnership.

## Forms and backend integration

The shared Axios client in `src/lib/api.js` sends requests to `${VITE_API_BASE_URL}/api/v1`:

- `POST /contact`
- `POST /quotes`

Both forms use React Hook Form and Zod validation, UK phone number validation with `libphonenumber-js` and normalise phone numbers to `+44` E.164 format before submission. They include the required `website` honeypot as an empty string and the required contact consent as `consent: true`. Backend field errors are mapped to matching fields, and HTTP 429 responses receive a friendly rate-limit message.

The contact and quote form payloads otherwise follow the backend contract. Quote inventory volume choices use pallets and cubic metres.

## Privacy and cookies

The Privacy Policy, Cookie Policy and Terms routes are draft pages and require review by the client's legal adviser before publication. No analytics or non-essential cookies are currently loaded. The cookie banner stores only the visitor's preference in browser storage.

## Project structure

```text
src/
  components/
    layout/       Navbar, Footer, CookieConsentBanner, ScrollToTop
    sections/     Home sections and contact/quote forms
    ui/           Reusable buttons, fields, cards, feedback and SEO
  lib/            API client, schemas, business and service constants
  pages/          Home, Services, HowItWorks, About, Contact, GetQuote, InventoryIntake, legal pages, NotFound
```

Routes are lazy-loaded. Per-page titles, descriptions, Open Graph metadata and UK-focused organisation JSON-LD are set with `react-helmet-async`.

## Inventory intake

The public, `noindex` inventory intake wizard is available at `/inventory-intake`. It collects customer details and up to 100 products, supports uniform-carton and per-box packing details, validates UK telephone numbers and product data, and saves an in-progress draft only in `sessionStorage`. Contact and quote forms and their payloads are unchanged.

The frontend sends `POST /api/v1/intakes` with the customer fields, products, `additionalInstructions`, `consent: true` and an empty `website` honeypot. Phone numbers are normalised to UK international format. Product submissions include the category and packing mode slug; individual carton rows also include an automatically assigned `boxNumber`.

The success response is expected to return the intake reference, `pdfToken`, server-calculated totals and per-product totals. The public PDF button requests `GET /api/v1/intakes/:reference/pdf` with the short-lived token in the Authorization header; the token is kept in memory only and is never added to a URL. An expired token is not persisted and the visitor is asked to contact the warehouse team.

The protected admin dashboard has an **Intakes** section at `/admin/intakes` and detail pages at `/admin/intakes/:id`. It uses:

- `GET /api/v1/admin/intakes?page=&limit=&status=&search=`
- `GET /api/v1/admin/intakes/:id`
- `PATCH /api/v1/admin/intakes/:id/status` with `{ "status": "submitted|under-review|received|closed" }`
- `DELETE /api/v1/admin/intakes/:id`
- `GET /api/v1/admin/intakes/:id/pdf` for an authenticated PDF download

The intake endpoints must return the submitted consent timestamp, customer and product data, technical IP/user-agent fields if available, and server-calculated totals. The list response should follow the existing paginated admin response convention (`data.intakes` or `data.items`, with pagination metadata). The frontend does not calculate the authoritative submitted totals; its pre-submit values are estimates for warehouse confirmation.

No additional package was required for this feature; it uses the project's existing React Hook Form, Zod, `libphonenumber-js`, Axios and Lucide dependencies.

### Product declarations and dangerous-goods verification

The public intake wizard collects customer-declared dangerous-goods status, hazard types, SDS status, applicable UN/classification and battery details, storage and handling requirements, Amazon details, and requested services. Fields that do not apply to a product are omitted from its payload; non-hazmat products send `sdsStatus: "not-required"`. The server should calculate final totals and set `requiresDgReview` in the success response when any item needs warehouse review.

The admin intake list optionally filters with the non-empty `requiresDgReview=true|false` query parameter and shows the server's `requiresDgReview` result. The product verification form sends:

```json
{
  "status": "pending",
  "sdsVerification": "not-reviewed",
  "finalClassification": {
    "outcome": "not-classified",
    "classification": "",
    "unNumber": "",
    "hazardClass": "",
    "packingGroup": ""
  },
  "notes": ""
}
```

to `PATCH /api/v1/admin/intakes/:id/products/:productId/verification`. The backend should return the saved product verification, including read-only `verifiedBy` and `verifiedAt` values and its audit entries. The frontend displays audit timestamps in `Europe/London` and requests confirmation before saving the `dangerous-goods-rejected` status.

### Intake file uploads

The public intake sends the JSON intake first, then uploads each selected file separately to `POST /api/v1/intakes/:reference/files` as multipart fields `kind`, `sku` and `file`, authenticated with the response's short-lived `uploadToken`. The intake response must also return `uploadTokenExpiresAt`. Both values remain in browser memory only. Files themselves are never included in session-storage drafts; visitors must keep the tab open to finish or retry uploads. Uploads run three at a time, retry a transient failure once, and report individual outcomes.

The interface enforces PDF-only label/barcode kinds, PDF/JPG/PNG document kinds, 10 MB per file, 20 files per product, 200 files per intake and 150 MB total. The backend must independently validate the content and file signature (magic bytes), and return `documentsStatus` as `complete` or `incomplete`.

The authenticated admin file actions use these routes:

- `GET /api/v1/admin/intakes/:id/files/:fileId` for viewing or downloading an individual file (return the original filename in `Content-Disposition`)
- `GET /api/v1/admin/intakes/:id/files.zip` for a ZIP archive of all intake files
- `DELETE /api/v1/admin/intakes/:id/files/:fileId` to remove one file

The intake detail response should include each file's identifier, kind, original filename, byte size and upload timestamp, grouped on the product or intake record. It should include the related file-upload audit entries. The files filter uses `documentsStatus=complete|incomplete`; empty filters are omitted from requests.

## Admin dashboard

The separate admin interface is available at `/admin/login`. Admin credentials are authenticated by the backend; the frontend does not contain or set an admin password. After successful login the JWT is held in memory and `sessionStorage` (not `localStorage`), and is removed when signing out or after an API `401`. Inquiry list, status, detail and delete actions use the protected admin API endpoints. Dates are formatted for `en-GB` and the `Europe/London` time zone.

The dashboard expects the paginated list response to include an inquiry array (`data.inquiries`, `data.items`, or a `data` array) and, where available, pagination metadata (`total`, `totalPages`, `page`, `limit`). Each inquiry should include an `id` and its submitted fields. The admin interface uses the documented login, list, status and delete API endpoints; it does not assume a separate inquiry-detail endpoint.

### Backend administrator password hash

Set `ADMIN_PASSWORD_HASH` only in the backend's secret environment configuration. Generate the hash on the backend using the same password-hashing library and parameters configured by that service. For a backend that uses the `bcrypt` Node package, run this in the backend environment (never in this frontend project):

```powershell
$env:ADMIN_PASSWORD = Read-Host "Administrator password"
node -e "require('bcrypt').hash(process.env.ADMIN_PASSWORD, 12).then(console.log)"
Remove-Item Env:ADMIN_PASSWORD
```

Copy the printed hash into the backend secret manager as `ADMIN_PASSWORD_HASH`. Do not commit the password or hash, expose either to browser code, or put them in a frontend `VITE_` variable. If the backend uses another hasher, use its own supported hash-generation command and verification configuration.
