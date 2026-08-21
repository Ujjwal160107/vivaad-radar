# Vivaad Radar — Frontend Design Guidelines & Visual System

This document is the authoritative design system reference for Vivaad Radar. Any AI agent or developer building or modifying frontend interfaces must follow these guidelines strictly to preserve the visual DNA, layout rules, and legal tone of the product.

---

## 1. Aesthetic Philosophy: Legal Neubrutalism

Vivaad Radar’s interface represents **Modern Public Infrastructure + Legal Records + Investigative Journalism Dossier**.

### Core Tenets
* **Strict Neubrutalism:** Hard `2px` black borders, sharp `0px` border-radii (`rounded-none`), high-contrast ink-on-paper palette, and strong box-grid compositions.
* **No Generic SaaS Tropes:**
  * ❌ NO rounded pill buttons (`rounded-full`)
  * ❌ NO soft blurry drop shadows (`shadow-lg`, `shadow-2xl`)
  * ❌ NO glassmorphism / blurred backdrops (`backdrop-blur`)
  * ❌ NO decorative color gradients
  * ❌ NO floating unbordered cards
* **Editorial & Investigative Tone:** Information is arranged like an investigative dossier or legal ledger.

---

## 2. Typography System

The application relies on exactly two high-contrast typefaces loaded via Google Fonts:

| Role | Font Family | Tailwind Class | Usage Rules |
| :--- | :--- | :--- | :--- |
| **Editorial Display** | `Libre Baskerville` | `font-serif` | Page titles, major section headings, brand logo (`vivaad radar`). Primary headlines **must use bold italics** (`font-serif italic font-bold`). |
| **Data & Structure** | `IBM Plex Mono` | `font-mono` | All data values, survey numbers, CNRs, inputs, buttons, tables, timestamps, comparison rows, and uppercase section headers (`WHY THIS RESULT?`, `EVIDENCE LINKAGE BREAKDOWN`). |

### Hierarchy Scale
* **Main Query / Page Title:** `font-serif italic font-bold text-3xl sm:text-4xl md:text-5xl text-black`
* **Dossier Section Header:** `font-mono text-sm sm:text-base font-bold uppercase tracking-wider text-black`
* **Field Labels:** `font-mono text-xs text-ink-muted uppercase font-semibold`
* **Primary Body / Explanations:** `font-mono text-sm sm:text-base text-black leading-relaxed`
* **Secondary / Historical Step:** `font-serif italic text-neutral-400 text-xl sm:text-2xl font-normal`

---

## 3. Color Palette & Design Tokens

```
Background:  #FAF3E0 (Paper Cream)
Grid Lines:  rgba(0, 0, 0, 0.055) at 100px intervals
Borders:     #000000 (Pure Black, 2px width)
Ink:         #0A0A0A (Pure Black)
Muted Ink:   #5A5A5A / #888888
```

### Status & Warning Tokens
Status colors are reserved strictly for functional evidence bands:

| Status | Background Tint | Dot Indicator | Text Color | Usage Condition |
| :--- | :--- | :--- | :--- | :--- |
| **RED** (Active Litigation) | `#FDE8E8` | `#DC2626` | `#DC2626` / `#000000` | High-confidence match linking to an **active** court case. |
| **AMBER** (Caution / Disposed) | `#FEF3C7` | `#D97706` | `#D97706` / `#000000` | Medium-confidence match, disposed court case, or unconfirmed location. |
| **GREEN** (Clear / No Match) | `#DCFCE7` | `#16A34A` | `#16A34A` / `#000000` | Zero active dispute links found in indexed court records. |

---

## 4. Background & 100px Grid Utility

The background canvas features a subtle geometric grid spaced **exactly `100px` apart**:

```css
/* src/index.css */
.bg-grid-100 {
  background-color: #FAF3E0;
  background-image: 
    linear-gradient(to right, rgba(0, 0, 0, 0.055) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(0, 0, 0, 0.055) 1px, transparent 1px);
  background-size: 100px 100px;
}
```

---

## 5. Structural Composition & Box Rules

### 1. Outer & Inner Borders
* All major containers have `border-2 border-black bg-white rounded-none shadow-none`.
* Internal partitions use `border-r-2 border-black`, `border-b-2 border-black`, or `border-t-2 border-black`.

### 2. End-to-End Divider Rule (CRITICAL)
* **ALL horizontal line dividers inside cards MUST span 100% full length from left border to right border.**
* ❌ NEVER place short, floating, or margin-padded divider lines.
* Code pattern:
  ```tsx
  {/* Full Length Divider */}
  <div className="w-full border-b-2 border-black" />
  ```

### 3. Box 1: Hero Investigation Card Architecture
Box 1 follows a strict 2-column grid without orphaned or empty cells:
```
┌──────────────────────────────────────┬────────────────────────────────────────────────────────┐
│ TOP-LEFT: STATUS BOX                 │ RIGHT COLUMN (FULL HEIGHT):                            │
│ - Tinted BG (#FDE8E8 / #FEF3C7)      │ - "WHY THIS RESULT?" (bold uppercase font-mono)        │
│ - "Possible active litigation" + Dot │ - Plain-English explanation paragraph                  │
│ - Summary paragraph                  │ - Comparison Grid:                                     │
├──────────────────────────────────────┤   "Your search" vs "Court documents"                   │
│ BOTTOM-LEFT: METRICS BOX             │   (Survey No. & Village)                               │
│ - Confidence rate: 91%               │                                                        │
│ - Linked cases found: 1              │                                                        │
├──────────────────────────────────────┴───────────────────────────────────┬────────────────────┤
│ FULL-WIDTH BOTTOM ROW: Case Identifier & Title Description              │ [Full details →]   │
└──────────────────────────────────────────────────────────────────────────┴────────────────────┘
```

