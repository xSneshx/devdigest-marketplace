import { useRef } from 'react';
import { CopyButton } from '../../components/copy-button';
import {
  installCommand,
  marketplaceAddCommand,
  marketplaceUpdateCommand,
  pluginUpdateCommand,
  releaseChannelsUrl,
  STABLE_CHANNEL_REF,
  stableMarketplaceName,
} from '../../contract/commands';
import type { SiteIndex } from '../../contract/site-index';
import { useSiteIndex } from '../../lib/index-context';
import { t, type TranslationKey } from '../../i18n/t';
import styles from './GettingStartedScreen.module.css';

interface CommandLineProps {
  command: string;
  label?: string;
}

function CommandLine({ command, label }: CommandLineProps) {
  const ref = useRef<HTMLElement>(null);
  return (
    <div className={styles.commandGroup}>
      {label ? <p className={styles.commandLabel}>{label}</p> : null}
      <div className={styles.command}>
        <code ref={ref} className={styles.code}>
          {command}
        </code>
        <CopyButton text={command} targetRef={ref} />
      </div>
    </div>
  );
}

interface StepCommand {
  command: string;
  label?: string;
}

/** A plugin that depends on nothing is the safest first install; fall back to the first by name. */
function pickExamplePlugin(plugins: SiteIndex['plugins']): string | undefined {
  const byName = [...plugins].sort((a, b) => a.name.localeCompare(b.name));
  return (byName.find((p) => p.dependencies.length === 0) ?? byName[0])?.name;
}

export function GettingStartedScreen() {
  const { meta, plugins } = useSiteIndex();
  const marketplace = meta.marketplaceName;
  const example = pickExamplePlugin(plugins);

  const steps: Array<{ title: TranslationKey; body: TranslationKey; commands: StepCommand[] }> = [
    {
      title: 'gettingStarted.stepAdd',
      body: 'gettingStarted.stepAddBody',
      commands: [
        {
          label: t('gettingStarted.channelLatest', { name: marketplace }),
          command: marketplaceAddCommand(meta.repo.owner, meta.repo.name),
        },
        {
          label: t('gettingStarted.channelStable', { name: stableMarketplaceName(marketplace) }),
          command: marketplaceAddCommand(meta.repo.owner, meta.repo.name, STABLE_CHANNEL_REF),
        },
      ],
    },
    {
      title: 'gettingStarted.stepInstall',
      body: 'gettingStarted.stepInstallBody',
      commands: example ? [{ command: installCommand(example, marketplace) }] : [],
    },
    {
      title: 'gettingStarted.stepUpdate',
      body: 'gettingStarted.stepUpdateBody',
      commands: [
        { command: marketplaceUpdateCommand(marketplace) },
        ...(example ? [{ command: pluginUpdateCommand(example, marketplace) }] : []),
      ],
    },
  ];

  return (
    <section className={styles.root}>
      <h1 className={styles.title}>{t('gettingStarted.title')}</h1>
      <p className={styles.intro}>{t('gettingStarted.intro')}</p>
      <ol className={styles.steps}>
        {steps.map((step) => (
          <li key={step.title} className={styles.step}>
            <h2 className={styles.stepTitle}>{t(step.title)}</h2>
            <p className={styles.stepBody}>{t(step.body)}</p>
            {step.commands.map(({ command, label }) => (
              <CommandLine key={command} command={command} label={label} />
            ))}
            {step.title === 'gettingStarted.stepAdd' ? (
              <a
                className={styles.docsLink}
                href={releaseChannelsUrl(meta.repo.url, meta.repo.defaultBranch)}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t('gettingStarted.channelDocsLink')}
              </a>
            ) : null}
          </li>
        ))}
      </ol>
      <p className={styles.note}>{t('gettingStarted.publicNote')}</p>
      <p className={styles.note}>{t('gettingStarted.newSessionNote')}</p>
    </section>
  );
}
