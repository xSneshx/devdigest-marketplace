import { z } from 'zod';

export const Kind = z.enum(['plugin', 'skill', 'agent', 'command', 'hook', 'mcp']);
export type Kind = z.infer<typeof Kind>;

export const ComponentKind = z.enum(['skill', 'agent', 'command', 'hook', 'mcp']);
export type ComponentKind = z.infer<typeof ComponentKind>;

export const KIND_ORDER = ['plugin', 'skill', 'agent', 'command', 'hook', 'mcp'] as const satisfies readonly Kind[];

export function componentId(kind: ComponentKind, plugin: string, name: string): string {
  return `${kind}:${plugin}/${name}`;
}

/** Repo-relative path: never absolute, never escaping the repository (AC-7). */
const RepoPath = z
  .string()
  .min(1)
  .refine((p) => !p.startsWith('/') && !p.startsWith('\\') && !/^[A-Za-z]:/.test(p) && !p.startsWith('~'), {
    message: 'path must be repository-relative',
  })
  .refine((p) => !p.split(/[\\/]/).includes('..'), { message: 'path must not contain ..' });

const GithubUrl = z.string().refine((u) => u.startsWith('https://github.com/'), {
  message: 'url must start with https://github.com/',
});

const IsoDate = z.string().min(1);

const Dependency = z.object({ name: z.string().min(1), range: z.string().min(1) });

const ChangelogEntry = z.object({
  version: z.string().min(1),
  tag: z.string().optional(),
  date: IsoDate.optional(),
  markdown: z.string(),
});

const Plugin = z.object({
  name: z.string().min(1),
  version: z.string().min(1),
  description: z.string(),
  author: z.string(),
  keywords: z.array(z.string()),
  dependencies: z.array(Dependency),
  dependents: z.array(z.string()),
  installCommand: z.string().min(1),
  sourcePath: RepoPath,
  url: GithubUrl,
  compatibility: z.string().optional(),
  updated: IsoDate,
  released: z.boolean(),
  readme: z.string().optional(),
  changelog: z.array(ChangelogEntry),
  counts: z.record(ComponentKind, z.number().int().nonnegative()),
});

const Component = z.object({
  id: z.string().min(1),
  kind: ComponentKind,
  plugin: z.string().min(1),
  name: z.string().min(1),
  invocation: z.string().optional(),
  description: z.string(),
  body: z.string().optional(),
  path: RepoPath,
  tools: z.array(z.string()).optional(),
  disallowedTools: z.array(z.string()).optional(),
  model: z.string().optional(),
  argumentHint: z.string().optional(),
  manualOnly: z.boolean().optional(),
  event: z.string().optional(),
  matcher: z.string().optional(),
  timeout: z.number().optional(),
});

const Release = z.object({
  plugin: z.string().min(1),
  version: z.string().min(1),
  tag: z.string().min(1),
  date: IsoDate,
  summary: z.string(),
  evidenceUrl: GithubUrl.optional(),
});

const Meta = z.object({
  marketplaceName: z.string().min(1),
  ownerName: z.string(),
  repo: z.object({
    owner: z.string().min(1),
    name: z.string().min(1),
    url: GithubUrl,
    defaultBranch: z.string().min(1),
  }),
  commit: z.object({
    sha: z.string().min(1),
    shortSha: z.string().min(1),
    date: IsoDate,
  }),
  builtAt: IsoDate,
  releaseTagCount: z.number().int().nonnegative(),
});

const Stats = z.object({
  plugins: z.number().int().nonnegative(),
  skills: z.number().int().nonnegative(),
  agents: z.number().int().nonnegative(),
  commands: z.number().int().nonnegative(),
  hooks: z.number().int().nonnegative(),
  mcp: z.number().int().nonnegative(),
  releases: z.number().int().nonnegative(),
  latestReleaseDate: IsoDate.optional(),
});

export const SiteIndex = z.object({
  schemaVersion: z.literal(1),
  meta: Meta,
  plugins: z.array(Plugin),
  components: z.array(Component),
  releases: z.array(Release),
  stats: Stats,
});
export type SiteIndex = z.infer<typeof SiteIndex>;

export type SitePlugin = SiteIndex['plugins'][number];
export type SiteComponent = SiteIndex['components'][number];
export type SiteRelease = SiteIndex['releases'][number];
