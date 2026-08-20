# Digital Land Records — Problem Discovery & Idea Selection

*Research → problem opportunities → negative filter → 3 finalist ideas → ranking*

---

## Part 0 — How the system actually works (the part that creates the gaps)

You don't need a tutorial, so here is only the structural stuff that *generates* failures. Five separate "truths" exist about one piece of land, maintained by different offices, updated on different triggers, in different formats:

| # | The truth | Who keeps it | When it updates | What it proves |
|---|---|---|---|---|
| 1 | **The deed** (sale/gift/partition deed, Index-II) | Sub-Registrar, Registration Dept (Registration Act 1908) | At the moment of the transaction | That a *transaction happened* — **not** that the seller owned it |
| 2 | **The RoR / textual record** (7-12, RTC, Jamabandi, Khatauni, Khatiyan, Patta) | Revenue Dept, Tehsildar/Talathi/Patwari | Only when someone **applies for mutation** | Presumptive possession + tax liability |
| 3 | **The map** (Bhu-Naksha, FMB, tippan, cadastral sheet) | Survey & Settlement Dept | Only on re-survey or sub-division measurement | Shape and boundary |
| 4 | **The court file** (civil suit, revenue court proceeding) | District judiciary / revenue courts | Continuously, in a completely separate system | Who is actually fighting over it |
| 5 | **The physical land** (fences, crops, who is standing on it) | Nobody | Constantly | Reality |

Two facts make this explosive:

- **India runs presumptive title, not conclusive title.** A registered deed is evidence, not a guarantee. Any link in a decades-long chain can be challenged later. This is the root of nearly everything below.
- **Registration does not trigger mutation.** They are different departments, and in most states mutation is a fresh application. The Supreme Court reaffirmed the separation in *Samiullah v. State of Bihar* (2025), striking down Bihar's rule that demanded proof of mutation *before* registration.

Scale of consequence: land/property is commonly cited as roughly **two-thirds of civil litigation** in India; NITI Aayog puts average resolution of a land dispute at about **20 years**; CPR estimates ~7.7 million people affected by conflict over ~2.5 million hectares. The RBI Household Finance Committee found the average Indian household holds ~84% of wealth in physical assets — so a frozen title is not an inconvenience, it is the household's entire balance sheet locked up.

**Digitisation has been real but shallow.** DILRMP computerised RoRs and Sub-Registrar Offices, ULPIN/Bhu-Aadhaar assigns a 14-digit parcel ID, SVAMITVA drone-mapped inhabited village land, Karnataka and Telangana have pushed auto-mutation. What digitisation did was make each of the five truths **individually visible online**. What it did *not* do is make them **agree with each other**, or make anyone responsible for noticing when they disagree.

**That gap — "each record is online and individually correct, and nobody is comparing them" — is where every good idea in this document lives.**

---

## Part 1 — Twelve specific problem opportunities

These are problems, not solutions. Each is a distinct failure mechanism, not "records lack transparency."

---

### P1. The registration–mutation gap: legally the owner, administratively invisible

**Who:** Anyone who has just bought land — especially first-time and small buyers.

**Scenario:** Ravi registers a sale deed for 40 guntha in November. He assumes he is done: he has a stamped, registered document. In March he applies for a crop loan. The bank pulls the RTC — the seller's name is still on it. Ravi never filed a mutation application, or filed it and it is sitting in an objection queue.

**Root cause:** Registration and mutation are separate acts by separate departments with separate triggers. Registration records a transaction; mutation records a fiscal consequence. Neither creates title.

**Why digitisation didn't fix it:** Auto-mutation exists but is partial and conditional. Karnataka's rollout covers roughly 72% of entries automatically; the remaining ~28% — sale deeds with issues, gift deeds, **inheritance, civil court orders, minor guardianship** — go into a notice-and-objection queue precisely because they are the risky ones. The hardest cases are excluded by design.

**How people cope:** Wait. Follow up. Pay an agent. File an RTI to find out where the file is stuck. Discover the problem years later at loan or resale time.

**Why interesting:** The failure is *silent*. There is no moment where anyone tells Ravi something is wrong. He gets no notification, no red flag, no deadline. The system's default state is "quietly out of date."

---

### P2. Pending litigation is invisible at the moment of sale (*lis pendens*)

**Who:** Buyers of land that is already in court; also the plaintiff who is quietly being defeated by a sale.

**Scenario:** A partition suit filed by a son against his father has been pending in the district court since 2019. In 2024 the father sells 9 acres of the suit land to an outside buyer. The buyer's lawyer checks the RTC (clean), the encumbrance certificate (clean), the map (fine). Nothing anywhere says "this land is in court." Under Section 52 of the Transfer of Property Act, the buyer is now bound by whatever the court decides — even though he had no way to know.

**Root cause:** India has no general, mandatory registry of *lis pendens* notices. (Maharashtra and Gujarat have a limited registration-of-notice mechanism under the Bombay amendment; most states do not.) Courts and revenue offices are separate systems that do not exchange parcel identifiers. The Supreme Court has repeatedly reaffirmed that the buyer's *lack of notice is irrelevant* — the doctrine binds regardless.

**Why digitisation didn't fix it:** Both sides digitised — eCourts/NJDG holds 7+ crore case records; state portals hold the RoR — but neither was built to key on the other's identifier. Court records identify cases by party names; land records identify parcels by survey numbers. Nobody built the join.

