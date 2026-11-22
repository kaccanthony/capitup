# CapItUp UI specification

## Status and scope

This document is the proposed visual and interaction specification for the CapItUp Phase 01 UI foundation. It is planning material only. It does not authorize authentication, database-backed content, realtime collaboration, AI requests, Notion synchronization, or any later-phase product behavior.

The design must use representative local fixtures in Phase 01. Controls for later features must be presented as inert previews, disabled actions, or clearly labeled future capabilities; they must not imply that an integration or authorization boundary exists.

`docs/PRODUCT_SPEC.md` remains authoritative for product behavior. Official organization colors, logo rules, and typefaces remain unresolved in `docs/DECISIONS.md` O-010, so the palette and typography below are provisional, accessible defaults.

## Reference review

The requested paths under `docs/design-references/` were not present during this review. The matching assets were inspected directly at:

- `design-references/dashboard-reference.png`
- `design-references/login-reference.png`

The dashboard reference contributes these visual cues:

- a large rounded application surface floating over a soft atmospheric background;
- a narrow icon rail separated from an open central canvas;
- generous whitespace, oversized greeting copy, and a small set of prominent cards;
- pale blue and lavender light, restrained glass effects, soft borders, and diffuse shadows;
- a conversational assistant entry point that feels integrated without dominating the page;
- pill-shaped controls and circular icon buttons.

The login reference contributes these visual cues:

- a compact, centered dark card over a low-detail abstract background;
- layered charcoal surfaces with subtle highlights rather than hard dividers;
- a clear title, vertically ordered form actions, and one dominant light call to action;
- rounded controls, subdued supporting copy, and focused illumination around active input areas.

CapItUp must not reproduce either reference's branding, copy, logos, robot artwork, service icons, exact card arrangement, or exact screen composition. The original CapItUp interpretation is a dark editorial workspace: a persistent navigation rail, an accountability-first work queue, and a dedicated right assistant rail rather than the reference's centered productivity cards and bottom-wide prompt composer.

## Design principles

1. **Responsibility before decoration.** The page must reveal ownership, deadlines, workflow blockers, and the exact work requiring the current user's attention before secondary metrics.
2. **Calm working surface.** Use generous spacing and low-noise surfaces so caption status and editorial text remain readable for long sessions.
3. **Layering with purpose.** Glass, blur, gradients, and elevation communicate hierarchy. They must not sit behind long text or become decoration on every component.
4. **Human-controlled assistance.** The assistant is visually secondary to human work, clearly labels generated material as draft content, and never resembles an approval control.
5. **Access is not presentation.** Navigation visibility and disabled controls are not authorization. Later phases must enforce access in trusted server operations and Supabase RLS.
6. **Originality over imitation.** Preserve the references' softness, scale, and contrast rhythm while using CapItUp-specific information architecture and copy.

## Page composition

### Application frame

At large desktop widths, the authenticated shell uses three functional regions inside the viewport rather than one centered marketing canvas:

1. **Left navigation rail:** 72–80 px compact width, expandable to approximately 232 px only if a later interaction specification calls for it.
2. **Primary workspace:** a fluid central column, preferably 680–960 px wide, holding the page heading, attention queue, assigned captions, deadlines, and recent activity.
3. **Assistant rail:** 320–360 px, holding AI drafting entry, brief context, and assistance history placeholders.

The outer page uses a near-black canvas with a subdued lavender/blue atmospheric wash. The main application frame may use a faint inner border and large corner radius on wide screens, but it should occupy the viewport efficiently rather than floating with the large promotional margins shown in the dashboard reference.

The frame should use semantic landmarks:

- `nav` for primary navigation;
- `header` for organization/page context and user utilities;
- one `main` containing the dashboard hierarchy;
- `aside` for the assistant rail, with an accessible label;
- supplementary sections labeled by headings rather than visual position alone.

### Dashboard workspace

The central workspace begins with a compact page header, not a promotional hero. It contains:

- a contextual greeting or page title;
- the user's current organization role or work context as supporting text;
- one primary action, **New caption**, shown as a non-functional Phase 01 fixture;
- notification/profile utilities separated from the primary action.

Below the header, use a two-tier information layout:

- **Tier 1 — action required:** captions waiting for the user's decision, changes requested, and urgent deadlines;
- **Tier 2 — working context:** assigned captions, upcoming events, recently updated captions, and workload summary.

Avoid a wall of equal cards. One wide attention card and one primary list should visually outweigh compact supporting cards.

### Login page

