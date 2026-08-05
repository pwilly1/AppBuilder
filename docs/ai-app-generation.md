# AI App Generation

## Status

Prompt-to-page generation is connected end to end. An authenticated builder can enter a bounded prompt in the editor, receive a transient backend proposal from either the deterministic fake provider or the configured OpenAI provider, and review the compiled result before applying it as one undoable project transaction.

The backend verifies project ownership, builds privacy-limited structural context, and constrains provider output with the shared plan contract. The frontend still treats the response as untrusted: it parses the plan again, compiles it through the block registry, repairs and validates layout, and renders an isolated preview. When compilation still fails, the frontend can request up to two bounded model corrections with structured compiler diagnostics. Mongo-backed account quotas and prompt-free usage records protect provider spend. Proposal and correction routes never save project changes.

## Purpose

Apptura should let a builder describe a section, page, or starter app in normal language and receive an editable project that uses the same schema as manually created projects.

AI generation must preserve:

- normal editor behavior
- web and Android runtime parity
- grid and hierarchy rules
- project undo and redo
- save and autosave
- project data collections, bindings, actions, and page access
- future project portability and code export

AI must not create a separate app format or generate React and Kotlin source as the editor's runtime truth.

## Product Decisions

1. The first implementation will not use RAG, embeddings, or a vector database.
2. The model may propose exact grid positions and block dimensions.
3. Apptura validates every proposed position before presenting it to the user.
4. Apptura may repair simple layout errors deterministically.
5. Apptura may give the model up to two controlled correction attempts for complex validation errors.
6. The model produces an intermediate generation plan rather than unrestricted project JSON.
7. Deterministic Apptura code generates IDs, resolves references, applies defaults, and constructs the final project schema.
8. Generated changes are previewed before they affect the project.
9. Accepted generation is applied as one undoable project transaction.
10. AI endpoints never save project changes directly.
11. AI model credentials exist only in the backend environment.
12. Generated schemas may use only features supported by both the web and Android runtimes.

## Non-Goals

The first implementation will not include:

- RAG
- vector search
- embeddings
- fine-tuning
- autonomous agents
- arbitrary model tools
- AI access to MongoDB
- AI access to app-user records
- AI-generated React or Kotlin
- arbitrary custom code
- automatic project saving
- silent replacement of existing user work
- a multi-provider configuration UI
- generated image assets
- arbitrary remote image URLs

## Responsibility Model

```text
Builder describes the desired result
  -> backend builds controlled project context
  -> model returns an AppGenerationPlan
  -> plan validator checks the model response
  -> compiler produces normal Apptura schema
  -> project validator checks schema, references, hierarchy, and layout
  -> editor previews the proposal
  -> builder accepts or rejects it
  -> accepted proposal becomes one project-history transaction
```

The model decides:

- which pages and sections are useful
- what content each block should show
- which supported actions and bindings are needed
- visual hierarchy
- exact grid position and span proposals
- collection and field requirements
- page access intent

Apptura decides:

- IDs
- supported block types and properties
- block defaults
- final schema shape
- reference resolution
- permission presets
- grid validity
- simple layout repair
- runtime compatibility
- whether a proposal may be applied

## Target Architecture

```text
AI generation dialog
  -> authenticated backend generation endpoint
  -> context builder
  -> model client
  -> strict structural plan validator
  -> generation proposal
  -> frontend deterministic compiler
  -> canonical project and layout validator
  -> up to two bounded correction requests when validation fails
  -> isolated preview
  -> applyProjectTransaction
  -> undo/redo and autosave
  -> normal web and Android runtimes
```

Android does not need an AI SDK. It receives the same saved project schema it already renders.

## Context Without RAG

The backend can load or receive the small amount of structured context needed for generation directly. No semantic document retrieval is required.

Useful context includes:

- project name
- page names and paths
- current page summary when editing an existing page
- project collections and fields
- page access modes
- supported actions
- supported runtime bindings
- AI-supported block catalog
- grid dimensions
- block grid constraints
- supported container and Collection List relationships
- available visual presets
- available section recipes
- current schema and capability-catalog versions

Context should be compact. The backend should not send the complete repository, generated-app records, authentication data, uploaded file contents, or unrelated projects to the model.

