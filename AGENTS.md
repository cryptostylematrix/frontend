# Crypto Style Matrix frontend

## Scope

This repository is the React/TypeScript frontend for Crypto Style Matrix. It is built with Vite, uses React Router and i18next, integrates TON Connect, and is deployed to GitHub Pages below the `/frontend/` base path.

These instructions apply to the whole repository. Preserve unrelated user changes: the working tree is often intentionally dirty.

## Commands and verification

- `npm run dev` starts Vite.
- `npm run build` runs `tsc -b` and creates the production bundle.
- `npm run lint` runs ESLint.
- `npm run preview` serves the built bundle.

For application changes:

1. Search for all imports, routes, constants, and translation keys affected by the change.
2. Validate changed JSON metadata and locale files.
3. Run `git diff --check`.
4. Run `npm run build`.
5. Run `npm run lint` when available, and distinguish pre-existing tool/configuration failures from new findings.

The existing Vite large-chunk warning is not a build failure. Never edit `dist/`; it is generated.

## Technology and layout

- React 19, TypeScript, Vite, React Router, i18next.
- `@ton/core`, `@ton/ton`, and TON Connect handle TON data and transactions.
- `src/App.tsx` owns global providers and routes.
- `src/pages/` contains route-level pages. Every page has its own CSS file.
- `src/components/` contains shared and feature components. Non-trivial components have their own CSS files.
- `src/context/` contains wallet-adjacent profile state and generic program state.
- `src/services/` contains API clients, metadata loading, and transaction orchestration.
- `src/contracts/` contains only the few client-side schemas/wrappers still required. Prefer contract-backend endpoints to new browser-side wrappers.
- `src/programs.ts` is the source of truth for fixed actual and test marketing addresses.
- `public/series-marketing-{index}.json` contains bundled program metadata fallbacks.
- `public/locales/<locale>/translation.json` contains translations.

Use `rg` and `rg --files` before adding, moving, or deleting files. Remove dead compatibility layers once their last consumer is removed.

## Routing and program architecture

All current programs—including Multi, Neo, and CryptoCash—use the generic route:

`/programs/:marketingAddress/*`

Children are:

- `inviter` (the default/index redirect)
- `referrals`
- `structures`
- `marketing`
- `stat`

`ProgramProvider` exposes only the marketing address from the route. Program pages and components must obtain it through `useProgramContext()`; never replace it with the selected profile address, a top-place address, or a cached program address.

The legacy `/multi` and `/neo` pages, their components, their contexts, and their dedicated API services have been removed. Do not recreate them. Reusable behavior belongs under `pages/programs`, `components/programs`, `ProgramContext`, `StructuresContext`, `programApi`, or `programStructuresService`.

### Actual and test programs

Address constants live in `src/programs.ts`:

- Production constants start with `ACTUAL_`.
- Test constants start with `TEST_`.
- `TEST_PROGRAM_ADDRESSES` defines test-card order.
- Never place a test deployment in `AvailablePrograms` or a production deployment in `AvailableTestPrograms`.
- Compare TON addresses by parsing and comparing their raw representation when formatting may differ.

`AvailablePrograms` currently renders actual Multi, Neo, and CryptoCash through `ProgramBlock`.

`AvailableTestPrograms`:

- is visible only to wallets in `appConfig.availableTestPrograms.walletAddresses`;
- accepts a comma-separated override from `VITE_AVAILABLE_TEST_PROGRAM_WALLETS`;
- normalizes configured and connected addresses to raw TON addresses;
- uses only `TEST_PROGRAM_ADDRESSES`;
- displays only addresses whose metadata loads successfully;
- shows localized loading text while resolving cards.

Do not calculate card addresses from series/admin configuration unless a new requirement explicitly restores that mechanism.

## Program metadata and cards

`ProgramBlock` receives only a marketing contract address. It obtains Marketing V3 basic data, follows `metadata_uri`, and renders the card. The same component is used by actual and test lists.

The normative project specification is `docs/PROGRAM_METADATA.md`; its machine-readable schema is `public/program-metadata.schema.json`. Keep the parser, schema, documentation, examples, and bundled metadata aligned whenever the model changes.

