# useMediaQuery

`useMediaQuery(query)` returns a ref with the media query result. Before mounting and on the
server the value is `false`, so the server markup and the first frame match. After mounting
the ref follows `matchMedia`.

<Example name="composables/MediaQuery" />

## Signature

<SignatureReference name="useMediaQuery" />

## Behaviour

The query takes a string, a ref or a getter; changing it re-subscribes the listener. This is
how `NuiLayout` detects a narrow screen: before mounting it treats the screen as wide and does
not flash the sidebar.
