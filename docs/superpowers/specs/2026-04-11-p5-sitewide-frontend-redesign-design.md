# P5: Sitewide Frontend Redesign - Professional SaaS Workbench

## Context

Leo Image Studio already has the core product surfaces in place:

- Public entry: landing, login, signup, legal pages
- Logged-in product: generate, edit, gallery, settings, upgrade
- Shared foundation: shadcn/ui components, Tailwind CSS 4, locale support, quota messaging

The current product is functional, but the frontend still reads as a collection of capable pages rather than one cohesive professional tool. The main issues are not missing features, but inconsistent hierarchy, weak shell structure, and surfaces that still feel like form pages instead of a mature creative SaaS.

This redesign focuses on turning the whole product into a coherent, premium-feeling workbench while keeping the current business logic, routes, and backend contracts stable.

## Goal

Redesign the entire frontend so Leo Image Studio feels like a calm, precise, high-end SaaS product centered on image creation and editing, with a consistent workbench shell and a visibly stronger product system across public and authenticated surfaces.

## Chosen Direction

### Product Positioning

- Professional SaaS
- Calm, precise, reliable
- Warm-white foundation with cooler, more exact visual control

### Primary User Journey

The strongest path in the product should be:

1. Enter the product
2. Start creating in `generate`
3. Continue or refine in `edit`
4. Manage and reuse outputs in `library`

The redesign should optimize this loop first. All other pages exist to support it.

### Selected Redesign Strategy

This project uses the **workbench-first** approach:

- Prioritize the authenticated product shell and core creation workflow
- Let landing, auth, settings, and upgrade inherit the same language
- Improve visual design and information architecture first
- Allow light-to-moderate interaction refinement
- Do not change core business logic, data model, or route structure

## Scope

### In Scope

- Full visual redesign of the public and authenticated frontend
- New logged-in workbench shell with left sidebar and thin top context bar
- Stronger hierarchy and layout for `generate` and `edit`
- Reframing `gallery` as a lighter-weight asset center (`Library`)
- Unified product language for landing, auth, settings, and upgrade
- System-level component rules for cards, forms, panels, navigation, and states
- Responsive redesign for desktop and mobile
- Accessibility and interaction consistency improvements

### Out of Scope

- Backend logic changes
- New AI capabilities
- Database schema redesign for this project
- Authentication flow redesign beyond frontend presentation and light UX improvement
- Route renaming or large navigation information-model changes at the data layer
- Heavy workflow changes that would alter existing user intent or server action contracts

## Non-Negotiable Constraints

- Keep the current core route structure
- Keep existing generate/edit/gallery/settings/upgrade functionality intact
- Limit changes to frontend structure, copy hierarchy, styling, and moderate interaction refinement
- Preserve bilingual support
- Preserve quota and error handling behavior, but improve how it is presented

## Information Architecture

The product should clearly separate into two worlds.

### 1. Public Conversion Surfaces

Routes:

- `/`
- `/login`
- `/signup`
- `/terms`
- `/privacy`

Purpose:

- Explain product value quickly
- Build trust
- Reduce friction into the authenticated experience

These pages should feel lighter and more spacious than the app, but still visibly part of the same product system.

### 2. Authenticated Workbench Surfaces

Routes:

- `/generate`
- `/edit`
- `/gallery`
- `/settings`
- `/upgrade`

Purpose:

- Support repeated creation and refinement work
- Provide stable navigation
- Make outputs easy to review and reuse

The logged-in product should feel like one calm, durable workspace rather than several separate pages.

## Logged-In Shell

### Structural Model

The authenticated product uses:

- Fixed left sidebar on desktop
- Thin top context bar
- Main content area optimized for task focus

This replaces the current top-nav-dominant feel with a clearer workbench pattern.

### Sidebar Responsibilities

The left sidebar owns primary navigation and product framing.

#### Primary Navigation

- `Create` -> `/generate`
- `Edit` -> `/edit`
- `Library` -> `/gallery`

These are the only first-class task destinations.

#### Secondary Area

The lower sidebar area should contain:

- Usage summary / quota module
- Upgrade entry
- Settings entry
- User identity and account actions
- Language control if it best fits the shell rhythm

This keeps system/account utilities visible without letting them compete with the core workflow.

### Top Context Bar Responsibilities

The top bar is not the main nav. It should only handle:

- Current page title
- One-line supporting description
- Page-specific lightweight actions
- Current page state or filters when relevant
- Mobile navigation trigger

This gives each surface stronger context without making navigation noisy.

## Core Workflow Surfaces

## `Generate`

### Role