Metadata rules:

- Prefer the URI returned by Marketing V3 basic data.
- `programsService` may fall back to bundled `series-marketing-{index}.json` metadata when it can resolve a known series index.
- Handle relative, HTTP(S), and IPFS asset URLs safely.
- Keep presentation keys for all locales: `de`, `en`, `es`, `fr`, `hu`, `it`, `kk`, `pl`, `pt`, `ru`, `uk`.
- For PDF/video links, try the selected locale, then `en`; hide the action if both are empty.
- YouTube channel selection is locale-specific, with English fallback.
- Do not invent prices, income totals, periods, currencies, feature claims, or presentation links.
- Multi and Neo card entry/exit wording follows their established legacy pricing presentation, selected by normalized actual address through `getLegacyPricingProgramKey`.

Program headers display the metadata name plus compact copy and Tonviewer icon actions. The address comes from context and is not printed as a large block.

## API boundaries

There are three important boundaries:

- `uiProfileApi`: backend persistence and ownership checking for saved wallet profiles.
- `programApi`: referral-program invites, structures, places, trees, locks, and statistics.
- `contractsApi`: contract reads and server-built message bodies.

Transport DTOs must match backend JSON exactly, including intentional spellings such as `ative`. Keep snake_case transport properties (`profile_addr`, `place_number`, `created_at`, etc.). Build separate UI/view models when aggregation or renamed presentation fields are needed.

API helpers should:

- trim and validate inputs;
- URL-encode path/query data;
- treat documented 404 responses as `null` where absence is a normal state;
- avoid silently converting unrelated server failures into valid empty data when the caller needs an error state.

Unix timestamps returned by these APIs are seconds. Convert them with `new Date(Number(value) * 1000)` unless the endpoint explicitly documents milliseconds.

### Contract API and TON client

Prefer the contracts backend for:

- Marketing V3 basic/full data;
- Marketing V3 exec-message serialization;
- Jetton transfer-body serialization;
- Jetton wallet/minter data and metadata;
- required profile/collection reads and message bodies.

Do not restore deleted legacy matrix/marketing endpoints or wrappers merely because similarly named types remain in the consolidated `contractsApi`.

All direct TonCenter access must use the shared client from `tonClient.ts`. It limits starts to 10 requests per second and retries retryable network/server failures after 2, 4, 8, 16, and 32 seconds. Do not instantiate an unthrottled TonClient elsewhere.

## Profiles

The UI backend is the source of truth for saved profiles associated with a wallet.

- Run `checkWalletProfiles` whenever a non-empty wallet becomes active, even if the browser has no saved profiles. This restores profiles on a new device.
- The check response already contains refreshed profiles; do not follow it with a redundant get request.
- Apply a response only if its wallet is still the active wallet; avoid stale async updates after wallet switches.
- The current profile login may remain locally stored as a selection preference, but the profile collection itself belongs to the backend.
- Migrate legacy local/cookie profile storage once: submit every old profile intent, retain only failed migrations for retry, and remove successfully migrated entries.
- If an owner-mode migration is rejected but preview mode is available, migrate it as preview.
- A profile that no longer belongs to the connected wallet is retained and marked `preview`; ownership changes in either direction are reflected by backend check results.
- Adding a foreign profile first returns the preview option. The confirmation must explain that preview mode permits viewing but not modifying data.
- Do not show a permanent preview warning panel; preview and owner profiles share the normal UI.
- For every transaction/user command made while a preview/foreign profile is selected, the confirmation must prominently identify that the action targets a foreign profile. The wallet signature remains the final authorization.
- Display preview status compactly in the profile selector. Long logins must ellipsize, and the current entry in the open list must be visually distinct.
- Profile addresses need compact copy and explorer actions where established.

Profile logins are lowercase and contract-compatible:

- length 4–20;
- ASCII lowercase letters, digits, and internal hyphens;
- first and last characters must be alphanumeric;
- normalize to lowercase before validation/submission.

## Generic program state

`ProgramContext` owns the route marketing address.

`StructuresContext` owns:

- selected structure number;
- selectable structure options;
- commands for the selected structure;
- first and selected place references;
- structure refresh keys;
- queue refresh/purchase synchronization.

Load Marketing V3 structures when `marketingAddress` changes, not every time `selectedStructure` changes. Derive the selected structure's commands locally from the loaded structure map.

Structure `0` is special: it is the inviter/referral structure and must not appear in the selectable business-structure list.

A place reference is the pair:

`profile_addr + place_number`

`profile_addr` may be `null` for a system place; `place_number` remains required and meaningful. Use stable composite React keys rather than `place_number` alone where different profiles can collide.

## Structures, matrices, and terminology

- `max_places_per_profile === 0` means unlimited.
- A structure with `height > 0` uses matrix terminology in navigation/headings.
- Controls that need a real matrix grid (matrix filling counts and “only unclosed”) require both `width > 0` and `height > 0`.
- A zero-height structure uses level terminology and does not show “places in matrix”.
- Tree details display backend `level` as user-facing “line”.
- Localize these distinctions in all supported languages; do not hardcode Russian or English in components.

`getPlaces` returns `PlaceWithMatrix` data. For matrix structures, place option titles may append `(matrix_filling/matrix_size)`. The “only unclosed” checkbox sends `only_not_closed=true`, resets pagination/selection when changed, and is hidden for non-matrix structures.

Lock list positions are 1-based and structures may be wider than two. Always display `locked_pos` as the actual numeric position; never translate it into left/right.

### Positioning, searching, paths, and trees

- `getNextPos` accepts an optional operation (`buy_place`, `buy_first_place`, etc.); omit it to use backend default positioning.
- Search uses `viewer_profile_addr`. The backend is responsible for applying owner/profile positioning semantics; do not swap the globally selected profile with a returned top-place profile.
- `getPath` uses the viewer profile plus the target `profile_addr + place_number`.
- `getTree` accepts nullable target `profile_addr`, target `place_number`, current `viewer_profile_addr`, connected `viewer_wallet_addr` when available, and the position window.
- Always pass the selected current profile as `viewer_profile_addr`.
- System places must remain selectable and tree-loadable with a null target profile address.

System-place presentation:

- show `SC` (System Clones) instead of `-` or a missing login;
- use the standard/default system image in details;
- preserve the place number so selection remains unambiguous.

### Tree actions

The tree-node DTO is authoritative. Do not duplicate eligibility algorithms in React.

Base-node fields include `locked`, `is_lock`, `can_lock`, and `can_unlock`.

For empty nodes:

- show buy only when `can_buy` is true and `buy_command_tag` is provided;
- use `buy_command_tag` exactly;
- serialize the position only when `include_position` is true.

For lock/unlock:

- show lock from `can_lock`;
- show unlock from `can_unlock`;
- use `locked`/`is_lock` for state and presentation, not to invent action permission;
- do not require a Tonviewer link in tree details.

`buy_top_place` is no longer supported. Do not add it to command unions, queue watchers, or fallback selection logic.

Filled-node details may display rank, matrix place count, descendants, line, active status, creation time, and activation time. Supported ranks are Bronze, Silver, Gold, Platinum, Sapphire, Emerald, and Diamond. Localize rank names and use solid rank-specific badge colors—no gradients and no excessively rounded pill styling.

## Buying places and other commands

The program backend's `purchase-option` response is the authority for the general buy action:

- `can_buy` controls visibility/availability;
- `command_tag` selects `buy_first_place` or `buy_place`;
- `include_position` controls payload inclusion;
- `position` provides the backend-selected parent/profile/place/position.

Do not reconstruct this decision from counts in multiple UI components. The backend option already accounts for place limits, command support, and position algorithm configuration.

Command price, `sender_jetton_wallet`, and `gram_fee` belong to the command selected from `marketingData.structures[structure].commands`, not to the structure context globally.