The login experience is a dedicated route with a modal-like card, not a public signup flow. The route should use one `main` landmark and a labeled authentication section. Because login is the page's sole task, do not add a close button unless a real underlying destination is later defined.

The background is an original CSS-based abstract field: near-black at the edges with one blurred indigo/lavender arc or glow crossing behind the card. Do not use the proprietary reference artwork or a detailed image that competes with the form.

The card is approximately 420–480 px wide on desktop, constrained to the viewport on mobile, and contains in this order:

1. CapItUp wordmark or text lockup;
2. small **Private workspace** eyebrow;
3. concise heading such as **Welcome back**;
4. explanation that access is limited to authorized organization members;
5. primary **Continue with Institutional Account** action;
6. a lower-page, collapsed "Use email instead" disclosure for the institutional email/password fallback only after O-002 and O-025 are resolved; Google and Microsoft remain the visible primary choices, and the UI must not offer magic links;
7. generic status/error region that never reveals allowlist membership;
8. short security/support note.

Do not include a sign-up/sign-in segmented control, phone-number registration, consumer social buttons, or account-creation terms. Public self-registration is explicitly outside the product.

## Navigation structure

The proposed primary navigation is:

1. **Overview** — dashboard and personal work queue.
2. **Captions** — assigned, in-review, approved, and archived caption items.
3. **Projects** — project/event context and assignments.
4. **Calendar** — upcoming publication and event dates; data remains a local fixture until the Notion phase.
5. **Archive** — searchable historical approved captions.

Utilities are visually separated near the bottom of the rail:

- Notifications;
- Help or keyboard shortcuts;
- Settings, shown only when a future trusted authorization result permits it;
- user/profile menu.

The CapItUp mark sits at the top of the rail. The current destination uses a filled lavender-tinted capsule or rounded square plus a persistent text label in expanded layouts. Icon-only controls require tooltips and accessible names. Avoid a generic floating plus button at the top of the rail; **New caption** belongs in the page header so its purpose is explicit.

During Phase 01, navigation destinations may be static visual fixtures. Unimplemented routes must not lead to convincing but non-functional product screens.

## Card shapes and layering

Use a small, consistent radius hierarchy:

| Element | Radius | Layer treatment |
|---|---:|---|
| Outer application frame | 28–32 px | faint border, large diffuse shadow on wide screens only |
| Major dashboard panel / login card | 20–24 px | opaque or 90% surface with restrained backdrop blur |
| Standard work card | 16–18 px | solid raised surface with subtle one-pixel border |
| Input / button / filter | 10–12 px | solid surface; clear hover and focus states |
| Status badge | full pill | opaque state tint plus text/icon label |
| Icon button | circle or 10–12 px | minimum 44 px target despite smaller visible glyph |

Layer order:

1. atmospheric page background;
2. application frame;
3. navigation, primary workspace, and assistant rail surfaces;
4. raised work cards and active controls;
5. popovers, menus, tooltips, and dialogs.

Blur is limited to the outer frame, login card, assistant rail, and transient overlays. Caption bodies, work queues, and data lists use sufficiently opaque surfaces to preserve contrast and reading comfort.

## Spacing system

Use a 4 px base grid with these preferred steps:

| Token | Value | Typical use |
|---|---:|---|
| `space-1` | 4 px | icon/text micro-gap |
| `space-2` | 8 px | closely related controls |
| `space-3` | 12 px | badge groups and compact rows |
| `space-4` | 16 px | field spacing and card internals |
| `space-5` | 20 px | compact card padding |
| `space-6` | 24 px | standard panel padding |
| `space-8` | 32 px | section separation |
| `space-10` | 40 px | large section separation |
| `space-12` | 48 px | desktop page breathing room |

Desktop page gutters are 32 px inside the primary workspace; compact desktop/tablet gutters are 24 px; mobile gutters are 16 px. Dense list rows may use 12–16 px vertical padding, but major dashboard sections should maintain at least 32 px separation.

## Typography hierarchy

Until official typefaces are approved, use a local/system sans-serif stack with high legibility and no network font dependency. Typography should be calm and editorial rather than futuristic.

| Role | Size / line height | Weight | Notes |
|---|---|---:|---|
| Display greeting | 36–44 / 1.08 | 600 | desktop only; never the only page heading |
| Page heading | 28–32 / 1.15 | 650 | primary `h1` |
| Section heading | 18–20 / 1.3 | 600 | scan-friendly `h2` |
| Card title | 15–17 / 1.35 | 600 | one or two lines maximum |
| Body | 14–16 / 1.55 | 400 | default reading text |
| Label | 13–14 / 1.35 | 550 | form and metadata labels |
| Metadata | 12–13 / 1.4 | 450 | timestamps and secondary context |

