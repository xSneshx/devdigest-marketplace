// Profile for sdd-engineering:plan-verifier (AC-26): no file writes at all.
// Bash is the shared read/check whitelist.
import { readOnlyBash } from './common.mjs';

export const readonly = {
  files(_ctx, rel) {
    return `${rel} cannot be written: plan-verifier is read-only. Report the finding ` +
      'in your verdict instead of changing a file.';
  },
  bash: readOnlyBash,
};
