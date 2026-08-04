import {
  AI_GENERATION_COLLECTION_ACCESS_PRESETS,
  AI_GENERATION_LIMITS,
  AI_GENERATION_SUPPORTED_SCOPES,
  APP_GENERATION_PLAN_VERSION,
} from '@apptura/shared/ai';

type JsonSchema = Record<string, unknown>;

const key = stringSchema({
  description: 'A semantic key using lowercase letters, numbers, and hyphens.',
  maxLength: AI_GENERATION_LIMITS.keyLength,
  pattern: '^[a-z][a-z0-9-]*$',
});
const fieldKey = stringSchema({
  description: 'A field key using lowercase letters, numbers, and underscores.',
  maxLength: AI_GENERATION_LIMITS.keyLength,
  pattern: '^[a-z][a-z0-9_]*$',
});
const color = stringSchema({
  description: 'A six-digit hexadecimal color such as #2563eb.',
  maxLength: 7,
  pattern: '^#[0-9a-fA-F]{6}$',
});

const grid = strictObject({
  colStart: integerSchema(1, 128),
  rowStart: integerSchema(1, 128),
  colSpan: integerSchema(1, 64),
  rowSpan: integerSchema(1, 64),
});

const render = strictObject({
  alignX: nullable(enumSchema(['start', 'center', 'end'])),
  alignY: nullable(enumSchema(['start', 'center', 'end'])),
});

const collectionBinding = strictObject({
  collectionKey: ref('key'),
  fieldKey: ref('fieldKey'),
  record: enumSchema(['latest', 'currentItem']),
  fallback: nullable(stringSchema({ maxLength: 240 })),
});

const submitField = strictObject({
  fieldBlockKey: ref('key'),
  targetFieldKey: ref('fieldKey'),
});

const navigateAction = strictObject({
  type: enumSchema(['navigate']),
  targetPageKey: ref('key'),
});

const submitDataAction = strictObject({
  type: enumSchema(['submitData']),
  collectionKey: ref('key'),
  fields: arraySchema(ref('submitField'), 1, AI_GENERATION_LIMITS.fieldsPerCollection),
});

const heroContent = strictObject({
  headline: stringSchema({ maxLength: 240, minLength: 1 }),
  headlineSize: nullable(numberSchema(8, 96)),
  contentPadding: nullable(numberSchema(0, 80)),
});

const textContent = strictObject({
  value: nullable(stringSchema({ maxLength: 600 })),
  fontSize: nullable(numberSchema(8, 96)),
  contentPadding: nullable(numberSchema(0, 80)),
  textColor: nullable(ref('color')),
  editable: nullable({ type: 'boolean' }),
  textInputMode: nullable(enumSchema(['singleLine', 'multiline'])),
  inputType: nullable(enumSchema(['text', 'email', 'password', 'number'])),
  fieldLabel: nullable(stringSchema({ maxLength: 80 })),
  showFieldLabel: nullable({ type: 'boolean' }),
  fieldKey: nullable(ref('fieldKey')),
  required: nullable({ type: 'boolean' }),
  placeholder: nullable(stringSchema({ maxLength: 160 })),
  backgroundColor: nullable(ref('color')),
  placeholderColor: nullable(ref('color')),
  borderColor: nullable(ref('color')),
  borderWidth: nullable(numberSchema(0, 32)),
  borderRadius: nullable(numberSchema(0, 999)),
});

const buttonContent = strictObject({
  label: stringSchema({ maxLength: 100, minLength: 1 }),
  dataSourceName: nullable(stringSchema({ maxLength: 80 })),
  successMessage: nullable(stringSchema({ maxLength: 160 })),
  fontSize: nullable(numberSchema(8, 72)),
  buttonPaddingX: nullable(numberSchema(0, 80)),
  buttonPaddingY: nullable(numberSchema(0, 80)),
  backgroundColor: nullable(ref('color')),
  textColor: nullable(ref('color')),
  borderRadius: nullable(numberSchema(0, 999)),
});

const repeaterContent = strictObject({
  scope: nullable(enumSchema(['all', 'currentUser'])),
  order: nullable(enumSchema(['newest', 'oldest'])),
  limit: nullable(integerSchema(1, 20)),
  itemRowSpan: nullable(integerSchema(1, 29)),
  gapRows: nullable(integerSchema(0, 29)),
  emptyText: nullable(stringSchema({ maxLength: 160 })),
  backgroundColor: nullable(ref('color')),
  borderColor: nullable(ref('color')),
  borderWidth: nullable(numberSchema(0, 32)),
  borderRadius: nullable(numberSchema(0, 999)),
  opacity: nullable(numberSchema(0, 1)),
});