`/generate` becomes the default logged-in home and the main creation entry point.

It should feel like a professional prompt-driven creation workspace, not just a vertically stacked form.

### Layout

Desktop:

- Left creation panel
- Right result panel
- Recommended balance: roughly `5:7` or `4:8`

Mobile:

- Single-column stack
- Input first
- Result area below

### Creation Panel Structure

The left side should follow a stable 3-part hierarchy:

1. `Intent`
2. `Controls`
3. `Action`

#### Intent

- Prompt composer is the primary focus
- Refine helper is visually and functionally attached to the prompt area
- The first interaction should feel immediate and confident

#### Controls

- Aspect ratio
- Quality
- Scenario/template shortcuts

These controls should feel like a clean parameter set, not scattered buttons.

#### Action

- Main submit button
- Pending state
- Inline validation
- System-level quota or non-field messaging when applicable

### Scenario Handling

Scenario support stays in the product, but changes role:

- No longer the dominant first screen
- Becomes a shortcut system or guided starting point inside the creation workspace
- Should accelerate prompting, not block entry into creation

### Result Area

The right side should own generation feedback:

- Empty state
- Processing state
- Success state
- System-level failure state

Successful outputs should not appear as a long continuation under the form. They should appear in a dedicated result surface.

## `Edit`

### Role

`/edit` becomes the companion workspace to `generate`.

It should share the same workbench grammar, but center the user around source images plus editing intent.

### Layout

The edit page uses the same left-panel / right-panel model as generate so both pages feel like one product family.

### Edit Panel Structure

1. `Source`
2. `Intent`
3. `Action`

#### Source

- Upload tray for one or two images
- Clear distinction between primary and secondary source when two images are present
- Better visual handling for drag, replace, remove, preload, and empty states

The upload zone should feel like a stable input module, not a temporary drop box.

#### Intent

- Editing prompt below the source tray
- Clear copy hierarchy so the user knows what to change versus what to preserve

#### Action

- Submit
- Pending
- Field-level errors
- Quota/system messaging

### Result Area

The right side should mirror the generate page:

- Empty state
- Processing state
- Success state with action rail
- System-level failure state

### Cross-Surface Re-entry

When arriving from gallery with a source image:

- The page should clearly indicate the source context
- The user should understand they are editing from an existing asset, not starting from scratch

## `Library` (`/gallery`)

### Role

`/gallery` should be reframed in the product language as **Library**, even if the route remains unchanged.

Its job is not only to show history. It is the asset center for browsing, filtering, reusing, and re-entering the creation flow.

### Page Structure

The page should contain:

1. Context header
2. Filter/view layer
3. Asset display layer

### Context Header

- Page title
- Short description
- Lightweight count or usage framing
- Current filter summary when active

### Filter/View Layer

Keep filters intentionally light:

- All / favorites
- Generate / edit
- Recent-first
- Optional prompt keyword search

Avoid turning this page into a heavy DAM interface.

### Asset Cards

Each card should communicate:

- Preview image
- Generate vs edit origin
- Favorite state
- Key metadata summary
- Re-entry actions like continue editing or reuse prompt

The card should feel like a calm asset tile, not a hover-toolbar trap.

### Detail Layer

The existing viewer/dialog remains, but should act more like an asset detail surface:

- Preview
- Metadata
- Favorite
- Delete
- Re-entry into generate/edit

### Empty States

Support two distinct empty states:

- No assets yet
- No assets match current filters

Each should offer a clear next step.

## Supporting Surfaces

## Landing

### Role

The landing page should quickly establish:

- What the product does
- Why it is useful
- That create/edit are the core capabilities
- The next best action

### Content Direction

Keep the page restrained and trust-focused:

- One clear value statement
- Visual proof of output quality
- Minimal but stronger product framing
- Clear login/signup path

This should not become a marketing-heavy site.

## Login / Signup

### Role

The auth pages should feel like professional access screens, not generic form cards.

### Direction

- Preserve a simple structure
- Strengthen brand continuity
- Add lightweight context or trust messaging
- Keep form completion fast and calm

## Settings

### Role

`/settings` becomes an account control surface with clearer system structure.

### Sections

- `Profile`
- `Preferences`
- `Security`

Each section should use the same card/panel language as the rest of the app.

## Upgrade

### Role

`/upgrade` should explain quota, usage, and upgrade value clearly without feeling like a detached marketing page.

### Responsibilities

- Show current usage clearly
- Explain plan boundary or quota boundary
- Make upgrade value understandable
- Keep the visual tone inside the product system

## Visual System

This redesign should use one visual language across public and logged-in pages, with different density levels rather than separate design systems.

