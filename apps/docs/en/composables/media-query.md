# useMediaQuery

`useMediaQuery(query)` returns a ref that is `true` while a media query matches, for example
`'(max-width: 768px)'`. Before mounting and on the server the value is `false`, so the server
markup matches the first frame in the browser.

<Example name="composables/MediaQuery" />

## Signature

<SignatureReference name="useMediaQuery" />

## Behaviour

`query` takes a string, a ref or a getter. When the query changes, the composable follows the
new one.

This is how `NuiLayout` detects a narrow screen. Before mounting it treats the screen as wide,
and the sidebar does not flash.
