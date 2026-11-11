# Versioning

How releases are numbered and what changes from one version to the next.

## One version for all packages

All `@numior/*` packages share one version number. Install them at the same version so that the
components, forms and table fit each other:

```json
{
  "dependencies": {
    "@numior/vue": "1.4.0",
    "@numior/forms": "1.4.0",
    "@numior/table": "1.4.0"
  }
}
```

Vue stays a dependency of your app: the packages need version 3.5 or newer.

## What the number means

The version number follows SemVer:

| Part of the number | What changes                            | What to do                  |
| ------------------ | --------------------------------------- | --------------------------- |
| Third, `1.4.1`     | Bug fixes                               | Update without code changes |
| Second, `1.5.0`    | New components, props and slots         | Update without code changes |
| First, `2.0.0`     | Removed or changed props, events, slots | Follow the migration guide  |

Breaking changes ship only with a new first digit. Each such version comes with a migration
guide that lists the edits.

## Support for the previous version

After a new major version ships, the previous one gets security and critical bug fixes for six
more months. It gets no new features.
