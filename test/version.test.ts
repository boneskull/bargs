import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { detectVersion } from '../src/version.js';

describe('version detection', () => {
  it('should return provided version if given', async () => {
    const version = await detectVersion('1.2.3');
    assert.equal(version, '1.2.3');
  });

  it('should return undefined if no version and no package.json found', async () => {
    const version = await detectVersion(undefined, '/nonexistent/path');
    assert.equal(version, undefined);
  });
});
