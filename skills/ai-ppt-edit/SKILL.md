---
name: ai-ppt-edit
description: Use this skill when working on the AI PPT Edit project: local-first HTML deck opening, visual editing, autosave, PPTX/PDF export, homepage capability modules, or future MCP service support.
---

# AI PPT Edit

## Purpose

Use this skill to maintain AI PPT Edit, a local-first editor for AI-generated HTML presentation decks. The product flow is: open an HTML deck, parse slides and assets, edit visually in the browser, autosave locally, then export high-fidelity PPTX/PDF through a temporary backend worker.

For detailed module maps, read `references/implementation.md`.

## Procedure

1. Confirm the surface.
   - Home page and capability modules live under `apps/web/src/pages/LandingPage.tsx`, i18n files, and `apps/web/src/index.css`.
   - Opening local files is handled by `apps/web/src/fs/*`.
   - Editor state and deck mutations are handled by `apps/web/src/store/deckStore.ts`, `apps/web/src/pages/EditorPage.tsx`, and editor components.
   - Export and asset proxy logic lives under `apps/api/src/routes/*` and `apps/api/src/services/*`.

2. Preserve the local-first contract.
   - Do not upload user files during editing.
   - Folder mode should keep relative assets writable and create safe working copies/backups.
   - Single-file mode is for self-contained HTML decks.
   - Export may send temporary content to the local API worker, but the backend must clean temporary files.

3. Treat Skills and MCP as separate product concepts.
   - Skill: a project playbook for agents and maintainers. It documents current implementation and safe change procedure.
   - MCP: future callable service layer for filesystem, browser render/export, and template registry capabilities.
   - Do not read or expose personal MCP config, local secrets, or machine-specific paths through the web app.

4. Keep UI operational, not decorative.
   - Prefer dense, readable workbench layouts over promotional cards.
   - Use rows, tables, segmented areas, status labels, and clear hierarchy for tool/service surfaces.
   - Avoid generic AI-style gradients, scattered icon cards, and repeated decorative panels.

5. Validate narrowly first.
   - Frontend typecheck: `pnpm --filter @ai-ppt-edit/web typecheck`
   - API typecheck: `pnpm --filter @ai-ppt-edit/api typecheck`
   - Full build: `pnpm build`
   - Browser check homepage changes with the in-app browser unless the user asks for Chrome.

## Change Rules

- Keep frontend, API, and protocol changes aligned when changing request/response shapes.
- Keep i18n files structurally identical; English imports the Chinese shape.
- Keep API capability responses safe: product manifests are allowed, personal MCP configuration is not.
- Do not widen a scoped UI request into editor/export behavior unless the request needs it.
- When the worktree is dirty, preserve unrelated existing changes.

## Common Tasks

### Update the Home Capability Area

1. Update capability API data in `apps/api/src/routes/capabilities.ts`.
2. Update the typed fetch and rendering logic in `LandingPage.tsx`.
3. Update both `apps/web/src/i18n/locales/zh/landing.ts` and `apps/web/src/i18n/locales/en/landing.ts`.
4. Update `apps/web/src/index.css`.
5. Validate typecheck and browser layout on desktop and mobile width.

### Add Future MCP Service Support

1. Define service boundaries first: filesystem workspace, browser render/export, or template registry.
2. Keep service descriptors separate from Skills.
3. Use safe server-side manifests or explicit user authorization. Never expose raw local MCP config.
4. Add API routes only after the service contract is clear.

### Change Export Behavior

1. Read `apps/api/src/routes/export.ts`.
2. Read the relevant service: screenshot, PPTX builder, or PDF builder.
3. Check protocol helpers before changing page range, metadata, filename, or resolution logic.
4. Verify with API typecheck and a focused export path test when practical.