Use sentence case. Reserve uppercase for short status abbreviations only. Avoid low-contrast ultra-light type. Numeric deadlines and counts should use tabular numerals where available.

## Color palette

The palette starts from the product specification and adds role-specific surfaces. These are provisional until O-010 is resolved.

| Token | Proposed value | Purpose |
|---|---|---|
| `canvas` | `#09030F` | page background |
| `canvas-elevated` | `#10051A` | outer app frame |
| `surface-1` | `#180A27` | navigation and major panels |
| `surface-2` | `#211035` | cards and inputs |
| `surface-3` | `#2C1545` | hover/selected surfaces |
| `text-primary` | `#F5EFFF` | headings and primary content |
| `text-secondary` | `#D1C2E4` | supporting content |
| `text-muted` | `#AA98C2` | metadata that still meets contrast requirements |
| `lavender` | `#A887E7` | primary accent and focus affordances |
| `violet` | `#4B0082` | active navigation and gradient depth |
| `slate` | `#6A4C85` | quiet borders and inactive decoration |
| `attention` | `#EC630D` | urgent deadlines and attention states only |
| `success` | `#63C69A` | positive status with icon/text accompaniment |
| `danger` | `#F07178` | destructive/error state with text accompaniment |

Deep indigo around `#4B0082` is the provisional visual foundation, with lavender reserved for focus, elevation, and readable active states. Do not use orange as a decorative accent. It signals urgency, an approaching deadline, or a real attention condition. Approval and workflow states require text/icon labels and cannot rely on color alone.

## Gradients

Use gradients as ambient light, not as content backgrounds:

- page background: a near-black base plus two large radial gradients, one muted violet and one cool blue, each below roughly 18% opacity;
- outer frame: a subtle top-left lavender highlight fading to transparent;
- login backdrop: one blurred indigo/lavender arc or elliptical glow offset from the card center;
- primary button: preferably a solid light or lavender surface; a gradient may be used only if both endpoints meet text contrast requirements;
- attention states: solid/tinted surfaces, never an orange decorative gradient.

No animated gradient is required. If later added, it must stop under `prefers-reduced-motion` and remain subtle enough not to distract from reading.

## Borders and shadows

- Default borders are one pixel using white at approximately 8–12% opacity.
- Active/selected borders use lavender at approximately 45–65% opacity.
- Error and urgent borders use their semantic color plus an icon and label.
- Inner highlights may use a one-pixel top edge at white 10–14% opacity to achieve the reference-like glass depth.
- Standard cards use little or no drop shadow; hierarchy comes from surface color and border.
- Floating panels use a diffuse shadow such as `0 24px 80px rgb(0 0 0 / 35%)` plus a tighter contact shadow.
- Focus uses a high-contrast two-layer ring with at least 2 px visible thickness and 2–3 px offset.

Never use glow as the only focus indicator. Avoid stacking strong shadows on every nested card.

## Dashboard information hierarchy

The dashboard answers four questions in this order:

1. **What needs my action now?** A dominant review/changes-requested queue with actor, exact status, due time, and explicit next action.
2. **What am I responsible for?** Assigned caption cards with title, content format/tag, project, deadline, and workflow position.
3. **What is approaching?** A compact week timeline for caption deadlines and upcoming events.
4. **What changed recently?** A concise activity list showing human actors and version/status changes.

Suggested desktop composition:

- page header across the central workspace;
- full-width **Needs your attention** panel;
- two-column row with **My captions** occupying roughly two-thirds and **This week** one-third;
- full-width **Recently updated** list;
- optional compact **Team workload** summary after personal work, not before it.

Use card content tied to CapItUp concepts rather than generic productivity slogans. Each caption item should show only representative, static Phase 01 data and should be labeled as demo content when ambiguity is possible.

Status treatments should distinguish `draft`, `in_review`, `changes_requested`, `awaiting_final_approval`, and `approved` by label, icon, and tone. The UI must not invent approvals or imply that a static fixture is live data.

## Right-side AI assistant panel

The assistant rail is a persistent contextual aid on wide screens and a user-invoked sheet on narrower screens. It is not the page's main content.

Composition:

1. header with **Draft assistant**, a sparkle-style neutral icon, and an **AI output is a draft** badge;
2. context summary showing the selected caption/project, or a clear empty state;
3. compact suggested prompts such as drafting directions, hook ideas, clarity check, or platform variants;
4. multiline prompt field and submit control;
5. space for generated draft cards with provenance placeholders for future model/style/sample metadata;
6. privacy note stating that access must be authorized before private captions are sent to a provider.