**How people cope:** A good lawyer does a manual court search in the local district court, using surnames and village names, and hopes. Most buyers don't.

**Why interesting:** This is the cleanest example of a problem that is *discovered too late by design*. And unusually for Indian land problems, **both datasets already exist and are public** — the failure is purely one of linkage.

---

### P3. The reverse gap: you win in court and the record still says you lost

**Who:** People who spent 12 years winning a partition or declaration suit.

**Scenario:** A decree is passed in 2023 declaring Sunita the owner of a 1/3 share. The revenue record does not change. She must now separately apply for mutation on the strength of the decree, produce a certified copy, and often face fresh objections. Karnataka's auto-mutation explicitly excludes court orders from automatic processing.

**Root cause:** Courts declare rights; revenue officers record consequences. No court order is automatically pushed into the revenue database. Execution is the litigant's problem.

**Why digitisation didn't fix it:** The decree exists as a signed PDF in the eCourts system. The mutation register exists as a database. Nothing carries the payload from one to the other.

**How people cope:** More applications, more visits, sometimes a second round of litigation for execution.

**Why interesting:** The system produces authoritative truth and then throws it away. This is a *push* problem, not a lookup problem — and push problems are easy to demo.

---

### P4. The silent inheritance backlog: land recorded in the name of the dead

**Who:** Rural families across two or three generations.

**Scenario:** Grandfather dies in 2003. Nobody files for mutation because the family "knows" who farms what. Father dies in 2019. In 2026 one brother wants to sell his share — and now needs death certificates for two people, a legal heir certificate, NOCs from every sibling and cousin, and possibly a succession certificate from court. Meanwhile a fraudulent mutation in someone's favour has become much easier, because there is no living recorded owner to object.

**Root cause:** Mutation on inheritance is optional, citizen-initiated, and free of any deadline. Death and land records are separate registries.

**Scale signal:** In Karnataka's pilot to link Aadhaar to RTCs, officials approached ~19 lakh farmers — of whom **around 6 lakh had already died, with land still recorded in their names.** That is roughly one in three records in a digitised state pointing at a dead person.

**Why digitisation didn't fix it:** Digitisation faithfully digitised the dead man's name. Civil registration of deaths and land records are not joined.

**How people cope:** Deferral, informal family arrangement, then a crisis at the first sale/loan/death.

**Why interesting:** The state *already knows* the person died (death registration) and *already knows* they hold land (RoR). It has never been asked to put the two facts side by side. This is a detectable, quantifiable, purely computational gap.

---

### P5. Undivided shares vs physical possession: "my field" is a legal fiction

**Who:** Co-heirs in every joint family holding.

**Scenario:** Three brothers each hold 1/3 in Khata 145. On the ground, each has farmed a specific field for 25 years, with a bund between them. One brother sells "his field" to a buyer. Legally he sold an *undivided one-third share of the whole*, not that specific field. The buyer thinks he bought a field. Every party is acting in good faith on incompatible mental models.

**Root cause:** Revenue records store *shares*, not *plots*, until a registered partition or a sub-division order exists. Oral partition and family settlement are extremely common and legally weak.

**Why digitisation didn't fix it:** The portal shows "1/3" and users read it as "the third on the left." The digital record is technically correct and communicatively useless.

**How people cope:** Everyone gets along until someone dies, sells, or wants a loan. Then it goes to court as a partition suit — one of the largest categories of civil litigation.

**Why interesting:** Textbook case of "**people do not understand what their records actually mean.**" Nothing on any portal ever translates "1/3 hissa" into "you cannot point at a specific piece of ground and call it yours."

---

### P6. The map and the text drift apart after every sub-division

**Who:** Buyers, banks, anyone measuring.

**Scenario:** A survey number was partitioned in 2009. The RoR now shows three holders with three sub-numbers. Bhu-Naksha still shows one parcel with the original outline — because the cadastral map is updated only on a formal measurement by the survey office, which was never requested or never completed. State buyer guides explicitly warn about exactly this: *"The map predates partition; it shows one parcel where there are now two or three."*

**Root cause:** Textual records (Revenue Dept) and spatial records (Survey Dept) are separate systems with separate update triggers. Geo-referencing of cadastral maps was around **49% of villages** nationally as of 2023.

**Why digitisation didn't fix it:** Both were digitised separately. "Integration of textual and spatial records" is a listed DILRMP component precisely because it wasn't done.

**How people cope:** Apply for a fresh measurement (TILR / demarcation), wait weeks to months, pay, and hope the surveyor shows up.

**Why interesting:** Two official records, both authoritative, both current, describing incompatible worlds. Nobody's job is to notice.

---

### P7. The area arithmetic doesn't close

**Who:** Anyone auditing a chain of parcels.

**Scenario:** Survey 112 is 2.10 acres in 1972. In 1994 it splits into 112/1, 112/2, 112/3 recorded as 0.80, 0.90, 0.70 = 2.40 acres. Thirty years later, 0.30 acres exists on paper and not on earth. Each individual record is signed, stamped, and valid.

**Root cause:** Sub-division areas were often recorded from claim documents rather than fresh measurement; conversions between bigha/katha/guntha/cent/hectare across eras introduce drift; rounding compounds.

**Why digitisation didn't fix it:** The digitisation exercise transcribed values; it never ran a constraint check. No portal ever asks "do the children sum to the parent?"

