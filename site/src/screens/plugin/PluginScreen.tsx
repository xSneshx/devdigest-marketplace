import { useRef } from 'react';
import { useParams } from 'react-router';
import { CopyButton } from '../../components/copy-button';
import { KindBadge } from '../../components/kind-badge';
import { SafeMarkdown } from '../../components/safe-markdown';
import { installCommand } from '../../contract/commands';
import { kindLabel, t } from '../../i18n/t';
import { formatDate } from '../../lib/format';
import { useSiteIndex } from '../../lib/index-context';
import { componentPath, pluginPath } from '../../lib/paths';
import { groupComponents } from './helpers';
import styles from './PluginScreen.module.css';

/** Every manifest value below is rendered as JSX text; only README and changelog go through SafeMarkdown. */
export function PluginScreen() {
  const { name } = useParams();
  const index = useSiteIndex();
  const codeRef = useRef<HTMLElement>(null);
  const plugin = index.plugins.find((p) => p.name === name);
  if (!plugin) return null;

  const { repo } = index.meta;
  const command = installCommand(plugin.name, index.meta.marketplaceName);
  const groups = groupComponents(index.components, plugin.name);
  const source = { repoUrl: repo.url, branch: repo.defaultBranch };

  return (
    <article className={styles.root}>
      <header className={styles.header}>
        <div className={styles.title}>
          <KindBadge kind="plugin" />
          <h1>{plugin.name}</h1>
        </div>
        <p className={styles.description}>{plugin.description}</p>
        <dl className={styles.meta}>
          <div>
            <dt>{t('plugin.version')}</dt>
            <dd>{plugin.version}</dd>
          </div>
          <div>
            <dt>{t('plugin.author')}</dt>
            <dd>{plugin.author}</dd>
          </div>
          {plugin.compatibility && (
            <div>
              <dt>{t('plugin.compatibility')}</dt>
              <dd>{plugin.compatibility}</dd>
            </div>
          )}
          <div>
            <dt>{t('plugin.updated')}</dt>
            <dd>{formatDate(plugin.updated)}</dd>
          </div>
        </dl>
        <div className={styles.install}>
          <span className={styles.installLabel}>{t('plugin.install')}</span>
          <code ref={codeRef} className={styles.command}>
            {command}
          </code>
          <CopyButton text={command} label={t('card.copyInstall')} targetRef={codeRef} />
          <a href={plugin.url} target="_blank" rel="noopener noreferrer">
            {t('plugin.viewOnGitHub')}
          </a>
        </div>
      </header>

      {groups.length > 0 && (
        <section aria-labelledby="plugin-components">
          <h2 id="plugin-components">{t('plugin.componentsHeading')}</h2>
          {groups.map((group) => (
            <section key={group.kind} aria-labelledby={`plugin-group-${group.kind}`}>
              <h3 id={`plugin-group-${group.kind}`} className={styles.groupTitle}>
                {kindLabel(group.kind, true)} ({group.items.length})
              </h3>
              <ul className={styles.list}>
                {group.items.map((c) => (
                  <li key={c.id} className={styles.item}>
                    <a href={componentPath(c.id)}>{c.name}</a>
                    {c.invocation && <code className={styles.invocation}>{c.invocation}</code>}
                    <span className={styles.itemDescription}>{c.description}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </section>
      )}

      <section aria-labelledby="plugin-deps">
        <h2 id="plugin-deps">{t('plugin.dependenciesHeading')}</h2>
        {plugin.dependencies.length === 0 ? (
          <p className={styles.empty}>{t('plugin.noDependencies')}</p>
        ) : (
          <ul className={styles.list}>
            {plugin.dependencies.map((d) => (
              <li key={d.name} className={styles.item}>
                <a href={pluginPath(d.name)}>{d.name}</a>
                <code className={styles.invocation}>{d.range}</code>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="plugin-required-by">
        <h2 id="plugin-required-by">{t('plugin.requiredByHeading')}</h2>
        {plugin.dependents.length === 0 ? (
          <p className={styles.empty}>{t('plugin.noDependents')}</p>
        ) : (
          <ul className={styles.list}>
            {plugin.dependents.map((d) => (
              <li key={d} className={styles.item}>
                <a href={pluginPath(d)}>{d}</a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="plugin-readme">
        <h2 id="plugin-readme">{t('plugin.readmeHeading')}</h2>
        {plugin.readme ? (
          <SafeMarkdown
            markdown={plugin.readme}
            source={{ ...source, filePath: `${plugin.sourcePath}/README.md` }}
            headingOffset={1}
          />
        ) : (
          <p className={styles.empty}>{t('plugin.noReadme')}</p>
        )}
      </section>

      {plugin.changelog.length > 0 && (
        <section aria-labelledby="plugin-changelog">
          <h2 id="plugin-changelog">{t('plugin.changelogHeading')}</h2>
          {plugin.changelog.map((entry) => (
            <section key={entry.version} className={styles.release}>
              <h3 className={styles.groupTitle}>
                {entry.version}
                <span className={styles.releaseDate}>
                  {entry.date ? formatDate(entry.date) : t('plugin.unreleased')}
                </span>
              </h3>
              <SafeMarkdown
                markdown={entry.markdown}
                source={{ ...source, filePath: `${plugin.sourcePath}/CHANGELOG.md` }}
                headingOffset={2}
              />
            </section>
          ))}
        </section>
      )}
    </article>
  );
}
