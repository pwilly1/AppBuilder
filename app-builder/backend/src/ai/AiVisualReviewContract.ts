import type {
  AiBlockPlan,
  AiPagePlan,
  AppGenerationPlanV1,
} from '@apptura/shared/ai';
import { AiGenerationOutputError } from './AiGenerationErrors.js';

export function preserveVisualReviewContract(
  previous: AppGenerationPlanV1,
  candidate: AppGenerationPlanV1,
): AppGenerationPlanV1 {
  assertExactKeySet(
    previous.collections.map((collection) => collection.key),
    candidate.collections.map((collection) => collection.key),
    '$.collections',
    'collections',
  );
  assertExactKeySet(
    previous.pages.map((page) => page.key),
    candidate.pages.map((page) => page.key),
    '$.pages',
    'pages',
  );

  const candidatePages = new Map(candidate.pages.map((page) => [page.key, page]));
  return {
    ...previous,
    pages: previous.pages.map((page) => mergeVisualPage(
      page,
      requireValue(candidatePages.get(page.key), `$.pages.${page.key}`, 'A reviewed page is missing.'),
    )),
  };
}

function mergeVisualPage(previous: AiPagePlan, candidate: AiPagePlan): AiPagePlan {
  assertExactKeySet(
    previous.blocks.map((block) => block.key),
    candidate.blocks.map((block) => block.key),
    `$.pages.${previous.key}.blocks`,
    'blocks',
  );
  const candidateBlocks = new Map(candidate.blocks.map((block) => [block.key, block]));
  return {
    ...previous,
    ...(candidate.backgroundColor ? { backgroundColor: candidate.backgroundColor } : {}),
    ...(candidate.visualStyle ? { visualStyle: structuredClone(candidate.visualStyle) } : {}),
    ...(candidate.sections ? { sections: structuredClone(candidate.sections) } : {}),
    blocks: previous.blocks.map((block) => mergeVisualBlock(
      previous.key,
      block,
      requireValue(
        candidateBlocks.get(block.key),
        `$.pages.${previous.key}.blocks.${block.key}`,
        'A reviewed block is missing.',
      ),
    )),
  };
}

function mergeVisualBlock(
  pageKey: string,
  previous: AiBlockPlan,
  candidate: AiBlockPlan,
): AiBlockPlan {
  const path = `$.pages.${pageKey}.blocks.${previous.key}`;
  if (candidate.type !== previous.type) {
    throw visualReviewError('A visual review cannot change a block type.', `${path}.type`);
  }
  if (candidate.parentKey !== previous.parentKey) {
    throw visualReviewError('A visual review cannot change a block parent.', `${path}.parentKey`);
  }

  if (previous.type === 'hero' && candidate.type === 'hero') {
    return {
      ...previous,
      ...(candidate.visualRole ? { visualRole: candidate.visualRole } : {}),
      grid: { ...candidate.grid },
      ...(candidate.render ? { render: { ...candidate.render } } : {}),
      content: mergeVisualFields(previous.content, candidate.content, [
        'fontFamily',
        'headlineSize',
        'contentPadding',
      ]),
    };
  }
  if (previous.type === 'text' && candidate.type === 'text') {
    return {
      ...previous,
      ...(candidate.visualRole ? { visualRole: candidate.visualRole } : {}),
      grid: { ...candidate.grid },
      ...(candidate.render ? { render: { ...candidate.render } } : {}),
      content: mergeVisualFields(previous.content, candidate.content, [
        'fontFamily',
        'fontSize',
        'contentPadding',
        'textColor',
        'backgroundColor',
        'placeholderColor',
        'borderColor',
        'borderWidth',
        'borderRadius',
      ]),
    };
  }
  if (previous.type === 'button' && candidate.type === 'button') {
    return {
      ...previous,
      ...(candidate.visualRole ? { visualRole: candidate.visualRole } : {}),
      grid: { ...candidate.grid },
      ...(candidate.render ? { render: { ...candidate.render } } : {}),
      content: mergeVisualFields(previous.content, candidate.content, [
        'fontFamily',
        'fontSize',
        'buttonPaddingX',
        'buttonPaddingY',
        'backgroundColor',
        'textColor',
        'borderRadius',
      ]),
    };
  }
  if (previous.type === 'repeater' && candidate.type === 'repeater') {
    return {
      ...previous,
      ...(candidate.visualRole ? { visualRole: candidate.visualRole } : {}),
      grid: { ...candidate.grid },
      ...(candidate.render ? { render: { ...candidate.render } } : {}),
      collectionKey: previous.collectionKey,
      ...(previous.content || candidate.content ? {
        content: mergeVisualFields(previous.content ?? {}, candidate.content ?? {}, [
          'itemRowSpan',
          'gapRows',
          'backgroundColor',
          'borderColor',
          'borderWidth',
          'borderRadius',
          'opacity',
        ]),
      } : {}),
    };
  }

  throw visualReviewError('A reviewed block could not be matched.', path);
}

function mergeVisualFields<T extends Record<string, unknown>>(
  previous: T,
  candidate: Record<string, unknown>,
  allowedKeys: readonly string[],
): T {
  const visualValues = Object.fromEntries(
    allowedKeys.flatMap((key) => candidate[key] === undefined ? [] : [[key, candidate[key]]]),
  );
  return { ...previous, ...visualValues };
}

function assertExactKeySet(
  expected: string[],
  received: string[],
  path: string,
  label: string,
): void {
  const receivedSet = new Set(received);
  const same = expected.length === received.length
    && receivedSet.size === received.length
    && expected.every((key) => receivedSet.has(key));
  if (!same) {
    throw visualReviewError(`A visual review must preserve the exact set of ${label}.`, path);
  }
}

function requireValue<T>(value: T | undefined, path: string, message: string): T {
  if (value === undefined) throw visualReviewError(message, path);
  return value;
}

function visualReviewError(message: string, path: string): AiGenerationOutputError {
  return new AiGenerationOutputError(
    'The AI provider returned an unsafe visual review.',
    [{ code: 'visual-review-structure-mismatch', path, message }],
  );
}
