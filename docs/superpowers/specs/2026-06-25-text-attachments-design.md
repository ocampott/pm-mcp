# Text Attachment Parsing for Trello & Jira — Design Spec

**Date:** 2026-06-25  
**Status:** Approved  
**Scope:** pm-mcp MCP server + pm-analize skill + CLAUDE.md workflow

---

## Problem

Users attach `.html` and `.sql` files (and other text documents) to Trello cards and Jira issues as part of their ticket requirements. The MCP server currently ignores the content of non-image attachments — it only returns their name, URL, and mimeType. Claude cannot read these files during ticket analysis, missing critical context.

---

## Goals

- Download and include the text content of text-type attachments in the tool result
- Support both Trello and Jira
- Protect against large files that would inflate token usage
- Controlled via an opt-in parameter so the default behavior is unchanged
- Update the pm-analize workflow to ask the user about text attachments

---

## Non-Goals

- Binary file types (PDF, Word, Excel) — not in scope
- Jira Confluence page attachments — not in scope
- Auto-summarizing file content — content is passed as-is to the model

---

## Solution Overview

### 1. Text File Detection

A file is considered "readable text" if it matches **any** of:

**By mimeType:**
- `text/*` (covers `text/html`, `text/plain`, `text/csv`, `text/xml`, `text/markdown`, `text/x-sql`)
- `application/json`
- `application/sql`
- `application/xml`

**By filename extension (fallback for empty/generic mimeType):**
- `.html`, `.sql`, `.txt`, `.md`, `.json`, `.csv`, `.xml`, `.yaml`, `.yml`

Both checks are applied — if either matches, the file is eligible for download.

### 2. New Download Function

One new function per module:

**`trello.ts` — `downloadTextAttachment(url: string): Promise<string | null>`**
- Uses same OAuth header as `downloadImage`
- Size cap: `MAX_TEXT_BYTES = 50_000` characters (checked after decode)
- If file exceeds cap: download the first 50 000 chars and append `\n[truncado: archivo excede 50 000 caracteres]`
- On HTTP error or exception: returns `null` (silent skip, logged to stderr)
- Decodes response as UTF-8 text (`response.text()`)

**`jira.ts` — `downloadJiraText(url: string, authHeader: string): Promise<string | null>`**
- Mirrors `downloadJiraImage` signature
- Same size cap and truncation logic
- Uses Basic auth header already constructed in `getJiraIssue`

### 3. New Type: `TextAttachment`

Added to both `trello.ts` and `jira.ts`:

```ts
export interface TextAttachment {
  name: string;
  mimeType: string;
  content: string;
  truncated: boolean;
}
```

### 4. Updated Return Types

**`TrelloCardData`** gains:
```ts
textAttachments: TextAttachment[];
```

**`JiraIssueData`** (the object returned by `getJiraIssue`) gains:
```ts
textAttachments: TextAttachment[];
```

### 5. New Tool Parameter

Both `get_trello_card` and `get_jira_issue` gain:

```
include_text_attachments: boolean  (default: false)
```

- `false` (default): text attachment content is not downloaded; files are still listed in `## Adjuntos` with their name/mimeType only
- `true`: eligible attachments are downloaded and their content is included in the output

Default is `false` because text content can be large and is not always needed for every analysis.

### 6. Markdown Formatter

When `textAttachments.length > 0`, a new section is appended in both `formatCardAsMarkdown` and `formatIssueAsMarkdown`:

```markdown
## Contenido de adjuntos (N)

### filename.sql
```sql
<content>
```

### spec.html
```html
<content>
```
```

Language hint for fenced code blocks is inferred from the file extension:
- `.sql` → `sql`
- `.html` / `.htm` → `html`
- `.json` → `json`
- `.xml` → `xml`
- `.csv` → `csv`
- `.md` → `markdown`
- `.yaml` / `.yml` → `yaml`
- `.txt` and unknown → *(no language hint)*

If a file was truncated, a note is appended inside the block:
```
[truncado: archivo excede 50 000 caracteres]
```

### 7. Workflow: CLAUDE.md + pm-analize skill

**CLAUDE.md `## Análisis de tarjetas y issues` — Paso 1** is expanded:

Current:
> Preguntale al usuario: "¿Querés que analice las imágenes adjuntas?"

New:
> Preguntale al usuario sobre imágenes **y** sobre adjuntos de texto.
> - Si el ticket tiene adjuntos de tipo texto (`.html`, `.sql`, `.txt`, etc.): preguntar si incluirlos.
> - Usar `include_text_attachments: true/false` según la respuesta.
> - Ambas preguntas se pueden hacer juntas (una sola interacción con `AskUserQuestion`).

The `pm-analize` skill itself (`pm-analize.md`) does not need changes — it delegates everything to CLAUDE.md.

---

## Data Flow

```
User: /pm-analize <card-id>
  └─ pm-analize skill
       └─ Paso 1: ask about images + text attachments
       └─ get_trello_card(card_id, include_images, include_text_attachments)
            └─ trello.ts: fetchTrello → rawAttachments
                 ├─ imageAttachments → downloadImage → base64 → TrelloImage[]
                 ├─ textAttachments (if include_text_attachments)
                 │    └─ downloadTextAttachment → string → TextAttachment[]
                 └─ otherAttachments → metadata only
            └─ index.ts: formatCardAsMarkdown(card, imageNames, textAttachments)
                 └─ MCP tool result (text + image content blocks)
       └─ Agent: analysis prompt receives full card markdown including attachment content
```

---

## File Change Summary

| File | Change |
|------|--------|
| `src/trello.ts` | Add `TextAttachment` type, `downloadTextAttachment()`, `isTextAttachment()` helper; update `getTrelloCard` signature and logic; update `TrelloCardData` |
| `src/jira.ts` | Add `TextAttachment` type (shared or re-exported), `downloadJiraText()`, `isTextAttachment()` helper; update `getJiraIssue` signature and logic |
| `src/index.ts` | Add `include_text_attachments` param to both tool schemas; pass to `getTrelloCard`/`getJiraIssue`; update both formatters |
| `~/.claude/CLAUDE.md` | Expand Paso 1 to cover text attachments |

---

## Size & Token Budget

| Scenario | Approx tokens |
|----------|--------------|
| 1 × `.sql` file, 200 lines | ~800 tokens |
| 1 × `.html` file, full page | ~3 000–8 000 tokens |
| Max cap (50 000 chars) | ~12 500 tokens |

These are additive to the existing card content. The opt-in default protects users who don't need attachment content.

---

## Testing

- Unit tests in `trello.test.ts`: mock fetch, verify `downloadTextAttachment` returns text, truncates at cap, handles errors
- Unit tests in `jira.test.ts`: same for `downloadJiraText`
- Manual: Trello card with a `.sql` and a `.html` attachment; verify content appears in output
