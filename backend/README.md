# Warehouse & Fulfilment API

Node.js 20+ REST API for UK contact and quote enquiries. It stores enquiries in MongoDB and can email the business owner. There is no frontend.

## Requirements and setup

- Node.js 20 or newer
- MongoDB 6+ (local or managed)

```sh
npm install
cp .env.example .env
# Edit .env, then:
npm start
```

The server requires `MONGODB_URI` and creates schema indexes when the model is used. `GET /api/v1/health` is a liveness endpoint and does not check database connectivity.

### Environment

| Variable | Purpose |
| --- | --- |
| `PORT` | HTTP port (default 3000) |
| `TRUST_PROXY_HOPS` | Number of trusted reverse-proxy hops for client IP detection (default `0`) |
| `MONGODB_URI` | MongoDB connection string; required to start |
| `CORS_ORIGINS` | Comma-separated exact browser origins |
| `JWT_SECRET` | JWT signing secret, at least 32 characters; required in production |
| `JWT_EXPIRES_IN` | JWT expiry (default `8h`) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` | SMTP server settings |
| `SMTP_USER`, `SMTP_PASSWORD` | Optional SMTP authentication |
| `SMTP_FROM` | Sender address, for example `Warehouse & Fulfilment <no-reply@yourdomain.co.uk>` |
| `BUSINESS_NAME` | Name displayed in the generated PDF |
| `NOTIFY_EMAIL` | One or more comma-separated notification recipients (example: `hello@yourdomain.co.uk`) |
| `ADMIN_EMAIL` | Admin login email; configure with the password hash |
| `ADMIN_PASSWORD_HASH` | bcrypt hash for the admin password |
| `PRIVACY_POLICY_VERSION` | Policy version recorded with each consent (default `1.0`) |
| `INQUIRY_RETENTION_DAYS` | Automatic enquiry retention period in days (default `730`) |
| `STORAGE_PROVIDER` | Local upload storage provider (currently `local`) |
| `UPLOADS_DIR` | Absolute, private, writable directory outside all public/static folders |
| `UPLOAD_MAX_FILE_MB` | Maximum upload size per file (default `10`) |
| `UPLOAD_MAX_FILES_PER_INTAKE` | Maximum files attached to one intake (default `200`) |
| `UPLOAD_MAX_FILES_PER_PRODUCT` | Maximum files attached to one product (default `20`) |
| `UPLOAD_MAX_TOTAL_MB_PER_INTAKE` | Maximum combined upload size per intake (default `150`) |
| `PDF_REJECT_ACTIVE_CONTENT` | Reject uploaded PDFs containing JavaScript, Launch, or OpenAction markers (default `true`) |
| `FRONTEND_URL` | Website base URL used for the owner email's admin link |
| `CLAMAV_HOST`, `CLAMAV_PORT` | Optional ClamAV daemon (clamd) endpoint; port defaults to `3310` |
| `NODE_ENV` | `development`, `test`, or `production` |

Create an admin password hash with:

```sh
node --input-type=module -e "import bcrypt from 'bcryptjs'; console.log(await bcrypt.hash(process.argv[1], 12))" "your-strong-password"
```

Email delivery is asynchronous and best-effort. Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, and `NOTIFY_EMAIL`; add `SMTP_USER` and `SMTP_PASSWORD` when your provider requires authentication. `SMTP_FROM` is optional and accepts a display name with an address. `NOTIFY_EMAIL` may contain multiple comma-separated recipients. If SMTP settings are missing, a warning is logged and the saved enquiry is marked `emailStatus: "failed"`. SMTP delivery is retried up to three times with backoff; a failed email never changes the successful form response. Delivery state (`pending`, `sent`, or `failed`) and `emailSentAt` are available in admin inquiry results. Notification timestamps are rendered in `Europe/London`, which applies GMT or BST for the relevant date. Stored dates use UTC. Each notification includes a short email summary and an in-memory generated PDF attachment; personal data is not written to disk.

## API (`/api/v1`)

### Health

```sh
curl http://localhost:3000/api/v1/health
```

Returns `{"success":true,"status":"ok"}`.

### Contact enquiry

`consent` is required and must be the JSON boolean `true`.

```sh
curl -X POST http://localhost:3000/api/v1/contact \
  -H 'Content-Type: application/json' \
  -d '{"fullName":"Alex Taylor","businessName":"Example Trading Ltd","phone":"07123 456789","email":"ALEX@example.co.uk","requiredServices":["warehousing-storage","order-fulfillment"],"estimatedMonthlyOrders":"100-500","message":"Please get in touch","consent":true,"website":""}'
