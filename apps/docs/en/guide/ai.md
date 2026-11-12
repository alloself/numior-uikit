# AI assistants

How to hand an assistant the Numior UI docs in a form it reads without loss.

## A page as Markdown

Every page has a Markdown copy: add `.md` to its address. In the copy, examples come as code and
the API reference as tables.

```text
/en/components/button.md
```

The "Copy page" button next to the title puts this copy on the clipboard. Paste it into a chat
with your assistant along with your question.

## The llms.txt catalog

`/llms.txt` lists every page with a link to its Markdown copy. The format is described at
[llmstxt.org](https://llmstxt.org). Assistants and code editors use it to find the page they need.

| File                | Contents                           |
| ------------------- | ---------------------------------- |
| `/llms.txt`         | The list of pages in English       |
| `/llms-full.txt`    | The whole documentation in English |
| `/llms-ru.txt`      | The list of pages in Russian       |
| `/llms-full-ru.txt` | The whole documentation in Russian |
