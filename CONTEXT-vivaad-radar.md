# Vivaad Radar — context transfer

Paste this whole file as your first message in Cursor, or drop it in the repo root and
tell the agent to read it. It is self-contained: everything below was researched and
adversarially verified on 20 Aug 2026. Nothing here needs re-deriving.

---

## 1. What we are building

A hackathon project for a "Digital Land Records" track with ~60 competing teams.

**The product answers one question: "is this land parcel currently in court?"**

Type a survey number, get green / amber / red. Red means there is a pending civil suit
over this land — here is the case, who filed it, how long it has been pending, the next
hearing date, and the evidence behind the match.

**Why this matters legally.** Under Section 52 of the Transfer of Property Act (*lis
pendens*), a buyer of land that is under litigation is bound by whatever the court
eventually decides. The Supreme Court has repeatedly held that it does not matter whether
the buyer knew. No land record in India carries a litigation field, and no court record is
searchable by parcel.

**The gap is linkage, not missing data.** Court records index by **party name**. Land
records index by **survey number**. Both datasets are public. The two systems never agreed
on a key, so the join has never been built.

### What this is NOT

Do not drift into any of these. All are saturated in this track:

- blockchain land registry
- OCR / AI digitisation of handwritten records
- a generic grievance portal, CRUD dashboard, or "one platform for everything"
- a chatbot

The product is the **resolution layer between two incompatible identifier systems**. The
scrape is the input, not the product.

---

## 2. State selection: Karnataka

Chosen for: scrapable Record of Rights with no CAPTCHA, largely English court orders, and
an existing government dispute register that serves as ground truth.

**Accepted weakness:** Karnataka has no clean public cadastral GeoJSON. It is not on NIC's
Bhu-Naksha list (it uses CollabLand, which has no public URL). Do not fix this by pulling
map geometry from another state — a Bihar polygon under a Karnataka record is a lie.
Render the village as a labelled schematic grid and say on screen that it is schematic.

---

## 3. Verified data sources

### eCourts district-court portal — the primary source

Base: `https://services.ecourts.gov.in/ecourtindia_v6/`

- **CAPTCHA:** stock Securimage, **6-character alphanumeric** (`maxlength='6'` on all seven
  captcha inputs). An **audio channel is present in the live DOM** — the image alt text
  reads "or select the audio Captcha and type the characters you hear." Securimage audio is
  usually much easier to solve than the distorted image. Test it first.
- **CAPTCHA image:** `GET vendor/securimage/securimage_show.php?<uuid>`. The widget is
  injected from `?p=casestatus/getCaptcha`, wired by `refreshCaptcha()` in
  `/ecourtindia_v6/js/common_header.js`.
- **CAPTCHA is required on exactly two POST endpoints:**
  - `?p=courtorder/submitOrderDate` — order search by **date range**
  - `?p=casestatus/submitCaseNo` — case detail lookup
- **Not gated:** `?p=casestatus/fillDistrict`, `?p=casestatus/fillcomplex`,
  `?p=casestatus/set_data`, `?p=home/viewHistory`, `?p=home/display_pdf`
- **Session state:** a rotating CSRF-style `app_token`, refreshed from each JSON response.
  URLs look like `?p=[section]/[action]&app_token=[token]`. Not stable REST endpoints.
- **Hierarchy to pin first:** State → District → Court Complex → Establishment
- **Rate limiting:** HTTP 405 → wait 30 s and retry. Use max 2 concurrent workers, ~1 req/s.
- **District case metadata fields** (no property fields at all): `case_number`, `case_type`,
  `cnr_number`, `filing_number`, `registration_number`, `registration_date`, `petitioner`,
  `respondent`, `status`, `court_name`, `judges`, `next_hearing_date`
- **Plaints and pleadings are never published.** Only orders and judgments carry free text.

**The key acquisition insight:** `submitOrderDate` takes a date range for a whole court
establishment. One CAPTCHA buys every order in that window, and the PDFs then download
through `display_pdf` with no further CAPTCHA. That is one CAPTCHA per week of court
business instead of one per case.

### Bhoomi — Karnataka land records

- **RTC + mutation:** `https://landrecords.karnataka.gov.in/Service2`
  Cascade: District → Taluk → Hobli → Village → Survey No → Surnoc → Hissa No → Period → Year.
  No CAPTCHA on the entry form.