```

### Get a quote

```sh
curl -X POST http://localhost:3000/api/v1/quotes \
  -H 'Content-Type: application/json' \
  -d '{"businessName":"Example Trading Ltd","contactPerson":"Alex Taylor","phone":"+44 20 7946 0958","email":"alex@example.co.uk","businessType":"Retail","estimatedInventoryVolume":"500-1000 units","monthlyOrderVolume":"100-500","requiredServices":["inventory-management","courier-dispatch"],"additionalRequirements":"Please use Royal Mail or DPD for dispatch","consent":true,"website":""}'
```

### Inventory intake

Intake submissions support 1–100 unique SKUs. SKUs allow letters, numbers, hyphens, underscores and full stops, and are unique case-insensitively within the submission. `packingMode` is either `uniform` (provide `uniform`, omit `boxes`) or `individual` (provide 1–500 `boxes`, omit `uniform`). Uniform carton dimensions are `cartonLengthCm`, `cartonWidthCm` and `cartonHeightCm`; individual box dimensions are `lengthCm`, `widthCm` and `heightCm`. Do not send calculated totals; the API calculates them. Product categories use the intake-specific enum in `src/constants/intake.js`.

```sh
curl -X POST http://localhost:3000/api/v1/intakes \
  -H 'Content-Type: application/json' \
  -d '{"customer":{"contactPerson":"Alex Taylor","businessName":"Example Trading Ltd","phone":"07123456789","email":"alex@example.co.uk"},"services":["inventory-receiving","product-inspection","amazon-fba-prep"],"products":[{"productName":"Storage bin","brandName":"Example","sku":"BIN-001","fnsku":"ABC1234567","asin":"B012345678","barcode":"12345678","category":"home-kitchen","countryOfOrigin":"GB","packingMode":"uniform","storage":["standard"],"hazmat":{"declaredStatus":"non-hazmat"},"uniform":{"cartons":10,"unitsPerCarton":24,"cartonWeightKg":12,"cartonLengthCm":40,"cartonWidthCm":30,"cartonHeightCm":25}}],"additionalInstructions":"Receive by appointment","consent":true,"website":""}'
```

The response includes a generated `INT-YYYY-NNNNNN` reference, calculated totals and per-SKU results, status, and a signed PDF token that expires after 24 hours. Download the PDF using the token and reference returned by submission:

```sh
curl 'http://localhost:3000/api/v1/intakes/INT-2026-000001/pdf' \
  -H "Authorization: Bearer $PDF_TOKEN" -o Intake.pdf
```

The reference alone never grants access. The token is checked for purpose, reference, signature, and expiry. Admins can list/search intakes with `GET /api/v1/admin/intakes?page=1&limit=20&status=submitted&search=BIN-001`, inspect with `GET /api/v1/admin/intakes/:id`, update status with `PATCH /api/v1/admin/intakes/:id/status`, delete with `DELETE /api/v1/admin/intakes/:id`, and download the PDF with `GET /api/v1/admin/intakes/:id/pdf`. Valid statuses are `submitted`, `under-review`, `received`, and `closed`.

The intake JSON body limit is 256 KB and intake submissions are limited to five per IP per 15 minutes. Intake retention uses a daily cleanup job so files are removed from disk before file metadata and the intake document. Contact and quote inquiries retain their MongoDB TTL policy.

Inventory intakes require unique services from the intake-specific enum in `src/constants/intake.js`; product categories and storage requirements use the same source of truth. Uniform carton dimensions are `cartonLengthCm`, `cartonWidthCm` and `cartonHeightCm`; individual box dimensions remain `lengthCm`, `widthCm` and `heightCm`. Dangerous-goods declarations require hazard types and an SDS status. Lithium batteries require battery details and `handling.containsBatteries: true`. Optional Amazon data must declare `sellsOnAmazon` and include a fulfilment channel when true. Unknown submitted fields, including client-provided verification or calculated flags, are stripped. `requiresDgReview` and `dgProductCount` are computed by the API. Contact and quote forms retain their separate `requiredServices` enum.

To smoke-test intake locally, start the API and run `npm run smoke:intake`; this posts `tests/fixtures/intake-valid.json` to `http://localhost:3000/api/v1/intakes` and prints the HTTP status and response. The valid and individual hazmat request fixtures are also covered by the intake API tests.

