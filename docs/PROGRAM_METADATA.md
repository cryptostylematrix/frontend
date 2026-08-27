# Crypto Style Marketing Program Metadata Standard

Version: 1.0  
Status: project standard

This document defines the JSON metadata served by a Crypto Style Marketing V3 program. The metadata supplies the public program name, card image, creator, features, entry and income information, and localized presentation links.

The machine-readable schema is published as [`public/program-metadata.schema.json`](../public/program-metadata.schema.json).

## 1. Discovery and delivery

The consumer obtains `metadata_uri` from the Marketing V3 `getBasicData`/basic-data response. Metadata is loaded only for an initialized program (`init === -1`).

The URI:

- MUST return a UTF-8 JSON object;
- SHOULD use the `application/json` content type;
- MUST be readable by browser clients, including the required CORS headers when hosted on another origin;
- MAY be an absolute HTTP(S) URL, a relative URL, or an `ipfs://` URI;
- SHOULD be stable for the lifetime of the corresponding contract deployment.

If the primary URI cannot be loaded, this frontend may use its bundled `series-marketing-{index}.json` file as a deployment-specific fallback. That fallback is not part of the wire format.

Producers SHOULD use HTTPS or content-addressed IPFS resources for production metadata and assets.

## 2. Conformance language

The keywords MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY describe requirements of this project standard.

Unknown top-level and nested properties MAY be supplied for forward compatibility. Consumers SHOULD ignore properties they do not understand. Producers MUST NOT change the meaning or type of a property defined by this version.

## 3. Complete example

```json
{
  "name": "Silver Matrix",
  "image": "https://example.org/programs/silver_matrix.jpeg",
  "creator": {
    "tg": "cryptostylematrix"
  },
  "features": [
    "clones",
    "structure management"
  ],
  "platforms": 2,
  "entry": {
    "price": 103,
    "currency": "USD",
    "kind": "fixed"
  },
  "incomes": [
    {
      "period": "program",
      "value": 1000,
      "currency": "USD",
      "kind": "minimum"
    }
  ],
  "presentations": {
    "pdf": {
      "en": "https://example.org/presentations/silver-en.pdf",
      "ru": "https://example.org/presentations/silver-ru.pdf"
    },
    "video": {
      "en": "https://www.youtube.com/watch?v=example"
    }
  }
}
```

Only `name` is required by the v1 consumer. All other fields are optional, but producers SHOULD provide every field for which verified information exists.

## 4. Top-level fields

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `name` | non-empty string | yes | Public program name. |
| `image` | non-empty URI-reference string | no | Card/marketing image. |
| `creator` | object | no | Program creator information. |
| `features` | array of non-empty strings | no | Feature identifiers displayed as localized tags. |
| `platforms` | non-negative integer | no | Number of program levels/platforms displayed on the card. |
| `entry` | object | no | Entry price information. |
| `incomes` | array of objects | no | Potential program income/output information. |
| `presentations` | object | no | Localized PDF and video links. |

An absent or invalid optional field is omitted from the UI. An absent, empty, or invalid `name` makes the complete metadata document unusable.

## 5. Image

`image` is resolved relative to `metadata_uri` when it is not absolute. `ipfs://` images are supported. An absolute HTTPS URL is recommended.

Example:

```json
"image": "./silver_matrix.jpeg"
```

The image SHOULD be square or close to square and suitable for display as a program card thumbnail. Producers SHOULD optimize its file size for web delivery.

## 6. Creator

`creator` currently defines one standard property:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `tg` | non-empty string | no | Telegram username, preferably without the leading `@`. |

The consumer strips one leading `@` for compatibility and links the value to `https://t.me/{username}`.

Example:

```json
"creator": {
  "tg": "cryptostylematrix"
}
```

## 7. Features

`features` is an array of unique, non-empty identifiers. Identifiers are normalized by the frontend to lowercase translation keys, replacing non-alphanumeric groups with `_`.

Canonical v1 feature identifiers currently include:

- `compression`
- `system places`
- `cycles`
- `full-distribution`
- `activation`
- `reinvest`
- `clones`
- `structure management`
- `linear`
- `tetra`

For example, both `structure management` and `structure-management` normalize to `structure_management`. A consumer may display an unknown feature verbatim when no translation is available, so identifiers SHOULD be concise and human-readable.

## 8. Platforms/levels

