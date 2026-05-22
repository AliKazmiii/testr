# better-gdrive

[![Node](https://img.shields.io/badge/node-%3E%3D18-339933?style=flat-square&logo=node.js)](https://nodejs.org)
[![npm](https://img.shields.io/npm/v/better-gdrive?style=flat-square)](https://www.npmjs.com/package/better-gdrive)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](./LICENSE)

**Download and list files from public Google Drive links: no OAuth, zero runtime dependencies.**

Use it in Node or the browser: fetch blobs/buffers, stream to disk, read headers-only metadata, and parse share links into file IDs. Large files stay efficient (streaming where it matters).

---

## Features

- **No OAuth**: works with files and folders shared as *Anyone with the link*.
- **Small surface**: list folder, get file (`blob` / `buffer`), metadata, save to disk, extract ID from URLs.
- **Virus-scan flow handled**: if Google returns the confirmation page, the library submits it and continues.
- **Stable errors**: `GDriveDownloadError` with machine-readable `code` (`QUOTA_EXCEEDED`, `FOLDER_LIST_FAILED`, …).
- **Cancellable & mockable**: `AbortSignal` and optional custom `fetch` on every call.
- **TypeScript**: types shipped; ESM + CJS via `package.json` exports.

---

## Quickstart

```bash
npm install better-gdrive
```

```js
import { getFile } from "better-gdrive";

const buffer = await getFile("YOUR_FILE_ID_OR_SHARE_LINK", "buffer");
// use buffer (Node), or use "blob" in the browser
```

Requirements: **Node ≥ 18**. The Drive resource must be shared so the link works without signing in.

---

## Why this exists

Google’s public links are enough for many scripts and small apps, but wiring redirects, the virus-scan confirmation form, and error pages yourself is tedious. **better-gdrive** wraps that into a few async functions so you can focus on your data, not on Drive’s HTML.

---

## Installation

```bash
npm install better-gdrive
```

Import from the package root for normal use:

```js
import {
  listFiles,
  getFile,
  getFileMetadata,
  downloadFile,
  toFileId,
  GDriveDownloadError,
} from "better-gdrive";
```

---

## API overview

| What you need | Function |
|---------------|----------|
| List entries in a public folder | `listFiles(folderIdOrLink, options?)` |
| Load file in memory | `getFile(fileIdOrLink, "blob" \| "buffer", options?)` |
| Headers only (name, size, …) | `getFileMetadata(fileIdOrLink, options?)` |
| Stream file to disk (Node) | `downloadFile(fileIdOrLink, path, options?)` |
| Normalize link to id | `toFileId(input)` |

You can pass either a **raw file/folder id** or a **share URL**; ids are extracted automatically where applicable.

### Options

All of the above accept `options?: { signal?: AbortSignal; fetch?: typeof fetch }`. Cancel with `signal`, or inject `fetch` for tests or proxies.

### Virus scan warning

If Google serves the intermediate “virus scan” HTML page, the library parses the form and follows the confirmation URL; you do not need an extra manual step.

### Errors

Failures throw **`GDriveDownloadError`** with:

- **`code`**: use this for branching (e.g. `QUOTA_EXCEEDED`, `RESPONSE_NOT_OK`, `FOLDER_LIST_FAILED`).
- **`message`**, optional **`statusCode`**, **`fileId`**, **`cause`**.

Use **`isGDriveDownloadError(err)`** for type narrowing in TypeScript.

```js
import { getFile, isGDriveDownloadError } from "better-gdrive";

try {
  await getFile("FILE_ID", "buffer");
} catch (err) {
  if (isGDriveDownloadError(err) && err.code === "QUOTA_EXCEEDED") {
    /* handle shared-file download quota */
  }
  throw err;
}
```

### `better-gdrive/advanced`

For custom pipelines, tests, or tooling, import low-level pieces from the secondary entry (same version, separate bundle):

```js
import { fetchPublicFileResponse, getDownloadUrl } from "better-gdrive/advanced";
```

This surface may evolve more often than the root API. Only import paths listed under **`exports`** in `package.json` are supported.

---

## Examples

**List a public folder**

```js
import { listFiles } from "better-gdrive";

const files = await listFiles("https://drive.google.com/drive/folders/1ABC...");
// [{ id: "…", name: "report.pdf" }, …]
```

**Download as buffer (Node)**

```js
import fs from "node:fs";
import { getFile } from "better-gdrive";

const buf = await getFile("FILE_ID", "buffer");
fs.writeFileSync("./out.bin", buf);
```

**Metadata without full download**

```js
import { getFileMetadata } from "better-gdrive";

const meta = await getFileMetadata("FILE_ID");
console.log(meta.filename, meta.size, meta.lastModified);
```

**Save to disk with streaming (Node)**

```js
import { downloadFile } from "better-gdrive";

await downloadFile("FILE_ID", "./downloads/document.pdf");
```

**Extract id from a file link**

```js
import { toFileId } from "better-gdrive";

toFileId("https://drive.google.com/file/d/1abcXYZ/view?usp=sharing");
// "1abcXYZ"
```

---

## Exported types (main entry)

| Type | Role |
|------|------|
| `CommonOptions` | `{ signal?; fetch? }` |
| `FileMetadata` | `filename?`, `size?`, `mimeType?`, `lastModified?` |
| `ListFileEntry` | `{ id; name? }` |
| `ListFilesOptions` | Same shape as options for listing |
| `GDriveDownloadErrorCode` | Union of `err.code` strings |
| `FetchLike` | Type for injectable `fetch` |

Advanced-only types (`PublicDownloadPipelineOptions`, …) are exported from `better-gdrive/advanced`.

---

## Development

| Command | Purpose |
|---------|---------|
| `npm run build` | Build `dist/` with [tsup](https://tsup.egoist.dev/) |
| `npm test` | Build, then run [Node’s test runner](https://nodejs.org/api/test.html) on `test/*.test.mjs` |

---

## Contributing

Issues and pull requests are welcome. Please open an [**issue**](https://github.com/Sn4tchZ/better-gdrive/issues) to discuss larger changes before heavy refactors.

---

## Support

- **Bug reports & features:** [GitHub Issues](https://github.com/Sn4tchZ/better-gdrive/issues)
- **Changelog:** [CHANGELOG.md](./CHANGELOG.md)

---

## License

[MIT](./LICENSE)

---

*README structure draws on ideas from [How to Write A GitHub README for Your Project](https://www.daytona.io/dotfiles/how-to-write-4000-stars-github-readme-for-your-project) (Daytona / Dotfiles Insider).*
