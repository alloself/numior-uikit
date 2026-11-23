export default {
  // The Conventional Commits preset is pinned to a writer-8-compatible version.
  branches: ['stable', { name: 'master', prerelease: 'alpha' }],
  tagFormat: 'v${version}',
  plugins: [
    ['@semantic-release/commit-analyzer', { preset: 'conventionalcommits' }],
    ['@semantic-release/release-notes-generator', { preset: 'conventionalcommits' }],
    './scripts/release/workspace.mjs',
    [
      '@semantic-release/github',
      {
        assets: [{ path: '.release/*.tgz', label: 'npm package' }],
        successComment: false,
        failComment: false,
        releasedLabels: false,
      },
    ],
  ],
};