Current local editor state can be summarized in the request so generation does not ignore unsaved changes. The backend must still load the project independently to verify ownership.

## App Generation Plan

The model returns an intermediate contract named `AppGenerationPlanV1`.

The contract uses temporary keys rather than database IDs:

```json
{
  "planVersion": 1,
  "scope": "page",
  "summary": "Add a crew directory and a form for creating crew profiles.",
  "collections": [
    {
      "key": "crew-members",
      "name": "Crew Members",
      "accessPreset": "authenticated-own-records",
      "fields": [
        {
          "key": "name",
          "label": "Name",
          "type": "text",
          "required": true
        },
        {
          "key": "role",
          "label": "Role",
          "type": "text",
          "required": true
        }
      ]
    }
  ],
  "pages": [
    {
      "key": "crew-directory",
      "title": "Crew Directory",
      "path": "/crew",
      "access": {
        "mode": "signedIn",
        "redirectPageKey": "sign-in"
      },
      "blocks": [
        {
          "key": "directory-title",
          "type": "hero",
          "content": {
            "headline": "Your Crew"
          },
          "grid": {
            "colStart": 2,
            "rowStart": 2,
            "colSpan": 12,
            "rowSpan": 3
          }
        },
        {
          "key": "crew-list",
          "type": "repeater",
          "collectionKey": "crew-members",
          "grid": {
            "colStart": 2,
            "rowStart": 6,
            "colSpan": 12,
            "rowSpan": 18
          }
        }
      ]
    }
  ]
}
```

The plan must not contain:

- MongoDB IDs
- final UUIDs
- raw `parentId` references
- arbitrary `props`
- arbitrary CSS
- JavaScript
- Kotlin
- API credentials
- direct database queries

The plan schema should reject unknown properties where practical. This prevents the model from inventing unsupported capabilities.

## Exact Grid Placement

AI may propose exact `GridPlacement` values:

```ts
type GridPlacement = {
  colStart: number
  rowStart: number
  colSpan: number
  rowSpan: number
}
```

This preserves more visual freedom than forcing every generated page through a fixed template.

For a normal page block, coordinates are relative to the page grid.

For a container child, coordinates are relative to the container.

For a Collection List child, coordinates are relative to one repeated item and must fit within the configured item height.

The model receives:

- the 16-column page width
- the current 29-row page limit
- block minimum and maximum spans
- existing occupied rectangles when modifying a page
- parent dimensions for child blocks
- supported child block types

The model does not receive permission to bypass those constraints.

## Layout Validation And Correction

Every generated layout passes through a deterministic validator.

Validation has two layers:

1. The backend validates the model response's contract, allowed values, temporary references, and basic numeric bounds before returning it.
2. The frontend compiles the plan and runs the canonical grid, collision, hierarchy, and final project checks already used by the editor.

The initial implementation does not duplicate frontend grid math inside the backend. The versioned plan contract, strict parser, and capability catalog now live in `app-builder/shared` and are consumed as `@apptura/shared/ai`. Editor-state compilation, canonical grid repair, final project validation, and proposal preview remain in the frontend because they operate against the builder's current unsaved project. If generation later becomes fully server-side or asynchronous, those additional pure modules can move only after their frontend dependencies are removed.

The validator checks:

- integer grid values
- page bounds
- block minimum and maximum spans
- sibling collisions
- valid parent types
- valid child block types
- child bounds
- Collection List item bounds
- unsupported nesting
- page overflow
- required navigation targets
- collection and field references
- page access redirects
- Android-supported block types and behavior

Example result:

```json
{
  "valid": false,
  "issues": [
    {
      "code": "block_collision",
      "blockKey": "create-profile-button",
      "overlapsWith": "crew-list",
      "message": "Move the button below row 21."
    },
    {
      "code": "page_overflow",
      "blockKey": "bottom-navigation",
      "message": "The block ends at row 31, but the page has 29 rows."
    }
  ]
}
```

### Simple Deterministic Repair

The frontend compiler may repair:

- positions that need grid snapping
- blocks that need to be clamped inside their parent
- text-bearing blocks whose proposed spans are too small for their configured content
- a single collision that can be resolved by moving to the nearest free area
- fragmented sibling layouts that can fit after a bounded top-to-bottom reflow
- a child-owner height that can safely grow within its existing bounds
- unreadable foreground/background combinations in generated Hero, Text, editable Text, Button, and bordered Collection List blocks

