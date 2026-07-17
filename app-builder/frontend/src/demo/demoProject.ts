import { createBlock } from '../shared/schema/registry'
import { CURRENT_SCHEMA_VERSION } from '../shared/schema/gridMigration'
import type { Block, BlockType, GridPlacement, Project } from '../shared/schema/types'

export const DEMO_PROJECT_ID = 'apptura-demo'
export const DEMO_PROJECT_ROUTE = '/editor/demo'

const CHECK_IN_PAGE_ID = 'demo-check-in'
const HOME_PAGE_ID = 'demo-home'
const NAME_FIELD_ID = 'demo-name-field'
const GREETING_VARIABLE_ID = 'demo-greeting'

function createDemoBlock(
  id: string,
  type: BlockType,
  grid: GridPlacement,
  props: Record<string, unknown> = {},
  bindings?: Block['bindings'],
): Block {
  const block = createBlock(type, props)
  return {
    ...block,
    id,
    ...(bindings ? { bindings } : {}),
    layout: {
      ...block.layout,
      grid,
    },
  }
}

export function createDemoProject(): Project {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id: DEMO_PROJECT_ID,
    name: 'FieldReady Demo',
    dataCollections: [],
    pages: [
      {
        id: HOME_PAGE_ID,
        title: 'Welcome',
        path: '/welcome',
        blocks: [
          createDemoBlock('demo-badge', 'badge', { colStart: 2, rowStart: 2, colSpan: 7, rowSpan: 2 }, {
            text: 'FIELD OPERATIONS',
            backgroundColor: '#dbeafe',
            textColor: '#1d4ed8',
          }),
          createDemoBlock('demo-hero', 'hero', { colStart: 2, rowStart: 4, colSpan: 13, rowSpan: 5 }, {
            headline: 'Your day in the field, organized.',
            headlineSize: 30,
          }),
          createDemoBlock('demo-intro', 'text', { colStart: 2, rowStart: 9, colSpan: 13, rowSpan: 4 }, {
            value: 'A hands-on Apptura sample. Move blocks, edit content, resize the layout, and open Preview to test the app flow.',
            fontSize: 15,
          }),
          createDemoBlock('demo-start', 'button', { colStart: 2, rowStart: 15, colSpan: 7, rowSpan: 2 }, {
            label: 'Start check-in',
            action: { type: 'navigate', targetPageId: CHECK_IN_PAGE_ID },
          }),
          createDemoBlock('demo-progress', 'progressBar', { colStart: 2, rowStart: 20, colSpan: 13, rowSpan: 2 }, {
            label: 'Today\'s route',
            value: 65,
            showLabel: true,
          }),
          createDemoBlock('demo-tip', 'text', { colStart: 2, rowStart: 24, colSpan: 13, rowSpan: 3 }, {
            value: 'Tip: switch between Pages, Blocks, and Data in the Build Tools panel.',
            fontSize: 13,
          }),
        ],
      },
      {
        id: CHECK_IN_PAGE_ID,
        title: 'Check In',
        path: '/check-in',
        stateVariables: [
          {
            id: GREETING_VARIABLE_ID,
            name: 'Greeting',
            type: 'text',
            initialValue: 'Your live greeting appears here.',
          },
        ],
        blocks: [
          createDemoBlock('demo-checkin-hero', 'hero', { colStart: 2, rowStart: 2, colSpan: 13, rowSpan: 4 }, {
            headline: 'Field check-in',
            headlineSize: 28,
          }),
          createDemoBlock('demo-checkin-copy', 'text', { colStart: 2, rowStart: 6, colSpan: 13, rowSpan: 3 }, {
            value: 'Type a name in Preview mode, then tap the button to update the text below.',
            fontSize: 14,
          }),
          createDemoBlock(NAME_FIELD_ID, 'input', { colStart: 2, rowStart: 10, colSpan: 13, rowSpan: 3 }, {
            label: 'Team member',
            placeholder: 'Enter your name',
            fieldKey: 'teamMember',
          }),
          createDemoBlock(
            'demo-live-greeting',
            'text',
            { colStart: 2, rowStart: 14, colSpan: 13, rowSpan: 3 },
            { value: 'Your live greeting appears here.', fontSize: 16 },
            {
              value: {
                source: 'pageState',
                variableId: GREETING_VARIABLE_ID,
                fallback: 'Your live greeting appears here.',
              },
            },
          ),
          createDemoBlock('demo-update-greeting', 'button', { colStart: 2, rowStart: 18, colSpan: 8, rowSpan: 2 }, {
            label: 'Update greeting',
            action: {
              type: 'setPageState',
              variableId: GREETING_VARIABLE_ID,
              value: { source: 'formValue', fieldBlockId: NAME_FIELD_ID, fallback: 'Field teammate' },
            },
          }),
          createDemoBlock('demo-ready-toggle', 'toggle', { colStart: 2, rowStart: 22, colSpan: 8, rowSpan: 2 }, {
            label: 'Ready for route',
            checked: true,
          }),
          createDemoBlock('demo-home-button', 'button', { colStart: 2, rowStart: 26, colSpan: 6, rowSpan: 2 }, {
            label: 'Back home',
            backgroundColor: '#e2e8f0',
            textColor: '#0f172a',
            action: { type: 'navigate', targetPageId: HOME_PAGE_ID },
          }),
        ],
      },
    ],
  }
}

export function isDemoProject(project: Pick<Project, 'id'> | null | undefined): boolean {
  return project?.id === DEMO_PROJECT_ID
}