`platforms` MUST be a non-negative integer. The current UI presents this value as the localized number of levels.

```json
"platforms": 2
```

Do not use this property for matrix width, matrix height, or the number of database places.

## 9. Entry price

`entry` has the following fields:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `price` | non-negative number | yes | Human-readable entry amount. |
| `currency` | non-empty string | yes | Currency/asset symbol such as `USD`, `USDT`, or `TON`. |
| `kind` | `fixed` or `minimum` | no | Whether the price is exact or starts from this amount. Defaults to `minimum`. |

Examples:

```json
{
  "price": 103,
  "currency": "USD",
  "kind": "fixed"
}
```

```json
{
  "price": 10,
  "currency": "USDT",
  "kind": "minimum"
}
```

These are display values, not on-chain smallest-unit integers. On-chain command prices and Jetton decimals still come from contract data and Jetton metadata.

## 10. Incomes/output

Each `incomes` item has these fields:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `period` | non-empty string | yes | Income period identifier, normally `cycle` or `program`. |
| `value` | non-negative number | yes | Human-readable income/output amount. |
| `currency` | non-empty string | yes | Currency/asset symbol. |
| `kind` | `minimum` or `maximum` | no | Whether output starts from or reaches up to this value. Defaults to `maximum`. |

`minimum` is rendered as “from” without a compact-card period suffix. `maximum` is rendered as “up to … per {period}”. The period remains mandatory for both kinds so the underlying metadata retains its business meaning.

Examples:

```json
{
  "period": "program",
  "value": 1000,
  "currency": "USD",
  "kind": "minimum"
}
```

```json
{
  "period": "cycle",
  "value": 80000,
  "currency": "USDT",
  "kind": "maximum"
}
```

The legacy misspelling `preiod` is accepted by the current frontend for old metadata only. New and updated metadata MUST use `period`.

When multiple incomes are provided, consumers may choose the most relevant item for compact presentation. The current card selects the numerically highest value. Producers SHOULD avoid mixing incomparable currencies in one income list.

## 11. Localized presentations

`presentations` may contain `pdf` and `video` maps. Each map associates a base language code with a URI-reference.

Supported application languages are:

- `de` — German
- `en` — English
- `es` — Spanish
- `fr` — French
- `hu` — Hungarian
- `it` — Italian
- `kk` — Kazakh
- `pl` — Polish
- `pt` — Portuguese
- `ru` — Russian
- `uk` — Ukrainian

Example:

```json
"presentations": {
  "pdf": {
    "en": "https://example.org/program-en.pdf",
    "ru": "https://example.org/program-ru.pdf"
  },
  "video": {
    "en": "https://youtu.be/example"
  }
}
```

Language keys are normalized to lowercase base codes (`pt-BR` becomes `pt`). The consumer selects:

1. the current UI language;
2. `en` as fallback;
3. no presentation action when neither link exists.

Missing languages SHOULD be omitted. Empty strings are accepted for compatibility but are treated as missing and SHOULD NOT be emitted by new producers.

## 12. Currency presentation

The current card maps `USD`, `USDT`, and `USDC` to `$`, and `EUR` to `€`. Other currency strings are displayed in uppercase. This mapping is presentation-only and does not imply that these assets are interchangeable.

Producers SHOULD use a stable uppercase currency or token symbol.

## 13. Validation and compatibility

Metadata producers SHOULD validate documents against the published JSON Schema before deployment.

The current consumer applies these compatibility defaults:

- missing `entry.kind` → `minimum`;
- missing income `kind` → `maximum`;
- a leading `@` in `creator.tg` is removed;
- empty presentation links are ignored;
- unknown properties are ignored;
- malformed optional entries are omitted;
- `preiod` is read only as a legacy alias for `period`.

Changing a default in a future standard version requires an explicit versioned migration. Existing metadata must continue to render with its original meaning.

## 14. Producer checklist

Before publishing metadata:

1. Validate the JSON against `program-metadata.schema.json`.
2. Confirm `name`, image, prices, currencies, income qualifiers, and claims against an authoritative source.
3. Use `period`, never `preiod`.
4. Verify the metadata and every asset URL from a browser with no authenticated session.
5. Verify CORS for cross-origin resources.
6. Provide an English presentation fallback when presentations exist.
7. Test card rendering in all supported locales, especially number/currency order and plural forms.
8. Avoid changing a published URI's meaning without coordinating cache invalidation or contract metadata updates.