---

## 6. Buttons & Interactive Controls

### Primary Action Buttons
* Pure black background with white text, zero border-radius:
  ```tsx
  className="bg-black hover:bg-neutral-800 active:bg-neutral-950 text-white px-8 py-5 font-mono text-sm font-bold flex items-center justify-center gap-3 transition-colors cursor-pointer rounded-none select-none"
  ```

### Crisp Miter-Joined Pointy Arrows
Always use sharp geometric SVG arrows (`strokeWidth="2.5"`, `strokeLinecap="square"`, `strokeLinejoin="miter"`):
```tsx
{/* Right Arrow (Submit / Full Details) */}
<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="square" strokeLinejoin="miter">
  <line x1="5" y1="12" x2="19" y2="12" />
  <polyline points="12 5 19 12 12 19" />
</svg>

{/* Left Arrow (Square Back Button) */}
<button className="bg-black text-white w-14 h-14 flex items-center justify-center rounded-none">
  <svg viewBox="0 0 24 24" width="26" height="26" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="square" strokeLinejoin="miter">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
</button>
```

---

## 7. Search Screen Guidelines

1. **Page Margins:** Generous page padding (`px-8 sm:px-16 md:px-20 pb-10`) with `max-w-6xl mx-auto`.
2. **Search Bar Width:** Must occupy **`70vw`** (`w-full sm:w-[70vw] max-w-5xl`).
3. **Split Input Architecture:**
   * Outer container: `border-2 border-black bg-white flex flex-col sm:flex-row`.
   * Left input: `Survey / Gata Number...` (flex-1, `border-r-2 border-black`).
   * Middle input: `Village...` (w-72 to w-80, `border-r-2 border-black`).
   * Right button: Solid black square with pointy arrow.
4. **Demo Quick-Select:** Must stay in a **single horizontal line** without wrapping (`flex-nowrap whitespace-nowrap overflow-x-auto`).

---

## 8. Loading & Processing Screen Guidelines

1. **Vertical Alignment:** Positioned in the **top-half** of the viewport (`pt-16 sm:pt-24`), never pushed to the bottom.
2. **Previous Step:** Displayed directly above the headline in **grey italic serif** (`font-serif italic text-neutral-400 text-2xl`).
3. **Active Step:** Displayed in **bold italic Libre Baskerville** (`font-serif italic font-bold text-4xl sm:text-5xl text-black`).
4. **Progress Bar:**
   * Outer box: 2px black border, white background, `h-14 sm:h-16`.
   * Inner fill: Solid black fill with `font-mono text-sm sm:text-base text-white` showing `${percent}% done...`.
   * Cadence: Variable step delays (0.6s to 1.6s) with mid-step micro-increments to convey real NLP/Gazetteer resolver operations.

---

## 9. Dynamic Data Rules & Legal Phrasing (CRITICAL)

When rendering data, AI agents must adhere to the following logic rules:

1. **No Fake Stays / Cases on GREEN Parcels:**
   * A GREEN search (e.g. Survey `88 / Baraunsa`) means **0 active court disputes**.
   * ❌ NEVER render hardcoded court filing dates, stay orders, or pending civil cases for a green parcel.
   * GREEN results must display `No matching active litigation` (green dot), `0% confidence`, `0 linked cases`, and clean revenue mutation history.
2. **AMBER Parcels (Historical / Disposed):**
   * Clearly state that proceedings have concluded (e.g. `Case WRIB/312/2024 was disposed on 2025-01-15`).
3. **RED Parcels (Active Lis Pendens):**
   * Clearly highlight the *lis pendens* beat: *Land sale registered during active pendency of civil suit. Buyer bound by court decree under Section 52 Transfer of Property Act.*
4. **No Internal PRD Jargon:**
   * ❌ Avoid: "PRD 46", "PRD §37", "s2 normalization algorithm".
   * ✅ Use: "Public Legal Notice: Section 52 Transfer of Property Act", "Allahabad High Court Public Records", "District Gazetteer Reconciliation".

---

## 10. File & Component Organization

```
frontend/src/
├── api/
│   ├── client.ts             # Typed API client with 3-tier fallback
│   └── fallbackData.ts       # Tier-3 offline JSON payloads (P-B01, P-A01, P-C01)
├── components/
│   ├── CaseDetailModal.tsx   # Full court case dossier modal
│   └── Header.tsx            # Editorial branding header
├── pages/
│   ├── Search.tsx            # Split search box homepage
│   ├── Processing.tsx        # Top-half 5-step progress screen
│   └── Result.tsx            # Investigation dossier & lis pendens timeline
├── types/
│   └── api.ts                # TypeScript interfaces for DB models
├── App.tsx                   # Main screen coordinator
├── index.css                 # 100px grid & base typography
└── main.tsx
```