**How people cope:** They don't — until two neighbours measure and find they are both short.

**Why interesting:** This is **contradiction between individually-correct records**, and it is *mechanically detectable* with arithmetic and graph traversal. No AI required to find it; AI helps to prioritise and explain it.

---

### P8. The encumbrance certificate's blind spots are wider than its coverage

**Who:** Every buyer who thinks a clean EC means clean land.

**Scenario:** The EC comes back clean. It does not cover: pending litigation, oral or unregistered family partitions, agreements to sell, ancestral claims, government prohibition listings, tenancy claims, or anything transacted outside the registration system. A clean EC is routinely read as "no problems."

**Root cause:** The EC is an index of *registered instruments in one office over a chosen period*. It is a search of a filing cabinet, not a title opinion.

**Why digitisation didn't fix it:** Online ECs made a narrow instrument faster and therefore more widely (and more wrongly) trusted.

**How people cope:** Good lawyers do parallel searches. Everyone else trusts the certificate.

**Why interesting:** This is a **false-confidence** failure, arguably worse than an absent record. The document's own limits are invisible on the document.

---

### P9. Grievances go to a forum that has no legal power to grant the remedy

**Who:** Every citizen at a Janata Durbar, district grievance day, or CM helpline portal.

**Scenario:** A farmer brings an encroachment complaint to a public grievance hearing. The officer hearing it has no jurisdiction to decide title; the matter may already be sub judice, in which case administrative intervention is barred; or it may actually need a technical demarcation, not an order. The complaint is "disposed." Nothing changes. The citizen returns next month.

**Root cause:** "Land dispute" is a single label covering encroachment on government land, private demarcation, partition, mutation delay, non-compliance with a court order, and matters already in court — each needing a *different authority, a different statute, and a different pathway*. Forums are measured on **disposal**, not **resolution**.

**Why digitisation didn't fix it:** Digitisation produced complaint portals with ticket numbers. A ticket routed to the wrong authority closes faster; it does not resolve.

**How people cope:** Repeat filing, escalation to the Collector, MLA letters, agents, eventually litigation.

**Why interesting:** A serving land administrator publicly argued in 2026 that districts should adopt a formal **"Land Grievance Triage Protocol"** — classify, assess conflict potential, route to the statutory pathway, monitor. *"Disposal is an event. Resolution is an outcome."* The protocol has been articulated as policy. **Nobody has built the software.**

---

### P10. Prohibited / assigned / government land discovered at the registration counter

**Who:** Buyers of peri-urban and assigned land.