Phase 01 behavior:

- use local static content only;
- prompt submission is disabled or clearly marked **Available in a later phase**;
- do not simulate a successful provider response;
- do not install or call OpenAI;
- do not present image/music/search actions from the reference;
- do not place approval, publish, or workflow-decision controls in the assistant.

On screens below the three-column threshold, the rail collapses behind a labeled **Draft assistant** button. When implemented interactively, it opens as a focus-managed sheet with Escape-to-close, focus return, and background inertness.

## Login modal composition

The modal-like login card uses three visual zones:

- **Identity zone:** CapItUp lockup, private-workspace label, heading, and concise authorization message.
- **Action zone:** visible Google and Microsoft institutional-account controls, then a lower-page collapsed **Use email instead** disclosure that reveals the approved email/password fallback. Do not present a magic-link field.
- **Support zone:** generic error/status message, help path, and a reminder that access is restricted.

The primary action is at least 48 px high and spans the card width. Inputs, if enabled in a later phase, use persistent visible labels rather than placeholder-only labels. The active field may receive a restrained inner highlight inspired by the reference, but text and caret contrast must remain strong.

Do not include a public **Create account** action. If an identity provider returns an unauthorized member, use a generic message such as **We could not complete access to this workspace. Contact an administrator if you believe this is an error.** This wording must remain consistent regardless of whether an address exists in the allowlist.

## Responsive behavior

### Wide desktop: 1440 px and above

- Three visible regions: navigation rail, central workspace, assistant rail.
- Primary workspace cards may form a two-column grid.
- The outer application frame may have 24–32 px page margins and large rounded corners.

### Desktop/laptop: 1024–1439 px

- Navigation remains compact.
- Central workspace stays primary.
- Assistant rail may narrow or collapse into a sheet below approximately 1180 px if content would become cramped.
- Supporting dashboard cards may reduce to one main column plus one narrow secondary column.

### Tablet: 768–1023 px

- Replace the persistent left rail with a compact top bar and a labeled navigation drawer trigger.
- Stack dashboard sections in priority order.
- Present the assistant as a sheet, never as a squeezed permanent column.
- Maintain 44 px minimum pointer targets.

### Mobile: below 768 px

- Use a single content column with 16 px gutters.
- Use a compact sticky top bar; a bottom navigation bar may expose at most four highest-frequency destinations plus **More**.
- Keep action-required content first and move secondary metrics later.
- Allow cards to fill the available width; remove the outer-frame floating margin/radius where it wastes space.
- Open filters, navigation, and assistant as full-height sheets with focus management.
- Keep the login card nearly full width with 16 px outside margin and no nonessential backdrop detail behind form text.
- Prevent horizontal scrolling at 320 px viewport width.

Content order in the DOM must remain logical when columns collapse. Do not rely on CSS visual reordering that produces a confusing keyboard or screen-reader sequence.

## Animation and interaction behavior

Motion is restrained and functional:

- hover/focus transitions: 120–160 ms;
- panel and sheet transitions: 180–240 ms;
- easing: standard ease-out for entry and ease-in for exit;
- card hover: border/surface change and at most 1–2 px translation, never large scaling;
- navigation selection: immediate color/surface feedback, with no moving decorative blob;
- loading states: skeletons that preserve final layout dimensions; no endlessly pulsing large background;
- assistant draft reveal: simple opacity/translate transition only after a real response exists in its authorized future phase.

Under `prefers-reduced-motion: reduce`, remove translation, scale, parallax, animated gradients, and nonessential shimmer. State changes must remain understandable without motion.

Interactive elements need distinct default, hover, active, focus-visible, disabled, loading, and error states. Disabled Phase 01 controls should explain why they are unavailable through adjacent text or an accessible description; do not rely on a tooltip that keyboard and touch users may miss.

## Accessibility adjustments