Repairs preserve the proposed position, dimensions, relative order, and any model color that already meets the configured contrast threshold. Hero and static Text foregrounds are checked against their page or repeated-item surface. Editable Text separately checks entered text, placeholder text, field labels, and visible borders. Button foregrounds are checked against the button surface, and buttons that disappear into the surrounding page receive a distinct surface color. These repaired colors are stored in normal block props, so web and Android render the same result.

Hero, text, editable-text, and button spans may grow deterministically when their configured font size, padding, label, placeholder, or copy would otherwise be clipped. If nearest-space repair fails because earlier model coordinates fragmented the page, the compiler makes one bounded attempt to repack that sibling group from top to bottom without changing its normalized spans or order. A proposal still fails safely when the blocks genuinely cannot fit within 29 rows. The compiler uses the same 390-unit, 16-column, 28-unit-row geometry shared by the web editor and Android preview; it does not depend on browser DOM measurement.

The proposal summary must tell the builder when Apptura changed the model's first layout.

### Model Correction

The frontend sends complex validation errors to a correction endpoint only when deterministic repair cannot produce a valid preview. It may make at most two correction requests after the initial draft, for three provider calls total.

```text
model draft
  -> backend structural validation
  -> frontend compilation and layout validation
  -> structured issue list
  -> correction endpoint
  -> corrected draft
  -> frontend compilation and layout validation
  -> optional second bounded correction
```

Each issue packet is bounded and sanitized. It can identify the semantic page and block keys, proposed and normalized grid placement, required and available spans, and nearby sibling keys. The model also receives versioned 16-column by 29-row layout guidance. If the second corrected draft remains invalid, generation fails safely. The system never enters an unbounded retry loop.

A correction may move or resize existing blocks and may reduce layout-related font sizes or padding. The backend preserves the previous plan's pages, blocks, collections, fields, non-layout content, and parent relationships. When the compiler explicitly reports a `missing-reference`, the affected action, binding, collection source, or access target may be replaced or removed; unrelated references remain protected. It rejects block-type changes and any attempt to add or remove pages or blocks. Automatic page splitting and block removal are not correction strategies.

Page references in a generation plan are local to that plan. A `targetPageKey` or `redirectPageKey` must match a `page.key` included in the returned plan; an existing project's title or path, such as `Home` or `/home`, is context rather than a valid generation key in the current milestone.

Complex errors include:

- many overlapping sections
- content that needs denser but still readable placement
- unresolved references
- invalid authentication flow
- layout that exceeds the fixed page budget after deterministic repair

The first implementation does not use interactive model tool calling. The frontend coordinates correction requests because it owns the canonical layout validator. The backend validates each previous plan and issue packet, calls the model, preserves the correction contract, counts every attempt against the normal quota, and rejects attempt numbers outside the two-correction window.

## Compiler Responsibilities

The compiler converts a valid plan into the current `Project` schema.

Compilation order:

1. Normalize the plan.
2. Allocate IDs for collections, fields, pages, containers, and blocks.
3. Create collections from safe access presets.
4. Create pages and unique paths.
5. Create blocks through the block registry.
6. Normalize proposed grid placements, expand undersized text-bearing blocks, and resolve resulting collisions.
7. Resolve parent keys into `parentId`.
8. Resolve page keys into navigation IDs.
9. Resolve collection and field keys into schema IDs.
10. Resolve editable fields into Button action field references.
11. Build `currentItem` bindings inside Collection Lists.
12. Apply page access and redirect references.
13. Set the current project schema version.
14. Run final project validation.

The existing template factory already demonstrates key allocation and reference resolution. The generation compiler should reuse or extract those pure mechanisms rather than reimplementing them inconsistently.

Newly generated schema should be valid by construction. Migration and hierarchy repair remain compatibility tools for older data, not a way to hide invalid generation.

## Proposal And Editor Lifecycle

The initial editor flow:

