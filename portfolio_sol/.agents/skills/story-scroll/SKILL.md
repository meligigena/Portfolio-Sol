---
name: story-scroll
description: Preserve and extend the portfolio's shared pinned iPhone story sequence. Use when adding stories to a client or edition, changing StorySequence, adjusting its GSAP ScrollTrigger behavior, or validating story scrolling, responsive layout, reduced motion, and route-change cleanup.
---

# Story Scroll

Keep the interaction centralized in `src/components/media/StorySequence.jsx`. Client and edition data must only provide story items.

## Contract

- Render one stable phone with `public/iphone.png` as its frame.
- Keep one 9:16 story visible inside the masked screen at a time.
- Translate the story track from right to left while vertical scroll pins the phone.
- Keep the complete phone and the `STORY` label inside the viewport for the full sequence.
- Preserve native horizontal access with scroll snapping under `prefers-reduced-motion: reduce`; do not pin or scrub.
- Scope GSAP with `useGSAP`, create the ScrollTrigger inside the component, and revert it on unmount or data changes.
- Reuse `StorySequence`; never create a client-specific copy of its markup, CSS, or animation.

## Workflow

1. Inspect `StorySequence.jsx`, `src/styles/case-study.css`, and the story items in `src/data/clients.js` before editing.
2. Measure the real asset dimensions and provide stable `id`, `src`, `alt`, `width`, and `height` fields.
3. Pass the ordered array to `<StorySequence projects={stories} />` from generic case-study content.
4. Preserve the existing movement parameters unless the user explicitly requests a global behavior change.
5. Verify that route or edition changes remove old pin spacers and ScrollTriggers.

## Validation

- Run the focused Vitest coverage, then the full suite, lint, and build.
- Use Playwright CLI at desktop, narrow notebook, tablet, and mobile widths.
- Scroll through the first, middle, and final stories and confirm right-to-left movement, one phone, one visible story, full-frame visibility, and a visible `STORY` label.
- Emulate reduced motion and confirm that all stories remain reachable without pinning.
- Check `document.documentElement.scrollWidth <= document.documentElement.clientWidth` and inspect console errors and failed asset requests.
