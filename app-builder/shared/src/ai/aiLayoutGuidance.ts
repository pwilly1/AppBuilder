export const AI_GENERATION_CORRECTION_LIMITS = {
  maxAttempts: 2,
  maxIssues: 32,
  maxRelatedBlockKeys: 20,
} as const

export const AI_GENERATION_MAX_CORRECTIONS = AI_GENERATION_CORRECTION_LIMITS.maxAttempts

export const AI_GENERATION_LAYOUT_GUIDANCE = {
  version: 1,
  grid: {
    columns: 16,
    rows: 29,
    canonicalWidthPx: 390,
    rowHeightPx: 28,
    gapPx: 0,
  },
  policies: {
    preserveEveryRequestedBlock: true,
    allowAutomaticPageSplitting: false,
    allowBlockRemoval: false,
    allowBlockTypeChanges: false,
    avoidSiblingOverlap: true,
    keepBlocksInsideOwnerGrid: true,
  },
  recommendedMinimumSpans: {
    hero: { cols: 6, rows: 2 },
    staticText: { cols: 4, rows: 1 },
    editableText: { cols: 6, rows: 3 },
    button: { cols: 4, rows: 2 },
    repeater: { cols: 8, rows: 6 },
  },
  appearance: {
    minimumTextContrastRatio: 4.5,
    minimumPlaceholderContrastRatio: 3,
    minimumControlBoundaryContrastRatio: 1.5,
    preserveReadableModelColors: true,
  },
  correctionRules: [
    'Move and resize existing blocks before changing typography or padding.',
    'Use side-by-side placement when it keeps every block readable and collision-free.',
    'Preserve all semantic content, actions, bindings, collections, and parent relationships.',
    'When a compiler issue identifies an unknown reference, repair only that target key.',
    'Do not add pages, remove blocks, or replace requested blocks during layout correction.',
  ],
} as const

export type AiGenerationLayoutGuidance = typeof AI_GENERATION_LAYOUT_GUIDANCE