const blockBase = {
  key: ref('key'),
  parentKey: nullable(ref('key')),
  grid: ref('grid'),
  render: nullable(ref('render')),
};

const heroBlock = strictObject({
  ...blockBase,
  type: enumSchema(['hero']),
  content: ref('heroContent'),
  headlineBinding: nullable(ref('collectionBinding')),
});

const textBlock = strictObject({
  ...blockBase,
  type: enumSchema(['text']),
  content: ref('textContent'),
  valueBinding: nullable(ref('collectionBinding')),
});

const buttonBlock = strictObject({
  ...blockBase,
  type: enumSchema(['button']),
  content: ref('buttonContent'),
  action: nullable({
    anyOf: [ref('navigateAction'), ref('submitDataAction')],
  }),
});

const repeaterBlock = strictObject({
  ...blockBase,
  type: enumSchema(['repeater']),
  collectionKey: ref('key'),
  content: nullable(ref('repeaterContent')),
});

const collectionField = strictObject({
  key: ref('fieldKey'),
  label: stringSchema({ maxLength: 80, minLength: 1 }),
  type: enumSchema(['text', 'number', 'boolean', 'email', 'date']),
  required: nullable({ type: 'boolean' }),
});

const collection = strictObject({
  key: ref('key'),
  name: stringSchema({ maxLength: 80, minLength: 1 }),
  accessPreset: enumSchema(AI_GENERATION_COLLECTION_ACCESS_PRESETS),
  fields: arraySchema(ref('collectionField'), 1, AI_GENERATION_LIMITS.fieldsPerCollection),
});

const pageAccess = strictObject({
  mode: enumSchema(['public', 'signedIn', 'signedOut']),
  redirectPageKey: nullable(ref('key')),
});

const page = strictObject({
  key: ref('key'),
  title: stringSchema({ maxLength: AI_GENERATION_LIMITS.pageTitleLength, minLength: 1 }),
  path: nullable(stringSchema({ maxLength: AI_GENERATION_LIMITS.pagePathLength })),
  backgroundColor: nullable(ref('color')),
  access: nullable(ref('pageAccess')),
  blocks: arraySchema({
    anyOf: [ref('heroBlock'), ref('textBlock'), ref('buttonBlock'), ref('repeaterBlock')],
  }, 1, AI_GENERATION_LIMITS.blocksPerPage),
});

export const OPENAI_APP_GENERATION_PLAN_SCHEMA: JsonSchema = {
  ...strictObject({
    planVersion: { type: 'integer', enum: [APP_GENERATION_PLAN_VERSION] },
    scope: enumSchema(AI_GENERATION_SUPPORTED_SCOPES),
    summary: stringSchema({
      maxLength: AI_GENERATION_LIMITS.summaryLength,
      minLength: 1,
    }),
    collections: arraySchema(ref('collection'), 0, AI_GENERATION_LIMITS.collections),
    pages: arraySchema(ref('page'), 1, AI_GENERATION_LIMITS.pages),
  }),
  $defs: {
    key,
    fieldKey,
    color,
    grid,
    render,
    collectionBinding,
    submitField,
    navigateAction,
    submitDataAction,
    heroContent,
    textContent,
    buttonContent,
    repeaterContent,
    heroBlock,
    textBlock,
    buttonBlock,
    repeaterBlock,
    collectionField,
    collection,
    pageAccess,
    page,
  },
};

function strictObject(properties: Record<string, JsonSchema>): JsonSchema {
  return {
    type: 'object',
    properties,
    required: Object.keys(properties),
    additionalProperties: false,
  };
}

function stringSchema(options: {
  description?: string;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
} = {}): JsonSchema {
  return { type: 'string', ...options };
}

function numberSchema(minimum: number, maximum: number): JsonSchema {
  return { type: 'number', minimum, maximum };
}

function integerSchema(minimum: number, maximum: number): JsonSchema {
  return { type: 'integer', minimum, maximum };
}

function enumSchema(values: readonly string[]): JsonSchema {
  return { type: 'string', enum: [...values] };
}

function arraySchema(items: JsonSchema, minItems: number, maxItems: number): JsonSchema {
  return { type: 'array', items, minItems, maxItems };
}

function nullable(schema: JsonSchema): JsonSchema {
  return { anyOf: [schema, { type: 'null' }] };
}

function ref(name: string): JsonSchema {
  return { $ref: `#/$defs/${name}` };
}
