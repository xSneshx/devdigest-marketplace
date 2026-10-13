import { useRef, type ReactNode } from 'react';
import { useParams } from 'react-router';
import { CopyButton } from '../../components/copy-button';
import { KindBadge } from '../../components/kind-badge';
import { NotFound } from '../../components/not-found';
import { SafeMarkdown } from '../../components/safe-markdown';
import { installCommand } from '../../contract/commands';
import { t } from '../../i18n/t';
import { useSiteIndex } from '../../lib/index-context';
import { homePath, parseComponentRoute, pluginPath } from '../../lib/paths';
import styles from './ComponentScreen.module.css';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.field}>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function CodeList({ items }: { items: string[] }) {
  return (
    <ul className={styles.codeList}>
      {items.map((item) => (
        <li key={item}>
          <code>{item}</code>
        </li>
      ))}
    </ul>
  );
}

export function ComponentScreen() {
  const { kind, plugin: pluginName, name } = useParams();
  const index = useSiteIndex();
  const installRef = useRef<HTMLElement>(null);

  const id = parseComponentRoute(kind, pluginName, name);
  const component = id ? index.components.find((c) => c.id === id) : undefined;
  if (!component) return <NotFound variant="component" />;

  const { meta } = index;
  const install = installCommand(component.plugin, meta.marketplaceName);
  const sourceUrl = `${meta.repo.url}/blob/${meta.repo.defaultBranch}/${component.path}`;

  return (
    <article className={styles.root}>
      <nav aria-label={t('app.breadcrumbNav')}>
        <ol className={styles.breadcrumb}>
          <li>
            <a href={homePath()}>{t('component.breadcrumbCatalog')}</a>
          </li>
          <li>
            <a href={pluginPath(component.plugin)}>{component.plugin}</a>
          </li>
          <li aria-current="page">{component.name}</li>
        </ol>
      </nav>

      <header className={styles.header}>
        <div className={styles.title}>
          <KindBadge kind={component.kind} />
          <h1>{component.name}</h1>
          {component.manualOnly && (
            <span className={styles.manual}>
              <strong>{t('component.manualOnly')}</strong> {t('component.manualOnlyHint')}
            </span>
          )}
        </div>
        {component.invocation && (
          <p className={styles.invocation}>
            <span className={styles.label}>{t('component.invocation')}</span> <code>{component.invocation}</code>
          </p>
        )}
        <p className={styles.description}>{component.description}</p>
        <div className={styles.install}>
          <span className={styles.label}>{t('component.install')}</span>
          <code ref={installRef}>{install}</code>
          <CopyButton text={install} targetRef={installRef} />
        </div>
      </header>

      <dl className={styles.fields}>
        {component.tools && component.tools.length > 0 && (
          <Field label={t('component.tools')}>
            <CodeList items={component.tools} />
          </Field>
        )}
        {component.disallowedTools && component.disallowedTools.length > 0 && (
          <Field label={t('component.disallowedTools')}>
            <CodeList items={component.disallowedTools} />
          </Field>
        )}
        {component.model && (
          <Field label={t('component.model')}>
            <code>{component.model}</code>
          </Field>
        )}
        {component.argumentHint && (
          <Field label={t('component.argumentHint')}>
            <code>{component.argumentHint}</code>
          </Field>
        )}
        {component.event && (
          <Field label={t('component.event')}>
            <code>{component.event}</code>
          </Field>
        )}
        {component.matcher && (
          <Field label={t('component.matcher')}>
            <code>{component.matcher}</code>
          </Field>
        )}
        {component.timeout !== undefined && (
          <Field label={t('component.timeout')}>{t('component.timeoutSeconds', { n: component.timeout })}</Field>
        )}
      </dl>

      {component.body && (
        <section aria-labelledby="component-docs">
          <h2 id="component-docs">{t('component.documentation')}</h2>
          <SafeMarkdown
            markdown={component.body}
            headingOffset={2}
            source={{ repoUrl: meta.repo.url, branch: meta.repo.defaultBranch, filePath: component.path }}
          />
        </section>
      )}

      <p>
        <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
          {t('component.viewSource')}
        </a>
      </p>
    </article>
  );
}