1. Builder chooses **Generate with AI**.
2. Builder describes the desired page or small page flow.
3. Frontend sends a bounded prompt with the supported `page` scope.
4. Backend verifies authentication and project ownership.
5. Backend loads the owned project and builds a privacy-limited structural summary.
6. Backend returns a validated generation proposal.
7. Frontend compiles the proposal against a cloned project.
8. Frontend validates and renders an isolated preview.
9. Builder reviews pages, collections, actions, warnings, and layout repairs.
10. Builder accepts or cancels.
11. Acceptance uses one `applyProjectTransaction`.
12. Existing autosave persists the accepted project.

The actual project must not change while the proposal is being generated or previewed.

Capture a local project revision when generation starts. If the project changes before acceptance, mark the proposal stale and require regeneration. Automatic merging is deferred.

## Generation Scopes

### Copy

- rewrite Text or Hero copy
- suggest Button labels
- generate empty-state messages

### Section

- hero
- content
- login or signup form
- record submission form
- Collection List
- action area

### Page

- page metadata
- page appearance
- multiple sections
- exact grid placement
- actions and bindings
- collection reuse
- page access

The first page-generation milestone should create new pages. AI editing of a populated existing page is deferred until a patch contract exists.

### App

- project name
- visual preset
- collections and fields
- signup and login pages
- public and protected pages
- navigation
- data submission
- current-user data
- Collection Lists

The first app-generation milestone should be bounded to:

- five pages
- five collections
- approximately sixty blocks
- native-supported blocks only
- existing action and binding types only

### Editing

Later AI editing should return explicit operations instead of a replacement project:

```text
addPage
updatePage
removePage
addBlock
updateBlock
removeBlock
addCollection
updateCollection
```

Every operation must be visible in the review step. Destructive operations require explicit confirmation.

## Backend Structure

Implemented modules:

```text
app-builder/backend/src/ai/
  AiProviderConfig.ts
  AiModelClient.ts
  AiGenerationService.ts
  AiContextBuilder.ts
  AiGenerationErrors.ts
  createAiModelClient.ts
  providers/
    FakeAiModelClient.ts
    OpenAiGenerationSchema.ts
    OpenAiModelClient.ts

app-builder/backend/src/controllers/AiGenerationController.ts
app-builder/backend/src/routes/AiGenerationRoutes.ts
```

Planned modules:

```text
app-builder/backend/src/ai/
  AiPromptBuilder.ts

app-builder/backend/src/middleware/aiRateLimits.ts
app-builder/backend/src/models/AiGenerationRun.ts
```

The provider boundary should remain narrow:

```ts
interface AiModelClient {
  generatePlan(request: AiModelRequest): Promise<unknown>
}
```

The first real provider is OpenAI. The interface keeps tests on a fake provider and prevents the SDK from leaking into controllers, services, shared contracts, or frontend code.

Provider configuration is backend-only:

```text
AI_PROVIDER=fake|openai
OPENAI_API_KEY=service-account-secret
OPENAI_MODEL=gpt-5.6-terra
AI_REQUEST_TIMEOUT_MS=60000
AI_GENERATION_REQUESTS_PER_HOUR=20
AI_USAGE_SUMMARY_DAYS=30
```

When `AI_PROVIDER=openai`, startup fails clearly if the key or timeout is invalid. The provider sends a hashed builder identifier rather than a raw account ID, disables response storage, handles refusals and incomplete output, removes schema-required `null` placeholders, and returns the resulting object to the existing shared parser.

Current endpoint:

```text
POST /projects/:projectId/ai/proposals
GET  /projects/:projectId/ai/usage
```

Planned endpoints:

```text
GET  /ai/capabilities
POST /projects/:projectId/ai/proposals/:proposalId/correct
POST /ai/app-proposals
```

`POST /ai/app-proposals` is deferred until prompt-to-app work begins.

The current backend response includes:

- proposal ID
- plan version
- context revision
- user-facing summary
- validated plan
- warnings
- provider/model and token usage for the request
- account quota limit, usage, remaining requests, and reset time

Layout repairs are still produced later by the frontend compiler because it owns canonical editor grid validation against the builder's current project state.

The backend should not expose hidden reasoning or model chain-of-thought.

## Shared And Frontend Structure

Current modules:

```text
app-builder/shared/src/ai/
  aiCapabilities.ts
  aiTypes.ts
  parseGenerationPlan.ts

app-builder/frontend/src/ai/
  compileGenerationPlan.ts
  generationLayout.ts
  validateGenerationProposal.ts
  fixtures/
    crewDirectoryPlan.ts

app-builder/frontend/src/hooks/useAiGeneration.ts

app-builder/frontend/src/components/ai/
  AiGenerateDialog.tsx
```

The shared package is pure TypeScript and has no React, browser, Express, database, or Android dependency. The frontend and backend toolchains reference it through the local `@apptura/shared` package. The editor compiler and backend generation service both consume it, and backend tests enforce the same contract. The Crew Directory fixture remains test input for deterministic compiler coverage; the production editor no longer uses it as its proposal source.

`useAiGeneration` owns request cancellation, loading and error state, quota refresh, a second shared-parser pass, compilation against the current project snapshot, and stale-proposal detection. `AiGenerateDialog` owns prompt entry and isolated proposal review. Provider settings and token counts remain backend concerns and are not exposed to normal builders.

The editor should expose one clear **Generate with AI** entry point. It should not expose model names, temperature, token counts, or provider settings to normal builders.

The review surface should show:

- pages created or changed
- collections created or reused
- block count
- navigation changes
- authentication requirements
- layout repairs
- validation warnings
- real preview

## Security

AI model credentials belong only in backend environment variables or Azure App Service settings. They must never use a frontend `VITE_` variable.

Required safeguards:

- builder authentication
- project ownership checks
- prompt length limit
- request body limit
- output size limit
- Mongo-backed per-account rate limits before provider calls
- provider timeout
- two validation corrections maximum after the initial draft
- safe error responses
- no credentials in logs
- no app-user records in context
- no model database access
- no automatic saving
- no arbitrary code execution
- HTTPS validation for generated external URLs

Text already stored in a project is untrusted context. Prompt construction must clearly separate system rules, project data, and the builder's request.

## Usage And Cost Controls

Each accepted request creates an `AiUsageRecord` containing:

```text
ownerId
projectId
scope
provider
model
status
inputTokens
outputTokens
totalTokens
cachedInputTokens
reasoningOutputTokens
durationMs
providerResponseId
sanitizedErrorCode
createdAt
```

Raw prompts and complete model responses are not stored. A separate short-lived `AiQuotaBucket` atomically limits accepted requests per account and hour, including deployments with multiple backend instances.

Usage records support:

- account quotas
- cost estimates
- failure monitoring
- latency monitoring
- abuse investigation

Additional controls:

- one active generation request per project
- idempotency keys
- no provider retry for service outages
- every correction consumes one normal quota attempt
- no automatic page splitting or block removal during correction
- feature disabled when backend credentials are missing

## Error Contract

Recommended HTTP behavior:

| Status | Meaning |
| --- | --- |
| `400` | Invalid prompt or request |
| `401` | Builder is not authenticated |
| `403` | Builder does not own the project |
| `422` | Model output could not produce a valid plan |
| `429` | Generation quota exceeded |
| `502` | Model provider failed |
| `503` | AI generation is not configured |

## Testing And Evaluation

### Unit Tests

- strict plan parsing
- unsupported property rejection
- ID allocation
- page-key resolution
- collection and field resolution
- action compilation
- binding compilation
- Collection List `currentItem` compilation
- valid exact placement
- collision detection
- page overflow rejection
- parent bounds
- access redirect validation
- deterministic repair

### Backend Tests

Use a fake `AiModelClient` to verify:

- authenticated generation
- project ownership enforcement
- invalid model response handling
- provider failure handling
- rate limiting
- timeout behavior
- generation never mutates the project

Normal CI must not call a paid model.

### Prompt Evaluations

Maintain versioned prompts such as:

```text
Create a login page.
Create a crew directory.
Create an inspection submission page.
Create a signed-in profile page.
Create a delivery checklist app.
Create a page that uses an existing collection.
Create an app with public and protected pages.
```

Track:

- valid-plan rate
- compile-success rate
- layout-validation rate
- reference-validation rate
- native-supported rate
- average correction count
- user acceptance rate
- manual edits after acceptance
- latency
- estimated cost

### End-To-End Checks

1. Generate a proposal.
2. Confirm the project has not changed.
3. Preview the proposal.
4. Accept it.
5. Undo it.
6. Redo it.
7. Save it.
8. Reload it.
9. Test web preview.
10. Test Android preview.
11. Test generated actions and bindings.

