import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';

const MAIN = 'master';

const RULE = 'Правило: .archcore/development-flow.rule.md.';

const TOKEN = /"((?:[^"\\]|\\.)*)"|'([^']*)'|(&&|\|\||[;|&\n])|([^\s"';|&]+)/g;

const WRAPPERS = new Set([
  'rtk',
  'proxy',
  'env',
  'command',
  'exec',
  'nice',
  'nohup',
  'time',
  'sudo',
]);

const GLOBAL_WITH_VALUE = new Set(['-C', '-c', '--git-dir', '--work-tree', '--namespace']);

const READ_ONLY = new Set([
  'status',
  'log',
  'diff',
  'show',
  'rev-parse',
  'rev-list',
  'ls-files',
  'ls-tree',
  'blame',
  'grep',
  'cat-file',
  'for-each-ref',
  'describe',
  'shortlog',
  'fetch',
  'worktree',
]);

const REPLAYS = new Set(['rebase', 'cherry-pick', 'revert', 'am']);

const STOPS = new Set(['--abort', '--quit']);

const REF_FLAGS = new Set([
  '-f',
  '--force',
  '-m',
  '-M',
  '--move',
  '-c',
  '-C',
  '--copy',
  '-d',
  '-D',
]);

const CREATE_FLAGS = new Set(['-f', '--force', '-t', '--track', '--no-track']);

const MAIN_REFS = new Set([MAIN, `refs/heads/${MAIN}`]);

const ISOLATIONS = new Set(['worktree', 'remote']);