- **Dispute register:** `https://landrecords.karnataka.gov.in/service22/`
  Report types: District Wise / **Survey No Wise** / Consolidated. No login, no CAPTCHA.
  **Carries revenue-court cases only** — Bhoomi points users elsewhere for civil courts.
  This is our ground truth and the precise shape of the gap we fill.
- **Maps:** `https://rdservices.karnataka.gov.in/BhoomiMaps/` (RTC with Sketch, beta);
  the Dishaank app resolves a tapped map point to a survey number.

### Bulk datasets (no scraping needed)

- **`s3://indian-high-court-judgments`** — ap-south-1, CC-BY-4.0, readable with
  `--no-sign-request` and no AWS account. ~17.8 M judgments, 25 High Courts, ~1.25 TiB.
  Parquet metadata at `s3://indian-high-court-judgments/metadata/parquet/`:
  ```sql
  court_code STRING, title STRING, description STRING, judge STRING,
  pdf_link STRING, cnr STRING, date_of_registration STRING,
  decision_date DATE, disposal_nature STRING, court_name STRING
  PARTITIONED BY (year STRING, court STRING)
  ```
  **High Courts only, and every row has a `decision_date` and a `disposal_nature` — these
  are DISPOSED cases.** Use it to train and benchmark the extractor. It cannot answer "is
  this in court now."
- **`s3://indian-supreme-court-judgments`** — same licence and access pattern.
- **Development Data Lab judicial data** — 81.2 M district-court cases 2010–2018, ODbL,
  bulk download. **Metadata only, anonymised, no free text, no parcel identifier.** Good
  for base rates. Useless for the join.

### Libraries

- **`bharat-courts`** (pip, MIT, maintained through Aug 2026) — the only maintained package
  covering the **district** portal. Ships three CAPTCHA solvers: ddddocr OCR at a
  self-reported ~75%, an ONNX solver, and a manual fallback; 5 retries by default.
  Single-author, ~20 stars, unaudited. Read the code before trusting it.
- **`vanga/indian-district-court-judgments`** (MIT, WIP) — district harness with a 95 MB
  ONNX CAPTCHA model and S3 sync. Publishes no public dataset; use as a code reference.
- **`openjustice-in/ecourts`** (PyPI `ecourts`, GPL-3.0) — well maintained but **High Court
  only**. Its Tesseract preprocessing is worth reading.
- **`opennyai`** — Indian legal NER, 14 entity types, **none of them a land identifier**
  (most granular is GPE, which stops at village). Its `PROVISION` type does catch
  "Section 52 TPA" and "Order 39 CPC", which is a useful signal.

---

## 4. Pipeline

**Stage 1 — Sweep.** Pin State/District/Complex/Establishment codes via the ungated
`fillDistrict` / `fillcomplex` calls. Walk `submitOrderDate` backwards in weekly windows,
one CAPTCHA per window. Pull PDFs via `display_pdf`. **Cache every byte to SQLite on first
fetch** — this is not a later refactor; re-scraping to recover from a crash gets you
rate-limited into a corner. Budget ~20% attrition from dead links and unreadable scans.

**Stage 2 — Filter to land matters.** Keyword classifier over the first 4,000 characters:
`khasra, khata, khatauni, khewat, jamabandi, patta, kattha, bigha, biswa, record of rights,
revenue records, land revenue record, mutation, survey number`. This exact approach scored
**96.7% accuracy on a 700-case hand check** in a published Delhi High Court study. Do it
with regex and say so — using arithmetic where arithmetic is correct buys credibility for
where we do use a model.

**Stage 3 — Extract the parcel.** This is the actual project. Pull `SURVEY_NO`, `HISSA`,
`VILLAGE`, `HOBLI`, `TALUK`, `AREA`, `PARTY_ROLE` from order text. Regex handles clean
`112/1` forms; a fine-tuned span model earns its place on the tail. Train on the High Court
S3 corpus (free, bulk, CC-BY, and `description` gives weak labels at scale); evaluate on
hand-labelled **district** orders, because that is the distribution we serve.

**Weight interim orders heavily.** An Order 39 injunction must identify the property it
restrains, so it names the survey number where an adjournment order names nothing. Those
are also the highest-risk cases. Report coverage separately for interim-order cases and
adjournment-only cases — the number is far better on the subset that matters.

