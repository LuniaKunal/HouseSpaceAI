# AI interior editing: provider research notes

Researched: 10 September 2026. Discussion material only; no provider integration or paid generation was performed. These notes describe documented capabilities, not a benchmark of output quality. Model names, prices, and account access must be checked again when implementation starts.

## Recommended direction

Start with hosted image editing for room redesign, empty-room staging, and targeted changes. Run an evaluation of OpenAI GPT Image and Black Forest Labs FLUX.2 before selecting a production default. Keep the application's job and asset model independent of either provider. Do not train or operate a custom diffusion service before the hosted options have demonstrated a measurable limitation.

This is an engineering recommendation: the most important comparison is **cost per accepted room result**, with architectural preservation as a gating requirement. A cheap image that changes windows, walls, or camera position can be a worse product outcome than a more expensive usable edit.

## Verified options

| Option | Documented capability | Proposed HomeSpace use | Practical limitation |
|---|---|---|---|
| OpenAI GPT Image | Current official guidance lists `gpt-image-2.5-sunburst` for editing precision and `gpt-image-2.5-flare` for faster generation. Image API offers generation and editing; Responses API supports conversational workflows. Masks guide edits but are not guaranteed to be followed exactly. | Benchmark Sunburst for room-preserving redesign and selected-area editing; evaluate Flare for draft variants. | A selection mask is not a pixel lock. Avoid promising untouched architecture solely because the prompt says to preserve it. |
| BFL FLUX.2 | Instruction-driven editing, multiple image references, and output up to 4 megapixels. The documentation describes variants for precision, production throughput, and configurable control. | Benchmark furniture/reference transfer and staged-room variants. | Reference support does not establish exact furniture dimensions or architectural accuracy. Those require our own tests. |
| Diffusers ControlNet | Structural conditioning using edges, depth, and other control images, including combinations with configurable conditioning weight. | A later experiment when hosted edits fail to preserve room structure; also useful for sketches and viewport renders. | More model selection, preprocessing, GPU operation, and tuning. Conditioning guides output; it is not a CAD constraint solver. |

Sources: [OpenAI image-generation guide](https://developers.openai.com/api/docs/guides/image-generation), [BFL FLUX.2 editing](https://docs.bfl.ai/flux_2/flux2_image_editing), [Hugging Face Diffusers ControlNet guide](https://huggingface.co/docs/diffusers/using-diffusers/controlnet). The use cases and limitations in the final two columns are implementation judgments unless explicitly described as documented.

### Integration implications

- Use a server-owned generation job, even when a provider request can complete synchronously. The browser should retain a job ID and recover its state after refresh.
- BFL's documented flow returns a request ID and polling URL; completed image URLs are signed and valid for ten minutes. Copy outputs promptly into application-controlled storage rather than saving only a provider URL. [BFL editing workflow](https://docs.bfl.ai/flux_2/flux2_image_editing)
- Keep the original upload immutable. Every output should record its parent image, operation, style version, prompt version, provider/model, normalized parameters, and usage. A user's next edit should create a new version.
- Store capability flags in each adapter: supports masks, supports references, supported dimensions, and output types. Do not expose one universal “strength” slider unless each adapter has a tested interpretation.
- For a strict selected-area tool, evaluate compositing the approved generated region over the original. This can preserve pixels outside the region but creates seam, lighting, and occlusion problems that must be inspected.
- Put API credentials in the backend, validate actual image bytes and dimensions, limit concurrent jobs, and implement idempotency before billing users for generation.

These are proposed application design choices, not claims about provider internals.

## Pricing and measurement

OpenAI documents token-based image usage; model, quality, image size, and input images affect request cost. Record the response's usage and calculate actual request cost from the applicable pricing table. Equal per-token rates do not imply equal per-image cost. [OpenAI image-generation guide](https://developers.openai.com/api/docs/guides/image-generation), [OpenAI API pricing](https://developers.openai.com/api/docs/pricing)

BFL documents megapixel-based FLUX.2 pricing, with model-specific rates and input/output charges. Estimate the entire edit, including reference images, from the selected endpoint's current table. [BFL pricing](https://docs.bfl.ai/quick_start/pricing)

Proposed metric:

`cost per accepted output = (generation + retries + preprocessing + storage/egress + review costs) / accepted outputs`

Keep draft and export quality separate. Cap batch size and retries. Reserve application credits at submission, settle on completion, and release reservations on terminal failure. A timeout with an unknown provider outcome should trigger reconciliation before resubmission to avoid duplicate work and charges.

## Evaluation before choosing a default

Use 30–50 consented room photos covering small rooms, wide-angle views, mirrors, mixed lighting, clutter, empty spaces, and visible doors/windows. Run identical operation briefs across candidates and preserve the exact model/parameter versions.

Score architecture/camera preservation first; then style adherence, furniture plausibility, selected-region accuracy, artifacts, and user preference. Log median and tail latency, failure rate, retry count, cost, and reviewer acceptance. Include staging, redesign, furniture removal, and one targeted material change. Do not accept a favorable average if particular room types fail consistently. Proposed release thresholds should be agreed before running the benchmark.

## Later immersive experiment: World Labs

World Labs documents world generation from text, image, multiple images, or video, returning a long-running operation. The quickstart describes splat, panorama, and collider-mesh assets. This is a potential later “explore this concept” feature. [World Labs quickstart](https://docs.worldlabs.ai/api), [generation API](https://docs.worldlabs.ai/api/reference/worlds/generate)

SparkJS is the provider's recommended browser renderer for splats and builds on Three.js; its example projects are explicitly experimental. [World Labs tools and examples](https://docs.worldlabs.ai/api/examples)

World API uses separate credits from the Marble web application. Cost depends on generation events; panorama generation and exports can add charges. Build application spend limits rather than assuming a prepaid balance is a hard cap: current billing documentation describes overages. [World Labs pricing](https://docs.worldlabs.ai/api/pricing)

Product judgment: do not equate a generated navigable world with a measured reconstruction of the customer's house. A single photo does not reveal unseen geometry. Keep this feature clearly labeled as a concept preview, and defer it until the core photo-editing workflow succeeds.

## Remaining unknowns

- Actual room-preservation quality and customer acceptance: no generations were run for these notes.
- Account-specific model access, rate limits, production concurrency, and negotiated pricing.
- Provider retention, regional processing, deletion guarantees, and terms applicable to the intended deployment: verify before sending customer images.
- Whether a later 3D workflow needs visual exploration or editable, dimensionally accurate geometry; these are materially different requirements.