const ISOLATED_WORKFLOW = /isolation\s*:\s*['"`](?:worktree|remote)/;

const git = (dir, args) => {
  try {
    return execFileSync('git', ['-C', dir, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
};

const expand = (dir, word) => path.resolve(dir, word.replace(/^~(?=\/|$)/, homedir()));

const repoOf = (dir) => {
  const gitDir = existsSync(dir) ? git(dir, ['rev-parse', '--absolute-git-dir']) : '';
  const commonFile = path.join(gitDir, 'commondir');

  const commonDir =
    gitDir !== '' && existsSync(commonFile)
      ? path.resolve(gitDir, readFileSync(commonFile, 'utf8').trim())
      : gitDir;

  return { gitDir, commonDir, branch: git(dir, ['rev-parse', '--abbrev-ref', 'HEAD']) };
};

const worktreesOf = (dir) =>
  git(dir, ['worktree', 'list', '--porcelain'])
    .split('\n')
    .flatMap((line) => (line.startsWith('worktree ') ? [line.slice('worktree '.length)] : []));

const tokenize = (command) =>
  Array.from(command.matchAll(TOKEN), (match) => ({
    text: match[1] ?? match[2] ?? match[4] ?? match[3],
    operator: match[3] !== undefined,
  }));

const segmentsOf = (command) =>
  tokenize(command).reduce(
    (segments, token) => {
      if (token.operator) {
        segments.push([]);

        return segments;
      }

      segments[segments.length - 1].push(token.text);

      return segments;
    },
    [[]],
  );

const isWrapper = (word) =>
  WRAPPERS.has(word) ||
  word === 'timeout' ||
  /^[A-Za-z_]\w*=/.test(word) ||
  /^\d+[smh]?$/.test(word);

const parseGit = (words, cwd) => {
  const start = words.findIndex((word) => !isWrapper(word));

  if (start === -1 || path.basename(words[start]) !== 'git') {
    return undefined;
  }

  let dir = cwd;
  let index = start + 1;

  while (index < words.length && words[index].startsWith('-')) {
    dir = words[index] === '-C' ? expand(dir, words[index + 1] ?? '.') : dir;
    index += GLOBAL_WITH_VALUE.has(words[index]) ? 2 : 1;
  }

  return { dir, sub: words[index] ?? '', args: words.slice(index + 1) };
};

const gitCalls = (command, cwd) => {
  const calls = [];
  let dir = cwd;

  for (const words of segmentsOf(command)) {
    if (words[0] === 'cd') {
      dir = expand(dir, words[1] ?? homedir());

      continue;
    }

    const call = parseGit(words, dir);

    if (call === undefined) {
      continue;
    }

    calls.push(call);
  }

  return calls;
};

const positional = (args) => {
  const end = args.indexOf('--');

  return (end === -1 ? args : args.slice(0, end)).filter((arg) => !arg.startsWith('-'));
};

const valueAfter = (args, flags) => {
  const index = args.findIndex((arg) => flags.includes(arg));

  return index === -1 ? undefined : args[index + 1];
};

const isRemoteRef = (dir, ref) =>
  git(dir, ['remote'])
    .split('\n')
    .some((remote) => remote !== '' && ref.startsWith(`${remote}/`));

const targetsMain = (refspec) => MAIN_REFS.has(refspec.split(':').at(-1).replace(/^\+/, ''));

const worktreeText = (project) =>
  `В этом репозитории не работают в git worktree и в других копиях репозитория: одна задача за раз в основном дереве ${project.main}, на своей ветке от ${MAIN}, через MR.`;

const mainText = () =>
  `В ${MAIN} не коммитят и не вливают: изменение идёт веткой от ${MAIN} и MR, вливает владелец. ${MAIN} обновляется только через \`git pull --ff-only\` после влитого MR.`;

const mergeAllowed = (call) =>
  call.args.includes('--abort') ||
  (call.args.includes('--ff-only') &&
    positional(call.args).every((ref) => isRemoteRef(call.dir, ref)));

const movesHead = (call) =>
  positional(call.args).some((ref) => {
    const commit = git(call.dir, ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]);

    return (
      commit !== '' &&
      commit !== git(call.dir, ['rev-parse', 'HEAD']) &&
      !isRemoteRef(call.dir, ref)
    );
  });

const checkOnMain = (call) => {
  switch (call.sub) {
    case 'commit':
      return mainText();
    case 'merge':
      return mergeAllowed(call) ? undefined : mainText();
    case 'pull':
      return call.args.includes('--ff-only') ? undefined : mainText();
    case 'reset':
      return movesHead(call) ? mainText() : undefined;
    case 'push':
      return positional(call.args).length <= 1 ? mainText() : undefined;
    default:
      return REPLAYS.has(call.sub) && !call.args.some((arg) => STOPS.has(arg))
        ? mainText()
        : undefined;
  }
};

const checkMainTargets = (call) => {
  const refs = positional(call.args);

  switch (call.sub) {
    case 'push':
      return call.args.includes('--all') ||
        call.args.includes('--mirror') ||
        refs.slice(1).some(targetsMain)
        ? mainText()
        : undefined;
    case 'fetch':
      return refs.slice(1).some((refspec) => refspec.includes(':') && targetsMain(refspec))
        ? mainText()
        : undefined;
    case 'branch':
      return call.args.some((arg) => REF_FLAGS.has(arg)) && refs.some((ref) => MAIN_REFS.has(ref))
        ? mainText()
        : undefined;
    case 'update-ref':
      return refs.some((ref) => MAIN_REFS.has(ref)) ? mainText() : undefined;
    case 'checkout':
    case 'switch':
      return MAIN_REFS.has(
        valueAfter(call.args, ['-b', '-B', '-c', '-C', '--create', '--force-create']) ?? '',
      )
        ? mainText()
        : undefined;
    default:
      return undefined;
  }
};

const createsBranch = (args) =>
  positional(args).length > 0 &&
  args.every((arg) => !arg.startsWith('-') || CREATE_FLAGS.has(arg.split('=')[0]));

const newBranchOf = (call) => {
  switch (call.sub) {
    case 'checkout':
      return valueAfter(call.args, ['-b', '-B']);
    case 'switch':
      return valueAfter(call.args, ['-c', '-C', '--create', '--force-create']);
    case 'branch':
      return createsBranch(call.args) ? positional(call.args)[0] : undefined;
    default:
      return undefined;
  }
};

const unmergedBranches = (dir, name) =>
  git(dir, ['for-each-ref', '--format=%(refname:short)', 'refs/heads'])
    .split('\n')
    .filter(
      (branch) =>
        branch !== '' &&
        branch !== MAIN &&
        branch !== name &&
        git(dir, ['rev-list', '--count', `${MAIN}..${branch}`]) !== '0',
    );

const checkNextBranch = (call) => {
  const name = newBranchOf(call);

  if (name === undefined) {
    return undefined;
  }

  const pending = unmergedBranches(call.dir, name);

  return pending.length === 0
    ? undefined
    : `Задачи идут по очереди: ветка ${pending.join(', ')} ещё не влита в ${MAIN}. Новая ветка начинается после того, как владелец вольёт MR предыдущей; ветку, влитую squash-ем, удалите.`;
};

const checkClone = (call, project) =>
  call.sub === 'clone' &&
  positional(call.args).some((source) => {
    const local = expand(call.dir, source.replace(/^file:\/\//, ''));

    return existsSync(local) && repoOf(local).commonDir === project.commonDir;
  })
    ? worktreeText(project)
    : undefined;

const existingBranch = (call) => {
  const [ref] = positional(call.args);

  return ref !== undefined &&
    !call.args.includes('--') &&
    git(call.dir, ['rev-parse', '--verify', '--quiet', `refs/heads/${ref}`]) !== ''
    ? ref
    : undefined;
};

const switchTargetOf = (call) =>
  call.sub === 'switch' || call.sub === 'checkout'
    ? (newBranchOf(call) ?? existingBranch(call))
    : undefined;

const checkGitCall = (call, project, repo) => {
  const clone = checkClone(call, project);

  if (clone !== undefined) {
    return clone;
  }

  if (repo.commonDir === '' || repo.commonDir !== project.commonDir) {
    return undefined;
  }

  if (call.sub === 'worktree' && call.args[0] === 'add') {
    return worktreeText(project);
  }

  if (repo.gitDir !== repo.commonDir && !READ_ONLY.has(call.sub)) {
    return `${call.dir} — linked worktree: в нём не коммитят и не переключают ветки. ${worktreeText(project)}`;
  }

  return (
    (repo.branch === MAIN ? checkOnMain(call) : undefined) ??
    checkMainTargets(call) ??
    checkNextBranch(call)
  );
};

const checkBash = (input, project) => {
  const heads = new Map();

  for (const call of gitCalls(input.tool_input.command ?? '', input.cwd ?? project.main)) {
    const repo = repoOf(call.dir);

    const reason = checkGitCall(call, project, {
      ...repo,
      branch: heads.get(repo.gitDir) ?? repo.branch,
    });

    heads.set(repo.gitDir, switchTargetOf(call) ?? heads.get(repo.gitDir) ?? repo.branch);

    if (reason === undefined) {
      continue;
    }

    return reason;
  }

  return undefined;
};

const checkFile = (filePath, project) => {
  if (typeof filePath !== 'string') {
    return undefined;
  }

  const target = path.resolve(project.main, filePath);

  const linked = project.linked.find(
    (tree) => target === tree || target.startsWith(`${tree}${path.sep}`),
  );

  return linked === undefined
    ? undefined
    : `${linked} — linked worktree, файлы в нём не правят. ${worktreeText(project)}`;
};

const workflowScript = (toolInput) => {
  if (typeof toolInput.script === 'string') {
    return toolInput.script;
  }

  return typeof toolInput.scriptPath === 'string' && existsSync(toolInput.scriptPath)
    ? readFileSync(toolInput.scriptPath, 'utf8')
    : '';
};

const isolationText = (project) =>
  `Субагенты и workflow работают без isolation (worktree, remote): в основном дереве, на ветке текущей задачи. ${worktreeText(project)}`;

const checkTool = (input, project) => {
  const toolInput = input.tool_input ?? {};

  switch (input.tool_name) {
    case 'EnterWorktree':
      return worktreeText(project);
    case 'Agent':
    case 'Task':
      return ISOLATIONS.has(toolInput.isolation) ? isolationText(project) : undefined;
    case 'Workflow':
      return ISOLATED_WORKFLOW.test(workflowScript(toolInput)) ? isolationText(project) : undefined;
    case 'Bash':
      return checkBash(input, project);
    case 'Edit':
    case 'Write':
      return checkFile(toolInput.file_path, project);
    case 'NotebookEdit':
      return checkFile(toolInput.notebook_path, project);
    default:
      return undefined;
  }
};

const input = JSON.parse(readFileSync(0, 'utf8'));

const projectDir = process.env.CLAUDE_PROJECT_DIR ?? input.cwd ?? process.cwd();

const [main = projectDir, ...linked] = worktreesOf(projectDir);

const project = { main, linked, commonDir: repoOf(projectDir).commonDir };

const reason = checkTool(input, project);

if (reason === undefined) {
  process.exit(0);
}

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: `${reason} ${RULE}`,
    },
  }),
);
