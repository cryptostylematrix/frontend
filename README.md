# Crypto Style Matrix frontend

## Program metadata standard

Marketing V3 program metadata is documented in [docs/PROGRAM_METADATA.md](docs/PROGRAM_METADATA.md). A machine-readable JSON Schema is available at [public/program-metadata.schema.json](public/program-metadata.schema.json) and is published with the frontend at `https://cryptostylematrix.github.io/frontend/program-metadata.schema.json`.

## Vite development notes

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

## Program specification data

The specification page composes module-owned APIs:

- `programApi`: `GET /api/program/{marketing_addr}/structures` (404 means no registered structure data).
- `scheduledTasksApi`: `GET /api/scheduled-tasks/schedules?module=program&scope={stored_address}&resource_type=structure` (an empty array means no schedules; failures are shown separately).
- `contractsApi`: Marketing V3 contract data and Jetton metadata.

Schedules use the stored address returned by the structures API when available.
`VITE_SCHEDULED_TASKS_API_HOST` optionally sets the schedules API host; otherwise
it uses the default API host. Deploy this frontend with the split backend APIs;
the old combined `/specification` endpoint is no longer used.


## UI report

The Administration menu item uses the test-program wallet allowlist
(`VITE_AVAILABLE_TEST_PROGRAM_WALLETS`) through `testProgramAccess`.
It opens `/administration`, which defaults to `/administration/test-programs`.
The submenu links to programs in testing and account usage statistics at
`/administration/usage`. Both sections have moved off the home page and do not
require a selected profile. The old `/ui-report` URL redirects to the usage section.
Only menu visibility is gated; the report page and API remain public, with no
wallet signature, bearer token or backend authorization.

The report includes latest wallet–profile assignments, a TonConnect pie with four
independent grouping checkboxes (contract version, wallet name, app version,
platform), last-connected wallets by UTC period, and a language pie.
Dates and times display in the browser’s local time zone; the Today filter
still starts at UTC midnight. Select both
wallet name and app version to group their combination. Tables show totals first
and at most 10 records per page. Pies show totals, counts and percentages.
Unknown future language tags are shown as stored.

Deploy with the matching backend report endpoints. See the backend UI module
README for populations, last-link rules, periods and index migration 007.
Run `node --test tests/*.test.mjs` for service, chart and localization regressions.