## Rollout Plan

### Phase 0: Contract And Compiler

- Completed: define the page-scoped `AppGenerationPlanV1` prototype contract
- Completed: build strict parsing with unknown-property rejection
- Completed: build the deterministic compiler
- Completed: build exact-placement and reference validation
- Completed: build bounded clamping and nearest-free-space repair
- Completed: add deterministic content-fit sizing for generated hero, text, editable-text, and button blocks
- Completed: add bounded sibling reflow when scattered model coordinates fragment otherwise sufficient page space
- Completed: preview and apply a hardcoded Crew Directory fixture
- Completed: extract the plan contract and strict parser into `@apptura/shared/ai`
- Completed: publish a versioned AI capability catalog for future backend prompts
- Remaining: complete manual Android rendering QA for the generated fixture

Exit condition: fixture plans compile into valid projects and render on web and Android.

### Phase 1: Backend AI Foundation

- Completed: add the model-client boundary
- Completed: add a fake provider
- Completed: add a backend-only OpenAI Responses API provider
- Completed: add validated provider/model/key/timeout configuration
- Completed: build controlled provider instructions and strict structured output
- Completed: build privacy-limited structural project context
- Completed: add an authenticated ownership-checked proposal route
- Completed: validate bounded provider output through `@apptura/shared/ai`
- Completed: add Mongo-backed account rate limits, usage records, provider token totals, and usage summaries
- Completed: add a bounded model correction endpoint with structured compiler diagnostics
- Completed: enforce stable page/block structure, protected non-layout content, and issue-gated reference changes during correction

Exit condition: the backend returns validated plans without mutating projects.

### Phase 2: Editor Prompt Integration

- Completed: connect the editor dialog to the authenticated proposal route
- Completed: show bounded prompt entry, request progress, quota state, and controlled errors
- Completed: parse, compile, validate, and preview returned page plans without mutating the project
- Completed: accept or cancel and apply acceptance as one project transaction
- Remaining: complete manual save/reload, undo/redo, web preview, and Android parity QA with live generated plans

Exit condition: live generated pages survive undo, redo, save, reload, web preview, and Android preview.

### Phase 3: Prompt-To-Page Expansion

- Completed: create one or more new pages
- Completed: support exact AI grid positions with deterministic repair
- Completed: create collections and compile actions, bindings, and page access
- Completed: detect stale proposals
- Planned: improve multi-section composition and style variation
- Planned: reuse compatible existing collections instead of always creating new ones

Exit condition: generated pages work without manual schema repair.

### Phase 4: Prompt-To-App

- add dashboard generation entry point
- generate multiple pages
- generate collections
- generate authentication flows
- validate navigation and access
- preview the complete proposal
- create the project only after acceptance

Exit condition: a generated starter app can authenticate users, submit data, display data, navigate, and render in Android.

### Phase 5: AI Editing

- define patch operations
- generate changes against existing pages
- show a change-by-change diff
- support selective acceptance
- protect unrelated work

Exit condition: AI can modify existing work without replacing unrelated project content.

### Phase 6: Production Hardening

- expand prompt evaluations
- add account and project usage analytics beyond the current quota indicator
- add plan-based quota and billing controls beyond the current hourly ceiling
- monitor failures and latency
- expand style variation
- add systematic Android parity coverage

## Implemented Generation Path

The editor now uses this production path:

```text
bounded builder prompt
  -> authenticated owned-project proposal request
  -> fake or OpenAI provider
  -> backend shared-parser validation
  -> frontend shared-parser validation
  -> deterministic compilation and layout validation
  -> isolated preview
  -> explicit one-transaction apply
  -> existing autosave and runtime rendering
```

The deterministic fixture remains in automated tests. The next AI milestone is manual end-to-end parity QA for live generated and corrected plans through save/reload, undo/redo, web preview, and Android preview.

## Related Documentation

- [Architecture](architecture.md)
- [Block and Schema Reference](block-reference.md)
- [Container and Template System](container-template-system.md)
- [Dynamic Data Binding](dynamic-data-binding.md)
- [Collection List / Repeater](collection-list-repeater.md)
- [Features](features.md)
- [Roadmap](roadmap.md)