**Scenario:** Money paid, agreement signed, registration appointment booked — and the sub-registrar refuses because the survey number falls under a prohibited-property list (e.g. Telangana's Section 22-A listings, which cover thousands of survey numbers: assigned land, ceiling surplus, inam, bhoodan, endowment, forest strips, canal and road-widening overlaps).

**Root cause:** Prohibition lists live in the registration department's negative list; the buyer's due diligence happens against the revenue record, which may look perfectly normal.

**Why digitisation didn't fix it:** The lists are digitised but poorly surfaced, poorly explained, and often keyed differently from how a citizen searches.

**How people cope:** Lose the advance, or discover a partial overlap only after a fresh survey.

**Why interesting:** The state knows the answer before the citizen spends the money, and tells them after.

---

### P11. The record exists, and the citizen cannot read it

**Who:** Rural landholders — acutely, right now, in Bihar.

**Scenario:** Bihar's ongoing Special Survey (45,000+ villages; the last cadastral survey was **1911**) requires every raiyat to submit a self-declaration (Prapatra-2) plus a **vanshavali — a hand-drawn genealogy** — reconciled against old khatiyans. Many of those old records are in the **Kaithi script**, which almost nobody alive reads. Bihar's literacy is around 70%. The state has, in effect, asked millions of people to perform an act of archival scholarship about their own families, under deadline, with rejection meaning their name doesn't enter the new khatiyan.

**Root cause:** Historic records were never normalised; the burden of reconstructing history was transferred to the citizen.

**Why digitisation didn't fix it:** Scanning a Kaithi document produces a Kaithi image.

**How people cope:** Cottage industry of form-fillers, vanshavali generators, camp agents — and, predictably, corruption complaints.

**Why interesting:** The dependence on intermediaries is total, and the mechanism is purely informational. *(Caveat: the obvious solution here is script OCR, which is exactly the saturated space you want to avoid. Noted as a problem, not recommended as your project.)*

---

### P12. Nothing tells you when your own record changes

**Who:** Absentee owners, NRIs, urban children of rural landholders, anyone with a second plot.

**Scenario:** A mutation is entered on a parcel you believe is yours. A statutory notice period may run — but notices are posted at the office or the village board. You find out in 2029, when you go to sell.

**Root cause:** Land records are pull-only. There is no subscription, no watchlist, no alert. Fraudulent mutations on forged documents are a documented pattern precisely because nobody is watching the ledger in real time.

**Why digitisation didn't fix it:** Digitisation made the record *viewable*. It did not make it *watchable*.

**How people cope:** Lawyers advise checking your own records every six months. Almost nobody does.

**Why interesting:** Trivially solvable in software; enormously valuable; nobody's mandate.

---

## Part 2 — Negative filter: what's already saturated

Rejecting anything that overlaps meaningfully with the following.

**Saturated to the point of parody — blockchain land registry.** Dozens of near-identical public repos (`hlf-landRegistry`, `LandChain`, `Land-Registration-with-Blockchain`, and many more), Devfolio/Devpost submissions, an official `blockchain.gov.in` case study, NITI Aayog's Chandigarh pilot, and a real deployment (Dantewada district, ~700k records on Avalanche via LegitDoc). **This is the single most likely thing your 10 competitors will build.** It also doesn't solve the actual problem: putting a wrong record on an immutable ledger produces a permanently wrong record.

**Saturated — OCR + AI record digitisation.** A widely circulated 2026 SIH idea list literally proposes: *"Land Record Digitization and Verification — OCR + AI to digitize handwritten land records, cross-reference with existing databases, and flag discrepancies."* If it's in a listicle, three teams in your room have read it.

**Saturated — generic grievance portal / CRUD dashboard / "one platform for everything."** The problem statement's own wording invites it. That's exactly why it will be the modal submission.

**Commercially occupied — buyer-side title verification.** This one matters because it's less obvious to students. A cluster of Indian startups already does automated property due diligence: **Landeed**, **LegiScore**, **1acre.in**, **2Bigha**, **Assetly**, **PropWatch**. LegiScore in particular already advertises pulling revenue records from state portals and **cross-referencing them with registration data to flag mutation gaps**, with a property score that downgrades un-mutated properties. So: *"detect that mutation hasn't happened"* is a shipped commercial product. Don't build that as your headline.

**Government-occupied.** Bhulekh / Bhoomi / Dharani→Bhu Bharati / AnyROR / Meebhoomi (RoR viewing), Bhu-Naksha (cadastral maps), DILRMP MIS, ULPIN/Bhu-Aadhaar (parcel IDs), SVAMITVA (drone survey of abadi land), state auto-mutation and Aadhaar-linked e-Khata. **Assume "we'll make a portal" is already done and funded.**

**What is conspicuously *not* occupied:**
- Any product that joins **court data to parcel data**.
- Any product that treats a parcel's records as a **graph over time** and checks it for internal contradiction.
- Any product that does **triage** on grievances rather than intake.
- Any **watchlist / push notification** on a land record.

(And per your instruction: absence of GitHub repos is weak evidence. The stronger evidence here is that the *government's own documents* list these as unsolved integration gaps, and that the private sector has gone after the easier, monetisable slice — buyer due diligence — and stopped there.)

---

## Part 3 — The three finalists

---

## IDEA 1 — **"Is this land in court?"** (working name: **Vivaad Radar** / *Case-on-Land*)

*The litigation layer that no land record has.*

### 1. The problem, through one person

Meena, a school teacher in a district town, is buying 1.5 acres from a seller who has all the right papers. Her lawyer checks the RTC — seller's name, clean. Encumbrance certificate — clean. Bhu-Naksha — boundaries fine. She pays ₹34 lakh, her entire savings plus a loan.

What nobody checked, because no system makes it checkable, is that the seller's brother filed a partition suit over the same khata in 2019, and it is still pending in the district court eleven kilometres away. Under Section 52 of the Transfer of Property Act, Meena's purchase is now subject to whatever that court eventually decides. The Supreme Court has held, repeatedly, that it does not matter whether she knew.

### 2. The key insight

**Every land record in India answers "who owns this?" Not one answers "who is fighting over this?"** — even though the fight is public record, published daily, on a government portal.

Court records are indexed by **party name**. Land records are indexed by **survey number**. Because the two systems never agreed on a key, the join has never been made. That's the entire gap: not missing data, missing linkage.

### 3. Why existing digitisation doesn't solve it

- eCourts/NJDG carries 7+ crore case records and 3.3+ crore orders — searchable by case number or party name, not by land parcel.
- State land portals show ownership and mutation history — with no litigation field.
- The Encumbrance Certificate covers registered instruments only; a pending suit is not a registered instrument.
- India has **no general mandatory *lis pendens* registry** (Maharashtra/Gujarat have a narrow notice mechanism; commentators have explicitly recommended a national one). Legal writing on Section 52 keeps arriving at the same conclusion: *the buyer needed to search court records, and there was no practical way to do it.*

### 4. The solution, explained to a non-technical person

> Type a survey number. The map turns green, amber, or red.
> Red means: **this land is currently in a court case.** Here is the case, here is who filed it, here is how long it's been pending, here is the next hearing date.
> That's it. Before you pay, you know.

Same system, second audience: a district officer opens the same map and sees **every parcel in the village under litigation**, colour-coded — which instantly shows the officer that three-quarters of the village's disputes are concentrated in two clusters, both around recently sub-divided ancestral holdings.

### 5. The memorable demo moment

Two-plot side-by-side. Plot A: everything clean, deal proceeds. Plot B: **identical-looking clean papers** — RTC clean, EC clean, map clean — and then the radar fires: *Title Suit No. 145/2019, District Court, pending 6 years 4 months, next hearing 12 Sept, plaintiff is the seller's brother.*

Then the line that lands with a professor: **"Every government portal in India would have told her this land is fine."**

Follow it with the village heat-map and the judge sees it isn't a toy — it's an instrument.

### 6. Technical approach

1. **Ingest** court records for one district (eCourts case status + orders/judgments; open-source scrapers and third-party REST APIs exist, plus published PDFs).
2. **Extract** parcel identifiers from case metadata and order text: survey/khasra/khata/gata numbers, sub-division notation (`112/1`), village/mouza/taluk names, area expressions across units. Indian judgment text is messy, multilingual, transliterated, and inconsistently formatted — this is the real engineering.
3. **Resolve entities** between court parties and record-holders: `"Ramesh Kumar S/o Shyamlal, R/o Ghosipur"` vs RoR `"RAMESH KUMAR SHYAMLAL"`. Transliteration variance, patronymic conventions, honorifics, initials.
4. **Score the link** — probabilistic, not binary. Output a confidence with evidence: matched village + matched survey number + matched surname = high; surname + village only = low, shown as "possible, verify."
5. **Serve** as a map layer keyed on parcel ID (ULPIN where available), plus a subscribe/watch function (solves P12 for free).

### 7. AI/ML opportunity — genuine, not decorative

This is the strongest ML fit of the three, because the core task *cannot* be done with rules:

- **NER over Indian legal text** — a custom span-extraction model (fine-tuned IndicBERT / LegalBERT-style encoder) for `SURVEY_NO`, `VILLAGE`, `AREA`, `KHATA`, `PARTY_ROLE`. Regex gets you 60%; the tail is where the interesting cases hide.
- **Entity resolution under transliteration noise** — learned string similarity + blocking, evaluated with precision/recall, not vibes. This is a classic, respectable ML problem with a clean metric.
- **Case-type classification** from petition/order text: partition vs title declaration vs injunction vs specific performance vs encroachment — because *the type determines the risk to a buyer*. A specific-performance suit is a very different threat from a boundary injunction.
- **Duration / pendency modelling** — predict expected time-to-disposal from case type, court, stage history. Gives the buyer "this will likely not resolve before 2031," which is the number that actually changes her decision.
- **Cluster detection** on the district view — where are disputes concentrated, and what parcel characteristics predict them.

Your strong ML member has real work here, and it's *legible* work: "we taught a model to read court judgments and find land parcels in them."

### 8. Hackathon MVP

- One district, or even one taluk. Real court data for a few hundred cases (public), real land record structure with **synthetic ownership** for the demo village (avoids exposing real people).
- Pipeline: extraction → resolution → confidence-scored links → Leaflet/Mapbox map with GeoJSON parcels → red/amber/green.
- Two views: **citizen search** (survey number → verdict card) and **officer dashboard** (village heat map + cluster list).
- Watchlist with a mock SMS/notification panel — cheap to build, disproportionately impressive.
- Show a **precision/recall table** for the linkage model in the deck. Technical judges will respect a team that quantifies its own error rate.

### 9. Why competitors won't build this

Because "land records" primes everyone to think about *records*. Getting here requires knowing (a) that *lis pendens* exists, (b) that eCourts data is programmatically reachable, and (c) that the join key problem is the actual obstacle. That's three non-obvious steps. A team brainstorming for ten minutes lands on blockchain, not on Section 52.

### 10. Hostile judge test

- **"Your matching will be wrong sometimes. If you flag my land as disputed and it isn't, you've destroyed its market value and possibly defamed me."** — The strongest attack. Your answer must be architectural, not apologetic: never assert, always *surface with evidence and confidence*; the UI says "possible match — verify these two cases," never "this land is disputed"; high-precision threshold with human confirmation for the red state; and an explicit correction/objection route. Have this answer ready in one breath.
- **"Many case filings never mention the survey number at all."** — True. Your recall will be partial. Reframe honestly: this converts an impossible search into a partial one, and partial coverage of a 20-year risk is still enormous value. Quantify it: "in our sample, X% of land-related cases carried an extractable parcel identifier."
- **"Isn't this just scraping a government website?"** — Answer: the scrape is the input, not the product. The product is the resolution layer between two incompatible identifier systems, which is where all the difficulty is.
- **"Why hasn't the government done it?"** — Honest answer: land is a State subject, courts are a separate arm, and no single department owns the join. That's a governance answer, not a technical one, and it's a good answer.

---

## IDEA 2 — **The Parcel Time Machine** (working name: **Bhoomi Vansh** / *Parcel Lineage*)

*Reconstruct a parcel's whole life as a graph — and let the contradictions surface themselves.*

### 1. The problem, through one person

Arvind's family has farmed the same land since his great-grandfather. He holds a paper khatiyan from 1958, a mutation entry from 1994, a partition arrangement everyone agreed to verbally in 2003, and an RTC printout from last month. Each document is genuine. Together they don't add up: the 1994 sub-division records three plots totalling more area than the parent; the map still shows one undivided parcel; the RTC lists his late father; and his sister's share, which the law gave her in 2005, appears nowhere.

Nobody has ever told him any of this. He will find out on the day he tries to sell, or the day his sister asks.

### 2. The key insight

A land parcel is not a row in a table. It is a **node in a graph that splits, merges, and changes hands across a century** — and Indian land records store it as disconnected rows. Because nobody assembles the graph, **nobody can run the two checks a graph makes trivial: does the area close, and do the shares sum to one?**

### 3. Why existing digitisation doesn't solve it

Portals are lookup interfaces: they return *the current row*. Mutation history, where shown, is a flat list, not a lineage. Cadastral maps and textual records live in different systems (integration of textual and spatial records is still an open DILRMP component; geo-referencing was ~49% of villages as of 2023). No portal has ever been asked to *verify its own internal consistency*.

And the human cost of this gap is live right now: Bihar's Special Survey requires every landholder to hand-reconstruct exactly this lineage — a vanshavali plus a self-declaration reconciled against khatiyans, many in the near-unreadable Kaithi script. **The state has outsourced graph reconstruction to farmers.**

### 4. The solution, explained to a non-technical person

> Enter a survey number and drag a slider from 1950 to today.
> Watch the land split, change hands, and change shape.
> Wherever the records contradict each other, the timeline flashes red and tells you, in one sentence, what doesn't add up.
> *"In 1994 this 2.10-acre plot was divided into three plots totalling 2.40 acres. 0.30 acres exists on paper and not on the ground."*

### 5. The memorable demo moment

The slider. Nothing else in the room will move. You drag from 1958 to 2026 and a shape on a map splits into three, colours change as ownership passes, and then a red marker drops on 1994 with a plain-language explanation of an arithmetic impossibility that has been sitting in the record for thirty-two years.

Second beat, for the emotional punch: the panel that reads **"Current recorded owner died in 2011 (matched against civil registration). Three legal heirs are not on this record. Estimated cost of fixing this today: one application. Estimated cost in 2035: a partition suit."**

### 6. Technical approach

1. **Model the parcel as a temporal graph.** Nodes = parcel-versions (`112` → `112/1`, `112/2`, `112/3`); edges = events (mutation, sale, inheritance, partition, sub-division, acquisition) with timestamps and source-document references.
2. **Build the graph** from mutation registers + deed index (Index-II) + map sub-division records.
3. **Run a constraint engine** over it — this is where the value is, and most of it is beautifully simple:
   - **Area closure:** Σ(children) ≈ parent, within a measurement tolerance you define and defend.
   - **Share closure:** Σ(recorded shares) = 1.
   - **Temporal validity:** no transfer by a person after their recorded death; no transfer of more than the transferor's share.
   - **Cross-system agreement:** textual sub-division count vs map polygon count; recorded area vs polygon area computed from geometry.
   - **Chain continuity:** every owner acquired from the previous recorded owner.
4. **Spatial reconciliation:** compute polygon area from cadastral GeoJSON, compare to recorded area, flag divergence beyond threshold.
5. **Explain in plain language** — every flag renders as one sentence a farmer understands, plus the two source documents that disagree.

### 7. AI/ML opportunity — real, but be honest about where

Be disciplined here; a judge who spots forced AI will punish you.

- **Genuinely ML:** *record linkage* — deciding that "Ramesh s/o Shyamlal" in the 1994 register and "R. Kumar" in the 2011 deed are the same person, across transliteration and spelling drift. Same learned-similarity problem as Idea 1, unavoidable, and it's what makes graph construction possible at all.
- **Genuinely ML:** *anomaly detection at scale.* Once you have thousands of parcel graphs, an unsupervised model over graph features (branching factor, area drift per generation, event frequency, holder churn) surfaces parcels that are *structurally weird* in ways no hand-written rule anticipated. This is the honest "we found things we weren't looking for" claim.
- **Genuinely ML:** *dispute-risk scoring* — train on parcels that later became litigated (labels from court data) to learn which graph signatures precede disputes. This is prediction with a real label, and it directly serves "what happens **before** a problem becomes a dispute."
- **Not ML, and say so:** area closure and share arithmetic. These are constraint checks. Saying "we used arithmetic here because arithmetic is correct here, and ML where the problem is genuinely fuzzy" is a *credibility gain* in front of technical judges, not a loss.

### 8. Hackathon MVP

- One synthetic-but-realistic village: ~40 parcels, ~120 events, 1950→2026, with contradictions **deliberately planted** at realistic rates (an area gap, a dead owner, a share that sums to 1.17, a map/text mismatch).
- Timeline scrubber + map morph (D3 + Leaflet), contradiction panel, plain-language explanations, per-parcel "health score."
- One real parcel's actual mutation history, hand-entered, to prove the model matches reality.
- Village-level dashboard: "9 of 40 parcels carry an unresolved contradiction."

### 9. Why competitors won't build this

Everyone treats a land record as a *document to display*. Treating it as a *graph to validate* is a genuine conceptual jump, and the timeline visualisation requires deliberate design effort that a team racing to finish CRUD won't spend.

### 10. Hostile judge test

- **"Your data is synthetic. You've built a beautiful demo of a problem you invented."** — The sharpest attack, and it is partly fair. Mitigate hard: plant contradictions at rates you can cite from real sources (map-predates-partition, dead-owner records, area drift), enter at least one real parcel's real history, and say plainly: "the contradiction types are documented; the village is synthetic because real historical chains aren't available in 36 hours."
- **"Real records are not clean enough to build this graph automatically."** — Correct, and it's the core risk. Answer: partial graphs still work; every unresolvable link is itself a flagged finding ("the chain breaks in 1987 — that gap is the problem"). Reframe missing data as output, not failure.
- **"Isn't 0.3 acres of drift just old measurement error?"** — Often yes. Which is why you show a *tolerance band* and rank findings by severity rather than crying wolf on every rounding artefact. Have a defensible tolerance number.

---

## IDEA 3 — **The Right Door** (working name: **Sahi Darwaza** / *Land Grievance Triage*)

*Stop collecting complaints. Start diagnosing them.*

### 1. The problem, through one person

Ramkishan has been to the district grievance day four times in two years. Each time he describes the same thing: his neighbour's boundary wall has moved about four feet into his field. Each time he gets a receipt number. Each time the complaint is marked "disposed."

His problem was never going to be solved there. It is a **demarcation** matter requiring a technical measurement by the survey office — not an order from a grievance forum, which has no power to fix a boundary. If a suit is already pending between the families, the forum is barred from touching it at all. Nobody has ever told him this. Four years of his life have gone into knocking on a door that does not open.

### 2. The key insight

The phrase **"land dispute" is a category error.** Encroachment on government land, private demarcation, mutation delay, partition, non-compliance with a court order, and matters already sub judice all arrive at the same counter wearing the same label — and each needs a *different authority, a different statute, and a different remedy.* Grievance systems are measured on **disposal**, which is an event; citizens need **resolution**, which is an outcome. Those two metrics point in opposite directions.

### 3. Why existing digitisation doesn't solve it

Digitisation gave us complaint portals: a form, a ticket, an SLA timer, a "disposed" button. A misrouted ticket closes *faster*, so the metric improves as the citizen's outcome worsens. No portal in India performs a jurisdictional diagnosis before accepting a complaint.

This is not our theory. A serving land administrator argued exactly this in June 2026, proposing that every district adopt a **"Land Grievance Triage Protocol"** — classify the grievance, assess its conflict potential, route it into the correct statutory pathway, and monitor. The policy design exists. **The software does not.**

### 4. The solution, explained to a non-technical person

> Ramkishan speaks his problem into a phone, in Hindi, the way he'd tell a neighbour.
> The system answers in thirty seconds:
> *"This is a boundary demarcation matter. A grievance forum cannot fix it. You need a measurement under [state land revenue code section]. Apply to the Taluk Survey Office. Here is your completed application. Expected time: 45 days. If they don't act in 45 days, your next step is the Sub-Divisional Officer — not the Collector, and not a civil suit."*
> And when the system detects that a case on this land is already in court, it says so **first**: *"A suit is pending. No administrative office can decide this. Filing here will waste your time."*

### 5. The memorable demo moment

The refusal. Every other team's demo *accepts* a complaint. Yours **declines to accept one** — and explains why in the citizen's own language, then hands them the correct pathway and a pre-filled application for the right office.

Then flip to the Collector's screen: a district map where each village carries a **conflict-potential score**, and a panel reading *"Village Ghosipur: 7 grievances about 3 adjacent parcels in 4 months, all post-partition, none routed to survey. This cluster becomes litigation in roughly 8 months."* — early warning, which is precisely "what happens *before* it becomes a dispute."

### 6. Technical approach

1. **Multilingual intake** — speech + text in Hindi/regional language (Whisper-class ASR + IndicTrans-style normalisation).
2. **Ailment classification** — map free text onto a taxonomy of ~8–10 land-grievance types (encroachment on government land, private encroachment, demarcation, mutation delay, partition, succession, record error, compliance failure, sub judice, acquisition compensation).
3. **Jurisdiction resolution** — a knowledge base mapping (ailment type × land type × state) → statutory authority + provision + expected SLA + escalation ladder. This is deliberately *not* an LLM guessing at law; it's a curated rule base the model routes into.
4. **Sub judice detection** — cross-check the parcel/parties against court data (this is where Idea 1's linkage becomes a component rather than a product).
5. **Duplicate & cluster detection** — same parcel, same family, recurring complaints across time and complainants.
6. **Document generation** — the correctly formatted application to the correct office, in the correct language.
7. **Officer dashboard** — routed-vs-disposed, conflict heat, ageing.

### 7. AI/ML opportunity

- **Multilingual short-text classification** on colloquial, code-mixed grievance descriptions — genuinely hard, genuinely ML, and evaluable (F1 per class, confusion matrix). This is the ML centrepiece and it's honest.
- **Escalation-risk prediction** — probability this grievance becomes litigation, trained on historical grievance→outcome pairs; features include ailment type, repeat count, number of parties, parcel history.
- **Clustering** for early warning — DBSCAN/graph clustering over (parcel proximity × family linkage × time) to spot brewing conflicts before any single complaint looks serious.
- **Deliberately NOT ML:** the legal routing itself. Say this out loud in the pitch — *"we do not let a language model decide which section of the Land Revenue Code applies; the model classifies, a curated legal rule base routes."* That sentence alone will separate you from every chatbot project in the room.

### 8. Hackathon MVP

- 150–250 synthetic-but-realistic grievance texts across your taxonomy (write them from real complaint patterns; a few in Hindi voice), split train/test.
- Trained classifier with an honest confusion matrix in the deck.
- Rule base for **one state's** land revenue code — depth over breadth; a professor from that state will immediately check whether you got the section right, and being right is worth more than covering ten states vaguely.
- Voice demo in Hindi, live. High risk, very high reward — rehearse it, and have a recorded fallback.
- Officer dashboard with the cluster early-warning panel.

### 9. Why competitors won't build this

Because the problem statement says "grievance redressal," every team will build a *grievance intake portal*. Inverting it — building a system whose primary value is **refusing to accept complaints into the wrong pipeline** — is a counterintuitive move that requires having read what land administrators actually complain about.

### 10. Hostile judge test

- **"This is an AI chatbot with a legal FAQ."** — The existential attack, and the framing of your entire pitch must pre-empt it. Never demo a chat window. Demo a **diagnosis card** with a verdict, a statute, a named office, a timeline, and a generated document. And lead with the refusal case.
- **"Wrong routing advice could cause a citizen to miss a limitation period."** — Serious. Answer: the system *recommends and drafts*, never files; every recommendation shows its statutory basis so it's checkable; low-confidence classifications route to a human, not to a guess. Show the confidence threshold in the UI.
- **"Where did your training data come from?"** — Synthetic. Own it, and explain your construction method and taxonomy derivation. Weakest link of the three ideas on data provenance.
- **"Adoption requires the revenue department to change its workflow."** — True. Counter: the citizen-facing half works with zero government adoption, and produces better-formed applications *into the existing system*, which is a benefit officers actually want.

---

## Part 4 — Ranking

Scores out of 10. Weighted for *your* situation: professor judges, 10 competing teams, one strong ML member, limited build time.

| Criterion | **1. Vivaad Radar** (court↔land) | **2. Parcel Time Machine** | **3. Sahi Darwaza** (triage) |
|---|:---:|:---:|:---:|
| Novelty | **9** | 8 | 7 |
| Real-world usefulness | **9** | 7 | 8 |
| Clarity to non-technical judges | 9 | 8 | **10** |
| Technical depth | 8 | **9** | 7 |
| AI/ML potential | **9** | 8 | 8 |
| Feasibility in hackathon time | 7 | **8** | 7 |
| Demo potential | 8 | **10** | 8 |
| Stands out vs generic teams | **10** | 9 | 6 |
| Data-provenance defensibility | **9** (real public data) | 5 (synthetic) | 5 (synthetic) |
| **Total (/90)** | **78** | 72 | 66 |

### Recommendation

**Build Idea 1 (Vivaad Radar), and steal the best beat from Idea 2.**

Idea 1 wins on the two criteria that decide this particular room:

1. **It is the only one whose data is real and public.** When a judge asks "is this actually possible or is it a mockup," you answer by pointing at a live case number. Ideas 2 and 3 both have to say "synthetic," and against ten teams that's a real handicap.
2. **It is un-guessable in ten minutes.** Nobody arrives at Section 52 by brainstorming "land records." Ideas 2 and 3 are more likely to be independently invented in weaker forms.

It also has the cleanest 30-second pitch in the set — *"No land record in India tells you whether the land is in court. Ours does."* — while the machinery underneath (legal-text NER, cross-system entity resolution under transliteration noise, confidence-scored probabilistic linkage) is exactly the kind of thing a technical judge leans forward for.

**The one thing to import from Idea 2:** the **timeline**. Idea 1's weakness is that its output is a flag, and flags are static. Give each flagged parcel a small horizontal timeline — *suit filed 2019 → interim order 2021 → sale registered 2024 (during pendency) → next hearing 2026* — with the sale visibly landing *inside* the litigation window. That single visual makes the abstract doctrine of *lis pendens* self-explanatory to a professor in about two seconds, and it costs you one afternoon.

**Scope discipline (this is how the project dies otherwise):** ship the citizen search + the officer heat map + the watchlist. Nothing else. If you find yourself adding a document upload, a chatbot, or a chain, you have drifted into the pile you were trying to escape.

### If you'd rather optimise for the demo than the defence

Pick Idea 2. The timeline scrubber is the single most visually striking thing in this document, and "0.3 acres exists on paper and not on the ground" is the best single sentence. You will win the room's attention and lose the data-provenance question. Only do this if you're confident your team can absorb that hit gracefully.

### Do not lead with Idea 3

Its problem is the most real of the three and its social value is highest — but it is one bad framing decision away from looking like the chatbot the judges have already seen four times that day. It is an excellent *second-phase* feature on top of Idea 1: once you know a parcel is in court, "what do I do now" is the natural next question, and the triage engine is the answer.

---

## Appendix — Key sources worth having open during the pitch

- *Samiullah v. State of Bihar* (SC, 2025) — registration ≠ mutation; mutation cannot be made a precondition to registration.
- Section 52, Transfer of Property Act 1882 (*lis pendens*); *Shingara Singh v. Daljit Singh* (SC, Dec 2024) — buyer's lack of notice is irrelevant.
- NITI Aayog / Daksh / CPR figures on land litigation share, ~20-year average resolution, 7.7 million people affected.
- PRS India, *Land Records and Titles in India* — presumptive vs conclusive titling.
- DILRMP status: SRO computerisation >93%, registration–land-record integration >75% in 23 states, cadastral geo-referencing ~49% of villages (2023).
- Karnataka auto-mutation: ~72% automatic; sale/gift/inheritance/court-order/minor-guardian entries excluded into a 15-day notice window. Aadhaar–RTC pilot: ~6 lakh of ~19 lakh farmers approached were deceased with land still in their names.
- "Land grievances need triage, not theatre," *The Pioneer*, 29 June 2026 — the Land Grievance Triage Protocol proposal.
- Bihar Special Survey: 45,000+ villages, last cadastral survey 1911, Prapatra-2 + vanshavali self-declaration, deadline extended to Dec 2026, Kaithi-script legacy records.
- eCourts/NJDG: 7+ crore case records, 3.3+ crore orders; public portals plus third-party REST APIs and open-source scrapers.
