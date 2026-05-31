/**
 * @module tests/usecase/trigger-static-build.test
 * @description triggerStaticBuild UseCase のテスト。
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { triggerStaticBuild } from '../../src/usecase/trigger-static-build.js';
import { ValidationError } from '../../src/domain/error/validation-error.js';
import { FakeClock } from '../../src/infra/in-memory/fake-clock.js';
import { InMemoryGitHubActionsGateway } from '../../src/infra/in-memory/in-memory-github-actions-gateway.js';

describe('triggerStaticBuild', () => {
  it('必須入力が揃っていれば OK を返す', async () => {
    const clock = new FakeClock(new Date('2026-01-15T12:00:00Z'));
    const github = new InMemoryGitHubActionsGateway();

    const result = await triggerStaticBuild(
      { github, clock },
      {
        owner: 'atrial2837-ui',
        repo: 'ibara_muan',
        workflow: 'update-static-data.yml',
        ref: 'main',
      },
    );

    assert.equal(result.ok, true);
    assert.equal(result.owner, 'atrial2837-ui');
    assert.equal(result.repo, 'ibara_muan');
    assert.equal(result.workflow, 'update-static-data.yml');
    assert.equal(result.ref, 'main');
    assert.equal(result.environment, 'production');
    assert.match(result.requestedAt, /^2026-01-15T12:00:00.000Z$/);
  });

  it('gateway.dispatchWorkflow を正しい入力で呼び出す', async () => {
    const clock = new FakeClock();
    const github = new InMemoryGitHubActionsGateway();

    await triggerStaticBuild(
      { github, clock },
      {
        owner: 'test-owner',
        repo: 'test-repo',
        workflow: 'test.yml',
        ref: 'develop',
        environment: 'staging',
      },
    );

    assert.equal(github.calls.length, 1);
    assert.deepEqual(github.calls[0], {
      owner: 'test-owner',
      repo: 'test-repo',
      workflow: 'test.yml',
      ref: 'develop',
      inputs: {
        source: 'cloudflare-admin',
        requested_at: '2026-01-01T00:00:00.000Z',
        environment: 'staging',
      },
    });
  });

  it('owner が欠落していれば ValidationError', async () => {
    const clock = new FakeClock();
    const github = new InMemoryGitHubActionsGateway();

    try {
      await triggerStaticBuild(
        { github, clock },
        {
          owner: '',
          repo: 'ibara_muan',
          workflow: 'update-static-data.yml',
          ref: 'main',
        },
      );
      assert.fail('expected ValidationError');
    } catch (err) {
      assert.ok(err instanceof ValidationError);
      assert.match(err.message, /owner/);
    }
  });

  it('repo が欠落していれば ValidationError', async () => {
    const clock = new FakeClock();
    const github = new InMemoryGitHubActionsGateway();

    try {
      await triggerStaticBuild(
        { github, clock },
        {
          owner: 'atrial2837-ui',
          repo: '',
          workflow: 'update-static-data.yml',
          ref: 'main',
        },
      );
      assert.fail('expected ValidationError');
    } catch (err) {
      assert.ok(err instanceof ValidationError);
      assert.match(err.message, /repo/);
    }
  });

  it('workflow が欠落していれば ValidationError', async () => {
    const clock = new FakeClock();
    const github = new InMemoryGitHubActionsGateway();

    try {
      await triggerStaticBuild(
        { github, clock },
        {
          owner: 'atrial2837-ui',
          repo: 'ibara_muan',
          workflow: '',
          ref: 'main',
        },
      );
      assert.fail('expected ValidationError');
    } catch (err) {
      assert.ok(err instanceof ValidationError);
      assert.match(err.message, /workflow/);
    }
  });

  it('ref が欠落していれば ValidationError', async () => {
    const clock = new FakeClock();
    const github = new InMemoryGitHubActionsGateway();

    try {
      await triggerStaticBuild(
        { github, clock },
        {
          owner: 'atrial2837-ui',
          repo: 'ibara_muan',
          workflow: 'update-static-data.yml',
          ref: '',
        },
      );
      assert.fail('expected ValidationError');
    } catch (err) {
      assert.ok(err instanceof ValidationError);
      assert.match(err.message, /ref/);
    }
  });

  it('必須入力が null の場合は ValidationError', async () => {
    const clock = new FakeClock();
    const github = new InMemoryGitHubActionsGateway();

    try {
      await triggerStaticBuild(
        { github, clock },
        {
          owner: null,
          repo: 'ibara_muan',
          workflow: 'update-static-data.yml',
          ref: 'main',
        },
      );
      assert.fail('expected ValidationError');
    } catch (err) {
      assert.ok(err instanceof ValidationError);
    }
  });

  it('requestedAt は clock.now() から生成される', async () => {
    const customClock = new FakeClock(new Date('2026-05-24T18:30:45.789Z'));
    const github = new InMemoryGitHubActionsGateway();

    const result = await triggerStaticBuild(
      { github, clock: customClock },
      {
        owner: 'owner',
        repo: 'repo',
        workflow: 'wf.yml',
        ref: 'main',
      },
    );

    assert.match(result.requestedAt, /^2026-05-24T18:30:45.789Z$/);
  });
});
