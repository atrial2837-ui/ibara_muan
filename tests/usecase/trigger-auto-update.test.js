/**
 * @module tests/usecase/trigger-auto-update.test
 * @description triggerAutoUpdate UseCase のテスト。
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { triggerAutoUpdate } from '../../src/usecase/trigger-auto-update.js';
import { ValidationError } from '../../src/domain/error/validation-error.js';
import { FakeClock } from '../../src/infra/in-memory/fake-clock.js';
import { InMemoryGitHubActionsGateway } from '../../src/infra/in-memory/in-memory-github-actions-gateway.js';

describe('triggerAutoUpdate', () => {
  it('既定値は mode=full / minTimestamps=8 / environment=production', async () => {
    const clock = new FakeClock(new Date('2026-01-15T12:00:00Z'));
    const github = new InMemoryGitHubActionsGateway();

    const result = await triggerAutoUpdate(
      { github, clock },
      {
        owner: 'atrial2837-ui',
        repo: 'ibara_muan',
        workflow: 'auto-update.yml',
        ref: 'main',
      },
    );

    assert.equal(result.ok, true);
    assert.equal(result.mode, 'full');
    assert.equal(result.minTimestamps, 8);
    assert.equal(result.environment, 'production');
    assert.deepEqual(github.calls[0].inputs, {
      source: 'cloudflare-admin',
      requested_at: '2026-01-15T12:00:00.000Z',
      environment: 'production',
      mode: 'full',
      min_timestamps: '8',
    });
  });

  it('scan-only と staging をそのまま中継する', async () => {
    const clock = new FakeClock();
    const github = new InMemoryGitHubActionsGateway();

    const result = await triggerAutoUpdate(
      { github, clock },
      {
        owner: 'o',
        repo: 'r',
        workflow: 'auto-update.yml',
        ref: 'stg-rp',
        environment: 'staging',
        mode: 'scan-only',
        minTimestamps: 5,
      },
    );

    assert.equal(result.mode, 'scan-only');
    assert.equal(result.minTimestamps, 5);
    assert.equal(github.calls[0].ref, 'stg-rp');
    assert.equal(github.calls[0].inputs.mode, 'scan-only');
    assert.equal(github.calls[0].inputs.min_timestamps, '5');
    assert.equal(github.calls[0].inputs.environment, 'staging');
  });

  it('不正な mode は ValidationError', async () => {
    const clock = new FakeClock();
    const github = new InMemoryGitHubActionsGateway();

    await assert.rejects(
      () => triggerAutoUpdate(
        { github, clock },
        { owner: 'o', repo: 'r', workflow: 'w.yml', ref: 'main', mode: 'nonsense' },
      ),
      ValidationError,
    );
    assert.equal(github.calls.length, 0);
  });

  it('minTimestamps が1未満は ValidationError', async () => {
    const clock = new FakeClock();
    const github = new InMemoryGitHubActionsGateway();

    await assert.rejects(
      () => triggerAutoUpdate(
        { github, clock },
        { owner: 'o', repo: 'r', workflow: 'w.yml', ref: 'main', minTimestamps: 0 },
      ),
      ValidationError,
    );
    assert.equal(github.calls.length, 0);
  });

  it('owner が欠落していれば ValidationError', async () => {
    const clock = new FakeClock();
    const github = new InMemoryGitHubActionsGateway();

    await assert.rejects(
      () => triggerAutoUpdate(
        { github, clock },
        { owner: '', repo: 'r', workflow: 'w.yml', ref: 'main' },
      ),
      ValidationError,
    );
  });
});