### Visual Character

- Calm
- Precise
- Warm-white but cooler than the current landing page
- Minimal but not sterile
- Premium without luxury-editorial exaggeration

### Color Strategy

#### Base

- Warm off-white or slightly tinted light surfaces
- Near-white cards and panels
- Soft borders and separators

#### Text

- Charcoal to cool-gray hierarchy
- Strong readability
- Avoid washed-out helper text

#### Accent

- One restrained cool accent color
- Used for active states, focus states, CTA emphasis, links, and structured highlights
- Never spread broadly enough to dominate the interface

### Elevation

- Reduce heavy shadows
- Use border, contrast, and light surface separation first
- Use shadow sparingly for overlays and modal layers

### Shape Language

- Slightly tighter radii than the current soft feel
- Consistent radius scale across panels, inputs, buttons, cards, and drawers
- Rounded enough to feel modern, not playful

### Typography

- Ordered, restrained hierarchy
- Fewer dramatic jumps in scale
- Stable page titles
- Clear section labels
- Better numeric presentation for ratios, quotas, and plan data

## Component System Rules

This project should use the existing shadcn/ui foundation, but make it feel more deliberate and product-grade.

### Buttons

The system should clearly distinguish:

- Primary action
- Secondary action
- Tertiary/ghost action
- Destructive action

Buttons must have consistent `default / hover / focus-visible / active / disabled / loading` states.

### Inputs and Textareas

Inputs must share a single state language:

- default
- hover
- focus-visible
- disabled
- error
- loading when relevant

Labels, helper text, validation text, and field grouping should be systemized rather than ad hoc per page.

### Cards and Panels

Cards should operate as a shared base for:

- Content sections
- Settings groups
- Upgrade plans
- Asset cards
- Result panels

Different contexts should vary by density and composition, not by inventing disconnected visual styles.

### Upload Surfaces

Upload components should follow the same interaction language as other inputs:

- calm empty state
- explicit drag state
- clear replace/remove affordances
- stable preview framing

### Navigation States

Sidebar items and page-local controls must visibly support:

- default
- hover
- active
- focus-visible
- disabled when applicable

These states should be more exact and easier to parse than the current mixed nav/button feel.

## Interaction Rules

### Density

Use a **balanced density** model:

- Enough whitespace to feel premium
- Enough information to feel efficient

Do not drift into sparse showcase UI or dense enterprise admin UI.

### Motion

Motion should be subtle and purposeful:

- soft hover transitions
- state change clarity
- panel and dialog entry with minimal interruption
- skeleton or processing blocks instead of noisy loading behavior

Respect reduced-motion expectations.

### Error Presentation

Maintain the existing behavioral distinction:

- Field validation stays inline
- Quota feedback remains a system-level message
- System failures appear in a dedicated non-field presentation area

The redesign should improve clarity, not merge all errors into one style.

### Accessibility

The redesign must preserve or improve:

- visible focus states
- keyboard navigation
- adequate contrast
- touch target size
- non-color-only state communication
- readable body sizes on mobile

## Responsive Behavior

### Desktop

- Sidebar remains fixed
- Main work surfaces use split-panel layouts where appropriate
- Context bar stays lightweight and page-specific

### Tablet

- Sidebar may narrow or partially collapse
- Work panels should preserve hierarchy without forcing cramped side-by-side layout

### Mobile

- Sidebar becomes a drawer
- Main creation flows stack vertically
- Primary actions remain obvious
- Navigation and account actions remain accessible but secondary to the task

## Behavioral Boundaries

This redesign may refine layout and interaction rhythm, but it must not change:

- server action contracts
- quota logic
- auth requirements
- underlying route responsibilities
- current locale persistence model unless explicitly planned as part of UI wiring

The goal is a better product surface, not a product rewrite.

## Validation Criteria

The redesign is successful when:

1. The logged-in product clearly feels like one coherent workbench
2. `generate` and `edit` are the strongest, most intentional pages in the app
3. `gallery` feels like an asset center rather than a plain history page
4. Public pages and authenticated pages visibly belong to the same product family
5. Navigation hierarchy is clearer and calmer than the current top-nav layout
6. The product feels more professional without becoming colder or harder to use
7. Mobile layouts remain usable and legible
8. Accessibility and feedback clarity improve rather than regress

## Implementation Notes For Planning

The implementation plan should assume:

- Existing routes remain in place
- Existing server actions remain in place
- Existing UI primitives should be extended and restyled before inventing new systems
- Shared shell work should come before page-specific polish
- `generate` and `edit` should be treated as the primary redesign center of gravity