#### Uploading intake documents

The intake creation response includes `uploadToken` and `uploadTokenExpiresAt`. Keep this token private; it grants file upload, listing, and deletion access for that one intake for 24 hours. Each request uploads exactly one multipart file with `kind`, and (for product-scoped kinds) `sku`:

```sh
curl -X POST 'http://localhost:3000/api/v1/intakes/INT-2026-000001/files' \
  -H "Authorization: Bearer $UPLOAD_TOKEN" \
  -F 'kind=barcode-pdf' -F 'sku=BIN-001' \
  -F 'file=@barcode.pdf;type=application/pdf'
curl 'http://localhost:3000/api/v1/intakes/INT-2026-000001/files' \
  -H "Authorization: Bearer $UPLOAD_TOKEN"
curl -X DELETE 'http://localhost:3000/api/v1/intakes/INT-2026-000001/files/FILE_ID' \
  -H "Authorization: Bearer $UPLOAD_TOKEN"
```

Allowed `kind` values are `barcode-pdf`, `fnsku-labels-pdf`, `carton-labels-pdf`, `product-labels-pdf`, `sds`, `un383-test-summary`, `dangerous-goods-declaration`, `product-photo`, `packing-list`, `commercial-invoice`, and `other`. The first four accept PDFs only; other kinds accept PDF, JPEG, or PNG. Product kinds require a SKU belonging to the intake. Submission kinds (`packing-list`, `commercial-invoice`, `other`) forbid a SKU. File formats are identified from magic bytes, not the supplied MIME type or extension. Barcode PDFs are required for every product for `documentsStatus: complete`; SDS, UN 38.3, dangerous goods declaration and FNSKU label files are recommended when applicable. Customer deletion is available while the intake remains `submitted`; uploads stop once it reaches `received` or `closed`.

Files are saved under a private local directory using relative keys, never served by static middleware, and are not embedded in email attachments. Admins can stream an individual file with `GET /api/v1/admin/intakes/:id/files/:fileId` (`?download=1` forces attachment), delete it with `DELETE /api/v1/admin/intakes/:id/files/:fileId`, or stream all files as a ZIP from `GET /api/v1/admin/intakes/:id/files.zip`. These endpoints require the admin JWT. File metadata responses never include storage keys or disk paths.

On an EC2 host, mount a persistent EBS volume and set `UPLOADS_DIR` to an absolute directory on that volume (for example `/var/lib/warehouse-api/uploads`). The process creates it with restrictive permissions and exits at startup if it cannot write there. The local provider implements `src/storage/StorageProvider.js`; to add S3 later, implement the same `save`, `openReadStream`, `delete`, `deletePrefix`, and `exists` methods, select it through a validated `STORAGE_PROVIDER` option, and keep only relative object keys in `IntakeFile`.

ClamAV scanning is optional. Without `CLAMAV_HOST`, uploads are marked `not-scanned`; with it configured, the API streams files to clamd and records clean/rejected results. A clamd daemon needs about 1 GB of RAM, which may not fit on tiny EC2 instances. If enabled, provide a reachable clamd TCP endpoint and allow enough memory for scanning.

Warehouse staff can review products with `PATCH /api/v1/admin/intakes/:id/products/:productId/verification`, sending `warehouseStatus` (`not-reviewed`, `under-review`, `verified`, `rejected`), `sdsStatus` (`pending`, `verified`, `rejected`, `not-required`), `finalClassification` (the declared classification values or an empty string), and optional `notes`. The server records the authenticated admin email and timestamp. Status and verification changes are appended to the intake audit log. Admin PDFs include the verification block; customer PDFs show declared information only. Changes to an intake status or product verification can be inspected at `GET /api/v1/admin/intakes/:id`. Filter admin lists by `requiresDgReview=true|false`.