**Stage 4 — Resolve and score.** Match extracted parcels against Bhoomi RTC rows for the
same village. Second signal: fuzzy-match court party names against RTC holder names across
transliteration variance (`"Ramesh Kumar S/o Shyamlal"` vs `"RAMESH KUMAR SHYAMLAL"`).
Emit a **confidence, never a verdict**. Village + survey + surname = high. Village +
surname alone = "possible, verify these two cases."

**Stage 5 — Serve.** Citizen search (survey number → verdict card with evidence), officer
view (village schematic, colour-coded, cluster list), watchlist with a mock notification
panel, and a per-parcel timeline: *suit filed 2019 → interim order 2021 → sale registered
2024 → next hearing 2026*, with the sale visibly inside the litigation window.

---

## 5. Non-negotiable UI rule

**Never assert that land is disputed.** The system surfaces a candidate match with its
evidence and a confidence band. Red requires a high-precision threshold. Every card shows
the two documents that produced the match plus an objection route. Build the evidence panel
before anything else — a screen reading "DISPUTED" with nothing behind it loses the
hardest judge question regardless of what is said out loud.

---

## 6. Dead ends — do not attempt

- **Judgment corpora cannot answer "is this in court now."** They hold cases with a written
  final decision. Cases dismissed without one are "a large majority", and pending cases are
  absent by definition. Pending suits reach us only through case status, cause lists and
  interim orders.
- **Case metadata carries no property field**, and plaints are never published. Order and
  judgment text is the only path to a survey number.
- **eCourts has no parcel search key.** Entry points are CNR, case number, filing number,
  party, advocate, FIR, act and case type. The join must be built from extracted text.
- **The Development Data Lab dump will not save you** — metadata only, anonymised, ends 2018.
- **ULPIN is not a usable join key yet.** It is derived from parcel geometry, so it exists
  only where the cadastre is geo-referenced, and there is no public queryable service.
  Survey number is the key.

---

## 7. Unverified — check before depending on

- Whether a CAPTCHA appears **deeper** in the Bhoomi `Service2` cascade (only the entry form
  was confirmed clean).
- How well `service22` is **populated in practice**. Its coverage is unmeasured; measuring
  it is part of our contribution.
- The current path for Maharashtra 7/12 — the host moved from
  `mahabhulekh.maharashtra.gov.in` to `bhulekh.mahabhumi.gov.in`, and the old ASP.NET page
  method `Home.aspx/call712` needs re-verification. Only relevant if we abandon Karnataka.

---

## 8. Open decision — resolve before building the UI

Two viable products; we have not committed:

**(a) Hybrid — recommended.** High Court S3 corpus trains and benchmarks the extractor;
a small district-court scrape of one taluk (a few hundred orders) powers the live pending-case
layer. Keeps the headline pitch. The district scrape is the risk, but it stays small.

**(b) Pivot to litigation history.** If the district scrape is abandoned, change the product
to "every past court fight over this survey number, and who won." Cross it against the RoR
and it surfaces a real failure: the court declared someone the owner and the revenue record
still says otherwise. Fully supported by the bulk judgments corpus, nothing synthetic —
but it is a weaker pitch than the buy-side warning.

---

## 9. Six-hour spike — the gate

Do not write UI code until these are answered. Two need no CAPTCHA and can run in parallel
with the hard one.

1. One CAPTCHA solved end-to-end against `submitOrderDate` (image **or** audio), and a week
   of orders enumerated for one establishment.
2. 200+ order PDFs downloaded and text-extracted, without hand-clicking.
3. **≥20% of the land-classified subset carries an extractable survey number.** Count by
   hand on 50 documents. Do not estimate.
4. Bhoomi `Service2` returns an RTC for a known survey number from a plain HTTP client.
5. `service22` "Survey No Wise" returns rows for the chosen taluk — ground truth exists.

**Any box unchecked at hour six:** switch to the Parcel Time Machine (temporal parcel graph
+ constraint engine: area closure, share closure, chain continuity, map-vs-text divergence)
built on a real scraped Karnataka village.

---

## 10. Scope discipline

Ship: citizen search, officer village view, watchlist, timeline. Nothing else. If a document
upload, a chatbot, or a chain appears in the repo, we have drifted into the pile we were
trying to escape.

Two practical rules: **cache to SQLite from the first script**, and **never live-scrape
during the demo** — run everything off the cache.
