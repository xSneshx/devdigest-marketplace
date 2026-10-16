// Minimal semver matcher: exact, ^, ~, >=, >, <=, <, = and space-separated AND sets.
// Prerelease and build suffixes are not supported; a range using them is invalid.

const VERSION_RE = /^(\d+)\.(\d+)\.(\d+)$/;
const COMPARATOR_RE = /^(\^|~|>=|<=|>|<|=)?(\d+)(?:\.(\d+))?(?:\.(\d+))?$/;

export function parseVersion(text) {
  const m = VERSION_RE.exec(String(text).trim());
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

export function compare(a, b) {
  for (let i = 0; i < 3; i += 1) {
    if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
  }
  return 0;
}

function parseComparators(range) {
  if (typeof range !== 'string' || range.trim() === '') return null;
  const parts = range.trim().split(/\s+/);
  const out = [];
  for (const part of parts) {
    const m = COMPARATOR_RE.exec(part);
    if (!m) return null;
    const [, op = '', major, minor, patch] = m;
    const nums = [Number(major), Number(minor ?? 0), Number(patch ?? 0)];
    out.push({ op, nums, hasMinor: minor !== undefined, hasPatch: patch !== undefined });
  }
  return out;
}

export function validRange(range) {
  return parseComparators(range) !== null;
}

function upperBoundForCaret([major, minor, patch]) {
  if (major > 0) return [major + 1, 0, 0];
  if (minor > 0) return [0, minor + 1, 0];
  return [0, 0, patch + 1];
}

function matchOne(version, { op, nums, hasMinor, hasPatch }) {
  switch (op) {
    case '^':
      return compare(version, nums) >= 0 && compare(version, upperBoundForCaret(nums)) < 0;
    case '~':
      return compare(version, nums) >= 0 && compare(version, [nums[0], nums[1] + 1, 0]) < 0;
    case '>=':
      return compare(version, nums) >= 0;
    case '>':
      return compare(version, nums) > 0;
    case '<=':
      return compare(version, nums) <= 0;
    case '<':
      return compare(version, nums) < 0;
    default: {
      if (!hasMinor) return version[0] === nums[0];
      if (!hasPatch) return version[0] === nums[0] && version[1] === nums[1];
      return compare(version, nums) === 0;
    }
  }
}

/** Throws on an invalid version or range, so callers cannot mistake it for "outside the range". */
export function satisfies(versionText, range) {
  const version = parseVersion(versionText);
  if (!version) throw new Error(`invalid version "${versionText}"`);
  const comparators = parseComparators(range);
  if (!comparators) throw new Error(`unsupported range "${range}"`);
  return comparators.every((c) => matchOne(version, c));
}