Successful submissions return HTTP 201 with `{ "success": true, "message": "...", "data": { "id": "..." } }`. Validation errors return HTTP 400 with field-specific `errors`. The honeypot returns a success response but does not store or email anything. Unknown input fields are stripped.

UK mobile numbers (`07...`), landlines (`01...`, `02...`, `03...`) and international `+44` formats are parsed for region `GB` and stored in E.164 form (for example, `+447123456789`). Emails are trimmed and lowercased. `requiredServices` must include at least one of: `inventory-receiving`, `warehousing-storage`, `inventory-management`, `order-fulfillment`, `packaging-labeling`, `courier-dispatch`, `returns-handling`.

Each accepted enquiry records `consent`, `consentAt` (UTC), and `consentVersion`. The consent statement and policy version are owned by the website; change `PRIVACY_POLICY_VERSION` when the applicable policy changes.

The submission limit is five requests per IP per 15 minutes across contact and quote routes. Other API routes have a 100-request per-IP limit per 15 minutes. Request bodies are limited to 10 KB.

## Admin

Login (the password is compared against `ADMIN_PASSWORD_HASH`):

```sh
curl -X POST http://localhost:3000/api/v1/admin/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.co.uk","password":"your-strong-password"}'
```

Use the returned JWT as `Authorization: Bearer <token>`:

```sh
curl 'http://localhost:3000/api/v1/admin/inquiries?page=1&limit=20&type=quote&status=new&search=example' \
  -H 'Authorization: Bearer <token>'
curl -X PATCH http://localhost:3000/api/v1/admin/inquiries/65a000000000000000000000/status \
  -H 'Authorization: Bearer <token>' -H 'Content-Type: application/json' \
  -d '{"status":"contacted"}'
curl -X DELETE http://localhost:3000/api/v1/admin/inquiries/65a000000000000000000000 \
  -H 'Authorization: Bearer <token>'
```

Listing supports `page` (default 1), `limit` (default 20, max 100), `type=contact|quote`, `status=new|contacted|qualified|closed`, and a case-insensitive `search` across name, contact person, business name, email, and phone. Search input is escaped before matching. Results are newest first, with pagination metadata `{ page, limit, total, totalPages }`. The authenticated delete endpoint permanently removes an enquiry record for UK GDPR right-to-erasure requests.

## Retention and hosting

MongoDB applies a TTL index to contact and quote enquiry `createdAt` fields using `INQUIRY_RETENTION_DAYS` (default two years). Intakes use the daily cleanup job: it deletes stored files first, then `IntakeFile` records, and finally expired intake documents. Stale multipart temp files older than one hour are removed hourly. Existing deployments must restart on this version so startup drops the old `createdAt_1` TTL index from the `intakes` collection and creates the non-TTL index. Admin erasure endpoints immediately delete intake files and metadata.

### Upload backups and reverse proxy

Back up the persistent upload volume with regular EBS snapshots or a daily `rsync` to a separate protected backup target. Monitor free disk space and upload volume, and alert before the volume fills. Keep MongoDB backups aligned with the upload-volume backup schedule so metadata and file contents can be restored together. Configure nginx with `client_max_body_size 12m;`; otherwise uploads near the 10 MB application limit can fail at the proxy with HTTP 413.

For production hosting, choose a UK region such as London for the application and a UK or EU region for the MongoDB Atlas cluster, subject to your organisation's data residency requirements. Set `TRUST_PROXY_HOPS` to the exact trusted proxy count, terminate TLS at a trusted proxy, restrict `CORS_ORIGINS`, use a long random JWT secret, and set `NODE_ENV=production`. The process handles `SIGTERM`/`SIGINT`, stops accepting new HTTP requests, and closes MongoDB. Application logs omit request bodies and do not log full phone numbers or email addresses; production errors return generic messages.

## Tests

```sh
npm test
```

Jest + Supertest tests use `mongodb-memory-server`; run `npm test` after `npm install`. Coverage includes PDF Buffer generation and long/special-character content, mocked SMTP attachment/Reply-To/subject behaviour and retries, form success when background SMTP delivery fails, UK phone parsing, consent validation, intake retention cleanup, upload magic-byte and active-content checks, upload quotas and duplicate detection, upload token scope/expiry, document status transitions, admin streaming/ZIP auth, and disk cleanup. The first test run may need network access to obtain a MongoDB test binary if it is not cached locally.
