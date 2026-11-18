# AI assistants

How to hand an assistant the Numior UI docs in a form it reads without loss.

## A page as Markdown

Every page has a Markdown copy: add `.md` to its address. In the copy, examples come as code and
the API reference as tables.

```text
/en/components/button.md
```

## The llms.txt catalog

`/llms.txt` lists every page with a link to its Markdown copy. The format is described at
[llmstxt.org](https://llmstxt.org). Assistants and code editors use it to find the page they need.

| File                | Contents                           |
| ------------------- | ---------------------------------- |
| `/llms.txt`         | The list of pages in English       |
| `/llms-full.txt`    | The whole documentation in English |
| `/llms-ru.txt`      | The list of pages in Russian       |
| `/llms-full-ru.txt` | The whole documentation in Russian |

## MCP server

The `@numior/mcp` package is an [MCP](https://modelcontextprotocol.io) server for Claude Code,
Cursor and other clients. It gives your assistant the component reference, the docs pages and
the examples, and it checks code for mistakes in how it uses Numior UI. The docs ship inside the
package, so the server works offline.

### Install the server

Add the package to your dev dependencies:

::: code-group

```sh [pnpm]
pnpm add -D @numior/mcp
```

```sh [npm]
npm install -D @numior/mcp
```

```sh [yarn]
yarn add -D @numior/mcp
```

```sh [bun]
bun add -d @numior/mcp
```

:::

The client starts the server with `npx -y @numior/mcp` and talks to it over standard input and
output. The server has the same version as the other `@numior/*` packages.

### Connect Claude Code

Register the server from the project root:

```sh
claude mcp add numior -- npx -y @numior/mcp
```

Put `--scope project` before the server name to save the setting in `.mcp.json`. Everyone who
works on the repository then gets the server.

### Connect Cursor

Add the server to `.cursor/mcp.json` in the project root:

```json
{
  "mcpServers": {
    "numior": {
      "command": "npx",
      "args": ["-y", "@numior/mcp"]
    }
  }
}
```

Other MCP clients start the server with the same command.

### Tools

| Tool              | What it returns                                                                |
| ----------------- | ------------------------------------------------------------------------------ |
| `list_components` | Components with their package, page and summary; filter by package             |
| `get_component`   | Props, models, events, slots and keys of a component, with a page copy         |
| `get_example`     | The files of a docs example by name, such as `select/Basic`                    |
| `get_page`        | The Markdown copy of a page by its address, such as `/guide/theming`           |
| `search`          | Pages that match words in their titles, summaries and text, best matches first |
| `list_tokens`     | Theme tokens with their light and dark values; filter by group                 |
| `list_icons`      | Icon names; filter by text                                                     |
| `check_usage`     | Mistakes in SFC code, each with a line number and a hint                       |

Tools that return text take `locale`: `en` by default, or `ru`.

### Check your code

Ask your assistant to call `check_usage` on every component it writes. The tool reports unknown
components, props and events, values outside a prop's list and imports of names a package does
not export. It also warns about Numior UI styles imported from a script or a component style block
and about selectors that restyle the components from outside.

```vue
<NuiButton variant="primary">Save</NuiButton>
```

Each finding has a line number and a hint:

```json
{
  "line": 2,
  "severity": "error",
  "code": "invalid-value",
  "message": "`NuiButton` does not accept `variant=\"primary\"`.",
  "hint": "Use one of: `solid`, `soft`, `outline`, `ghost`, `plain`, `link`. `primary` is a value of `tone`."
}
```
