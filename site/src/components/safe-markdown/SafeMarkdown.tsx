import type { ComponentProps, ReactNode } from 'react';
import Markdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from './SafeMarkdown.module.css';
import { transformUrl, type MarkdownSource } from './url-policy';

export interface SafeMarkdownProps {
  markdown: string;
  source: MarkdownSource;
  inline?: boolean;
  headingOffset?: number;
}

type HastNode = { type?: string; value?: string; tagName?: string; children?: HastNode[] };

const REMARK_PLUGINS = [remarkGfm];

function nodeText(node: HastNode | undefined): string {
  if (!node) return '';
  if (node.type === 'text') return node.value ?? '';
  return (node.children ?? []).map(nodeText).join('');
}

function findFirst(node: HastNode | undefined, tag: string): HastNode | undefined {
  if (!node) return undefined;
  if (node.tagName === tag) return node;
  for (const child of node.children ?? []) {
    const hit = findFirst(child, tag);
    if (hit) return hit;
  }
  return undefined;
}

function isExternal(href: string): boolean {
  return /^https?:/i.test(href);
}

function buildComponents(source: MarkdownSource, inline: boolean, headingOffset: number): Components {
  const heading = (level: number) => {
    const tag = `h${Math.min(6, level + headingOffset)}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
    const Tag = tag;
    return function Heading({ children }: { children?: ReactNode }) {
      return <Tag>{children}</Tag>;
    };
  };

  const components: Components = {
    h1: heading(1),
    h2: heading(2),
    h3: heading(3),
    h4: heading(4),
    h5: heading(5),
    h6: heading(6),
    a({ href, children }: ComponentProps<'a'>) {
      const safe = href ? transformUrl(href, source) : '';
      if (!safe) return <>{children}</>;
      return isExternal(safe) ? (
        <a href={safe} target="_blank" rel="noopener noreferrer">
          {children}
        </a>
      ) : (
        <a href={safe} rel="noopener noreferrer">
          {children}
        </a>
      );
    },
    img({ src, alt }: ComponentProps<'img'>) {
      const safe = typeof src === 'string' ? transformUrl(src, source) : '';
      const label = alt || (typeof src === 'string' ? src : '');
      if (!safe) return <>{label}</>;
      return (
        <a href={safe} target="_blank" rel="noopener noreferrer">
          {label}
        </a>
      );
    },
    table({ node, children }) {
      const header = findFirst(node as HastNode | undefined, 'th');
      const label = nodeText(header).trim() || undefined;
      return (
        <div className={styles.tableScroll} role="region" tabIndex={0} aria-label={label}>
          <table>{children}</table>
        </div>
      );
    },
  };
  if (inline) {
    components.p = ({ children }) => <>{children}</>;
  }
  return components;
}

export function SafeMarkdown({ markdown, source, inline = false, headingOffset = 0 }: SafeMarkdownProps) {
  const body = (
    <Markdown
      remarkPlugins={REMARK_PLUGINS}
      urlTransform={(url) => transformUrl(url, source)}
      components={buildComponents(source, inline, headingOffset)}
    >
      {markdown}
    </Markdown>
  );
  return inline ? <span className={styles.inline}>{body}</span> : <div className={styles.root}>{body}</div>;
}
