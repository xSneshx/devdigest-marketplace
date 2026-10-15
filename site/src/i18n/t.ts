import en from './en.json';

type Leaves<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];

export type TranslationKey = Leaves<typeof en>;
export type Params = Record<string, string | number>;

type PluralBase = {
  [K in TranslationKey]: K extends `${infer B}.one` ? B : never;
}[TranslationKey];
export type PluralKey = PluralBase;

export type Kind = 'plugin' | 'skill' | 'agent' | 'command' | 'hook' | 'mcp';

const rules = new Intl.PluralRules('en');

function lookup(key: string): string {
  let node: unknown = en;
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null) return key;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' ? node : key;
}

function interpolate(template: string, params?: Params): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in params ? String(params[name]) : whole,
  );
}

export function t(key: TranslationKey, params?: Params): string {
  return interpolate(lookup(key), params);
}

export function tPlural(base: PluralKey, count: number, params?: Params): string {
  const form = rules.select(count) === 'one' ? 'one' : 'other';
  return t(`${base}.${form}` as TranslationKey, { count, ...params });
}

export function kindLabel(kind: Kind, plural = false): string {
  return plural ? t(`kindPlural.${kind}`) : t(`kind.${kind}`);
}
