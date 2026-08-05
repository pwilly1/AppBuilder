import type {
  AiBlockPlan,
  AiGenerationPlanIssue,
  AiPageAccessPlan,
  AppGenerationPlanV1,
} from '@apptura/shared/ai';
import { AiGenerationOutputError } from './AiGenerationErrors.js';

export function preserveCorrectionContract(
  previous: AppGenerationPlanV1,
  candidate: AppGenerationPlanV1,
  issues: readonly AiGenerationPlanIssue[],
): AppGenerationPlanV1 {
  assertExactKeySet(
    previous.pages.map((page) => page.key),
    candidate.pages.map((page) => page.key),
    '$.pages',
    'pages',
  );

  const candidatePages = new Map(candidate.pages.map((page) => [page.key, page]));
  const pageKeys = new Set(previous.pages.map((page) => page.key));
  return {
    ...previous,
    pages: previous.pages.map((page) => {
      const candidatePage = candidatePages.get(page.key);
      if (!candidatePage) throw correctionStructureError('A corrected page is missing.', `$.pages.${page.key}`);
      assertExactKeySet(
        page.blocks.map((block) => block.key),
        candidatePage.blocks.map((block) => block.key),
        `$.pages.${page.key}.blocks`,
        'blocks',
      );
      const candidateBlocks = new Map(candidatePage.blocks.map((block) => [block.key, block]));
      const access = shouldCorrectReference(
        issues,
        `pages.${page.key}.access.redirectPageKey`,
      )
        ? mergePageAccessCorrection(page.access, candidatePage.access, pageKeys)
        : page.access;
      const { access: _previousAccess, ...pageWithoutAccess } = page;
      return {
        ...pageWithoutAccess,
        ...(access ? { access } : {}),
        blocks: page.blocks.map((block) => {
          const candidateBlock = candidateBlocks.get(block.key);
          if (!candidateBlock) {
            throw correctionStructureError(
              'A corrected block is missing.',
              `$.pages.${page.key}.blocks.${block.key}`,
            );
          }
          return mergeLayoutCorrection(page.key, block, candidateBlock, issues);
        }),
      };
    }),
  };
}

function mergeLayoutCorrection(
  pageKey: string,
  previous: AiBlockPlan,
  candidate: AiBlockPlan,
  issues: readonly AiGenerationPlanIssue[],
): AiBlockPlan {
  const path = `$.pages.${pageKey}.blocks.${previous.key}`;
  const planPath = `pages.${pageKey}.blocks.${previous.key}`;
  if (candidate.type !== previous.type) {
    throw correctionStructureError('A correction cannot change a block type.', `${path}.type`);
  }
  if (candidate.parentKey !== previous.parentKey) {
    throw correctionStructureError('A correction cannot change a block parent.', `${path}.parentKey`);
  }

  if (previous.type === 'hero' && candidate.type === 'hero') {
    const headlineBinding = shouldCorrectReference(issues, `${planPath}.headlineBinding`)
      ? candidate.headlineBinding
      : previous.headlineBinding;
    const { headlineBinding: _previousBinding, ...previousWithoutBinding } = previous;
    return {
      ...previousWithoutBinding,
      ...(headlineBinding ? { headlineBinding } : {}),
      grid: { ...candidate.grid },
      ...(candidate.render ? { render: { ...candidate.render } } : {}),
      content: {
        ...previous.content,
        ...copyDefinedLayoutValues(candidate.content, ['headlineSize', 'contentPadding']),
      },
    };
  }
  if (previous.type === 'text' && candidate.type === 'text') {
    const valueBinding = shouldCorrectReference(issues, `${planPath}.valueBinding`)
      ? candidate.valueBinding
      : previous.valueBinding;
    const { valueBinding: _previousBinding, ...previousWithoutBinding } = previous;
    return {
      ...previousWithoutBinding,
      ...(valueBinding ? { valueBinding } : {}),
      grid: { ...candidate.grid },
      ...(candidate.render ? { render: { ...candidate.render } } : {}),
      content: {
        ...previous.content,
        ...copyDefinedLayoutValues(candidate.content, ['fontSize', 'contentPadding']),
      },
    };
  }
  if (previous.type === 'button' && candidate.type === 'button') {
    const action = shouldCorrectReference(issues, `${planPath}.action`)
      ? candidate.action
      : previous.action;
    const { action: _previousAction, ...previousWithoutAction } = previous;
    return {
      ...previousWithoutAction,
      ...(action ? { action } : {}),
      grid: { ...candidate.grid },
      ...(candidate.render ? { render: { ...candidate.render } } : {}),
      content: {
        ...previous.content,
        ...copyDefinedLayoutValues(candidate.content, [
          'fontSize',
          'buttonPaddingX',
          'buttonPaddingY',
        ]),
      },
    };
  }
  if (previous.type === 'repeater' && candidate.type === 'repeater') {
    return {
      ...previous,
      collectionKey: shouldCorrectReference(issues, `${planPath}.collectionKey`)
        ? candidate.collectionKey
        : previous.collectionKey,
      grid: { ...candidate.grid },
      ...(candidate.render ? { render: { ...candidate.render } } : {}),
      ...(previous.content || candidate.content ? {
        content: {
          ...(previous.content || {}),
          ...copyDefinedLayoutValues(candidate.content || {}, ['itemRowSpan', 'gapRows']),
        },
      } : {}),
    };
  }

  throw correctionStructureError('A corrected block could not be matched.', path);
}

function mergePageAccessCorrection(
  previous: AiPageAccessPlan | undefined,
  candidate: AiPageAccessPlan | undefined,
  pageKeys: ReadonlySet<string>,
): AiPageAccessPlan | undefined {
  if (!previous) return undefined;
  const redirectPageKey = candidate?.redirectPageKey;
  return {
    mode: previous.mode,
    ...(redirectPageKey && pageKeys.has(redirectPageKey) ? { redirectPageKey } : {}),
  };
}

function shouldCorrectReference(
  issues: readonly AiGenerationPlanIssue[],
  path: string,
): boolean {
  return issues.some((issue) => (
    issue.code === 'missing-reference'
    && (issue.path === path || issue.path.startsWith(`${path}.`))
  ));
}

function copyDefinedLayoutValues(
  source: Record<string, unknown>,
  keys: readonly string[],
): Record<string, unknown> {
  return Object.fromEntries(
    keys.flatMap((key) => source[key] === undefined ? [] : [[key, source[key]]]),
  );
}

function assertExactKeySet(
  expected: string[],
  received: string[],
  path: string,
  label: string,
): void {
  const expectedSet = new Set(expected);
  const receivedSet = new Set(received);
  const same = expected.length === received.length
    && expectedSet.size === receivedSet.size
    && expected.every((key) => receivedSet.has(key));
  if (!same) {
    throw correctionStructureError(
      `A layout correction must preserve the exact set of ${label}.`,
      path,
    );
  }
}

function correctionStructureError(message: string, path: string): AiGenerationOutputError {
  return new AiGenerationOutputError(
    'The AI provider returned an unsafe layout correction.',
    [{ code: 'correction-structure-mismatch', path, message }],
  );
}