- TON command amounts are nanotons; display with `fromNano`.
- For Jettons, fetch minter metadata/data and use its decimals and symbol. Never assume six decimals or hardcode USDT.
- Check the sender Jetton wallet balance before sending.
- Build the Marketing V3 exec body through the contracts API.
- For Jetton commands, embed the exec body as the Jetton transfer forward payload, use command price as Jetton amount, command gram fee as forward TON amount, the connected wallet as response destination, and attach gram fee plus 0.05 TON.
- Use a random time-based unique query ID.
- Lock/unlock uses the same TON-versus-Jetton command configuration path.

After a successful buy submission, immediately notify `StructuresContext` so queue polling begins. It polls Marketing V3 queue tasks for `buy_first_place` and `buy_place`; when a tracked task disappears, it polls `getLastPlace`, compares the composite place key, refreshes page data, selects the new place, and clears the pending success notification through the refresh key.

Task queue order shown to users is based on the item's queue index, not `seq_no`.

## Inviter and referrals

- Use the spelling `referrals` in frontend code and routes. Preserve an external API's misspelled namespace only where required for interoperability.
- `getInviterData(marketingAddr, profileAddr)` returns the configured inviter; a 404 means none exists.
- Show `ChooseInviter` only when no inviter exists and no choose-inviter task for the profile is processing.
- Inviter selection derives the inviter profile address from login, builds command payload/message data, sends it through Marketing V3, and reflects queue state with the shared `TaskQueueBlock`.
- Popular/root curator data comes from `getRootInviteInfo(marketingAddr)`.
- Referrals load root/children through `referralsService` and `programApi`, with a default page size of 20.
- Use the marketing address from `ProgramContext` for every referral call.
- In Russian use “Куратор”, not “Пригласитель”; use the same semantic choice in every locale.

## Statistics

Statistics come from:

`GET /api/program/{marketing_addr}/statistics?profile_addr={profile_addr}`

- A 404 means the profile is not registered in the program.
- `referrals` contains overall direct-referral totals.
- `structures` includes every configured structure, including zero-place structures.
- Structure `0` represents the referral/program-wide structure.
- Use `total_profiles` and `active_profiles` for partner/person counts.
- `total_places` and `active_places` count database place rows and may exceed unique profiles due to reinvests or multiple places. Never label them as partner counts.
- Keep direct-referral participation separate from whole-structure totals.
- Follow the established statistics layout rather than duplicating structure `0` under misleading headings.

## Localization

Every user-visible string added or changed in program pages/components and profile flows must be translated in all 11 locales:

`de`, `en`, `es`, `fr`, `hu`, `it`, `kk`, `pl`, `pt`, `ru`, `uk`

Do not consider an English `defaultValue` a completed translation. Keep keys and interpolation variables consistent across locale files and validate edited JSON.

Established Russian wording includes:

- curator: `Куратор`;
- test programs: `Программы на стадии тестирования`;
- matrices: `Матрицы`;
- levels/non-matrix structures: `Уровни`;
- tree level field: `Линия`;
- only unclosed: `Только незакрытые`.

Adapt meaning naturally rather than transliterating terminology word-for-word.

## UI conventions

- Use compact text plus transparent icon buttons for copy/explorer actions.
- Keep icons vertically centered with the associated text and avoid excessive vertical padding.
- Copy actions show a short visible success state and reset when the copied address changes.
- Tonviewer links use `https://tonviewer.com/{address}`.
- Long profile logins in the top-right selector truncate with an ellipsis.
- The selected profile in the open menu has a distinct background or font weight.
- Avoid permanent warning blocks when a transaction confirmation can provide the relevant warning at the moment of action.
- Preserve accessible labels, titles, loading states, disabled states, and stable list keys.

## Deletion and migration guidance

Before removing a page or feature, trace all imports and delete components, CSS, contexts, and service modules used only by it. Also remove its routes, hidden legacy links, and now-unused config entries. Do not remove shared program metadata, actual program address constants, or generic `ProgramBlock` cards merely because an old route was deleted.

The following legacy modules are intentionally gone and should not be restored without a new explicit requirement:

- `src/pages/multi`
- `src/pages/neo`
- `src/components/marketing`
- legacy `MarketingContext`
- `matrixApi`, `marketingApi`, `marketingService`, and `structureService`
