# ShipSprint — Locked Design System (Hallmark studied-DNA)

Source: `https://nexbit-temlis.webflow.io/` — DNA only, no pixel clone (template-marketplace refusal).
Genre: **modern-minimal** (SaaS dev-tool; Stripe/Linear school).
Theme route: **studied-DNA** (gate 57 — never fall back to catalog without explicit pivot).

## Tokens
- `--color-paper: #fafafa` (light) / `#09090b` (dark). Pure `#fff` allowed per modern-minimal (gate 7 loosened).
- `--color-ink: var(--color-zinc-950)` / dark `--color-zinc-50`. Neutrals: zinc scale (tinted, gate 22 loosened for modern-minimal).
- `--color-accent: var(--color-blue-600)` (#2563eb, 4.5:1+ on white). `--color-accent-ink: #ffffff`.
  Badge `bg-blue-500` banned — use `bg-blue-600` (gate 40/41).
- Muted text floor: `zinc-600` on light (`#52525b` ~5.7:1), `zinc-400` dark-only. `zinc-400/500 on white` banned (gate 40).
- `--color-focus: var(--color-zinc-900)` / dark `var(--color-zinc-100)`. `outline: 2px solid + offset 2px`, instant (gates 15, 26, 39).
- Fonts: `--font-sans: Geist` (body+display, single-family discipline), `--font-mono: Geist Mono` code-only (gates 1, 37, 38). No italic headers (38a).
- Spacing: Tailwind scale only. Radii: 8px cards, 12px hero, 999px pills. Shadows: soft `0 8px 24px -12px rgb(0 0 0 / 0.12)`.
- Measure: prose `max-width: 65ch` (gate 25). Display `overflow-wrap: anywhere; min-width: 0` (gate 51).
- Banner: `--banner-height: 40px`. `--z-sticky-nav: 300`, `--z-sticky: 200` (gate 56).

## Macrostructures (diversified, never repeat)
- Marketing `app/page.tsx`: **Split Studio** (H2 split diptych hero, alternating proof modules). Nav **N5 floating pill**, Footer **Ft2 inline single line**.
- Renderer `components/renderer/site-renderer.tsx`: **Narrative Workflow** (1.0/2.0/3.0 stages). Nav **N9 edge-aligned minimal**, Footer **Ft1 mast-headed**.
- Templates gallery: Catalogue index (no hero duplication).

## Rules (all 57 gates)
No gradient text/blooms (2,29,45). No 3-equal icon cards (3). No nested cards (4). Off-axis hero, max 2 centred elements (6). Sections separated by rule/colour shift, not whitespace (9). `transition-colors/opacity/transform` only (10). Single hover (13). Instant focus (15,39). 8-state inputs, 44px floor, `min-height:1lh` helper, triple disabled (39). `overflow-x: clip` html+body (34). `minmax(0,1fr)` image grids (50). Single-col heads ≤48rem (52). Eyebrow stacked (54). Clickables `nowrap` single-line (49). Bars `items-center` (36). Decorative SVG `aria-hidden` (33). Honest copy — no invented metrics (46). No re-drawn chrome — `<figure>` screenshots (47). Locked tokens — no inline hex (48).
