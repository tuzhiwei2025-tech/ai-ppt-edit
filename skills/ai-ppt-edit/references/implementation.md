# AI PPT Edit Implementation Reference

## Frontend

- `apps/web/src/routes.tsx`: localized route shell. Home renders the landing page until a deck is loaded, then lazy-loads the editor.
- `apps/web/src/pages/LandingPage.tsx`: home page, local deck open actions, sample deck action, capability modules, and top-level landing composition.
- `apps/web/src/components/LandingHeader.tsx`: home navigation and file-open entry points.
- `apps/web/src/fs/useOpenDeck.ts`: shared open procedure for folders, single HTML files, drag-and-drop, sample deck, and recall.
- `apps/web/src/fs/adapter.ts`: File System Access API adapter, deck discovery, parsing entry point, and permission checks.
- `apps/web/src/fs/assetResolver.ts`: resolves local relative asset references into browser-readable URLs.
- `apps/web/src/store/deckStore.ts`: deck state, current slide, selection, dirty/save flags, undo/redo, slide mutations, watermark state.
- `apps/web/src/pages/EditorPage.tsx`: editor shell, visual/code mode coordination, save/export entry points.
- `apps/web/src/components/CanvasFrame.tsx`: sandboxed iframe preview and editor runtime bridge.
- `apps/web/src/runtime/editor-runtime.ts`: code injected into the iframe for selection/edit/move behavior.
- `apps/web/src/components/PropertyPane.tsx`: text/image/layout controls for selected elements.
- `apps/web/src/components/ExportDrawer.tsx`: export options, API request, progress events, download handoff.
- `apps/web/src/i18n/locales/*`: bilingual copy. Keep zh and en structures matched.

## Backend

- `apps/api/src/server.ts`: Fastify setup, CORS, multipart, route registration.
- `apps/api/src/routes/export.ts`: multipart export endpoint, SSE progress events, temporary working directory, download cache.
- `apps/api/src/routes/assets.ts`: local asset root registration and safe asset proxy.
- `apps/api/src/routes/capabilities.ts`: safe product manifest for homepage Skills and future MCP service descriptors.
- `apps/api/src/services/screenshotter.ts`: browser rendering and slide screenshots.
- `apps/api/src/services/pptxBuilder.ts`: image-based PPTX assembly.
- `apps/api/src/services/pdfBuilder.ts`: PDF assembly.
- `apps/api/src/lib/protocol.ts`: API-side export helpers and slide selector constants.

## Shared Protocol

- `packages/protocol/src/slide.ts`: deck metadata, slide entries, style snapshots, layer and geometry types.
- `packages/protocol/src/export.ts`: export option types.
- `packages/protocol/src/messages.ts`: runtime/editor message contracts.

## Capability Model

- Skills describe current implementation playbooks and safe procedures.
- MCP services describe future callable tools.
- The homepage may show both, but they must remain separate in data shape and visual layout.
- Capability APIs should return safe descriptors only. They must not inspect or expose personal MCP server configuration.

## Validation

Run the smallest useful checks first:

```bash
pnpm --filter @ai-ppt-edit/api typecheck
pnpm --filter @ai-ppt-edit/web typecheck
pnpm build
```

After visible frontend changes, start the dev server and verify with the in-app browser. If default ports are occupied, use alternate ports and set `VITE_API_BASE` plus matching `CORS_ORIGIN`.