- Meet WCAG 2.2 AA contrast: at least 4.5:1 for normal text and 3:1 for large text and essential graphical controls.
- Keep minimum target size at 44 by 44 px for primary touch and icon actions.
- Provide a skip link to the main workspace.
- Use one clear `h1`; section headings follow a logical hierarchy.
- Every icon-only control has an accessible name and visible tooltip on hover/focus.
- Never encode workflow status, urgency, or approval using color alone; pair color with text and an icon or shape.
- Keep long caption text on opaque surfaces and at a comfortable line length.
- Make focus order follow the visible reading order: navigation, header, primary action queue, supporting work, assistant.
- Use `aria-live="polite"` for noncritical login/assistant status and explicit focus movement for blocking errors.
- Do not use placeholder text as a label.
- Provide accessible names for user avatars and collapse decorative avatar stacks into a textual participant summary.
- Ensure sheets/dialogs trap focus, close with Escape where appropriate, restore focus to their trigger, and prevent background interaction.
- Preserve reduced-motion behavior already present in the foundation, but scope it so native progress indicators and essential state feedback remain understandable.
- When Unicode styling arrives in a later phase, provide the canonical plain-text preview and accessibility warning required by the product specification.

## Existing interface comparison

The current interface proves the framework setup but does not yet express the approved visual direction or product hierarchy.

| Current implementation | Gap | Required redesign |
|---|---|---|
| `src/app/page.tsx` renders one centered foundation card | No login shell, navigation, dashboard hierarchy, work queue, or assistant region | Replace with Phase 01 route-level login and dashboard presentation shells using static fixtures only |
| `src/app/layout.tsx` provides metadata and a dark class only | No application frame, skip-link placement, or shell-level layout structure | Add the semantic shell boundary and keep route-specific regions in their appropriate layouts |
| `src/app/globals.css` uses mostly grayscale shadcn defaults and broad `main` centering | Conflicts with multi-region layouts; lacks CapItUp surfaces, lavender hierarchy, atmospheric gradients, and refined typography | Replace broad element rules with semantic design tokens, scoped utilities, responsive layers, and accessible state tokens |
| `src/components/ui/button.tsx` is a generic compact primitive | Default heights and visual treatments are too small/neutral for the reference language and login CTA | Preserve the primitive API while redesigning variants, target sizes, focus rings, disabled explanation pattern, and primary/quiet treatments |
| Current header has only product text and a skip link | No organization context, primary action, notifications, or profile utility | Introduce a dashboard header component and move the skip link to an off-canvas-until-focused accessibility pattern |
| Current footer reports local-only setup | Useful developer status occupies product chrome | Remove it from the product shell; keep environment status in documentation or a development-only treatment if later approved |
| Current tests assert only the foundation message and landmarks | They do not cover navigation labels, dashboard hierarchy, assistant disclosure, login restrictions, or responsive composition | Redesign unit/E2E expectations around the approved static shells, keyboard order, 320 px overflow, reduced motion, and accessible names |

### Components to redesign or introduce during the authorized UI implementation

Existing components/files requiring redesign:

- root application layout;
- home route composition;
- global tokens and base styles;
- button variants and sizes;
- foundation unit and browser smoke tests.

New presentation components expected for the Phase 01 UI shell:

- `AppFrame`;
- `PrimaryNavigation`;
- `MobileNavigation` or navigation sheet;
- `DashboardHeader`;
- `AttentionQueue`;
- `CaptionWorkCard` and `CaptionList`;
- `DeadlineTimeline`;
- `RecentActivityList`;
- `WorkloadSummary`;
- `AssistantRail` and assistant sheet trigger;
- `LoginShell` and `LoginCard`;
- shared `StatusBadge`, `SectionHeader`, `IconButton`, `EmptyState`, `Skeleton`, and `DemoDataNotice` primitives.

These names describe responsibilities rather than prescribing exact file boundaries. The implementation should organize product-specific components by feature and retain shadcn/ui primitives under `src/components/ui/`.

## Phase 01 implementation boundary

An implementation based on this specification may build the visual system, responsive shells, accessibility states, and representative fixtures only. It must explicitly exclude:

- real authentication, sessions, allowlist checks, or identity-provider configuration;
- server authorization claims or role-derived behavior;
- Supabase business tables, RLS policies, or remote services;
- editable caption records or durable workflow state;
- TipTap, Yjs, Liveblocks, comments, suggestions, or presence;
- OpenAI requests, generated content, embeddings, or provider credentials;
- live Notion calendar data or synchronization;
- approval, publication, or audit behavior;
- deployment.

## Open design inputs

The following choices are intentionally not invented here:

- official organization logo and wordmark treatment;
- official colors and whether the provisional lavender/violet system should be adjusted;
- official typeface or font licensing/hosting requirements;
- institutional identity provider and approved fallback method;
- institutional domain and exact login help/contact route;
- whether the assistant rail should default open for all roles once AI is implemented;
- final dashboard fixture names, people, and project/event copy suitable for screenshots.

Until these are resolved, implementation should use a text-only CapItUp lockup, local/system fonts, synthetic names/content, and the provisional accessible tokens in this document.
