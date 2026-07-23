import { createBlock } from '../shared/schema/registry'
import { CURRENT_SCHEMA_VERSION } from '../shared/schema/gridMigration'
import type { Block, BlockType, GridPlacement, Project } from '../shared/schema/types'

export const DEMO_PROJECT_ID = 'apptura-demo'
export const DEMO_PROJECT_ROUTE = '/editor/demo'

const HOME_PAGE_ID = 'demo-home'
const INSPECTION_PAGE_ID = 'demo-inspection'
const NOTES_PAGE_ID = 'demo-notes'
const SUMMARY_PAGE_ID = 'demo-summary'
const NOTE_FIELD_ID = 'demo-note-field'
const NOTE_VARIABLE_ID = 'demo-saved-note'
const ROUTE_CARD_ID = 'demo-route-card'
const SUMMARY_CARD_ID = 'demo-summary-card'

const DEMO_HERO_IMAGE = 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=900&q=85'

type DemoBlockOptions = {
  bindings?: Block['bindings']
  parentId?: string
}

function createDemoBlock(
  id: string,
  type: BlockType,
  grid: GridPlacement,
  props: Record<string, unknown> = {},
  options: DemoBlockOptions = {},
): Block {
  const block = createBlock(type, props)
  return {
    ...block,
    id,
    ...(options.bindings ? { bindings: options.bindings } : {}),
    ...(options.parentId ? { parentId: options.parentId } : {}),
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
    name: 'FieldReady',
    dataCollections: [],
    pages: [
      {
        id: HOME_PAGE_ID,
        title: 'Today',
        path: '/today',
        appearance: { backgroundColor: '#f4f7fb' },
        blocks: [
          createDemoBlock('demo-live-badge', 'badge', { colStart: 2, rowStart: 2, colSpan: 8, rowSpan: 2 }, {
            text: 'FIELDREADY / LIVE',
            backgroundColor: '#dbeafe',
            textColor: '#1d4ed8',
            borderColor: '#bfdbfe',
            fontSize: 12,
          }),
          createDemoBlock('demo-home-hero', 'hero', { colStart: 2, rowStart: 4, colSpan: 13, rowSpan: 4 }, {
            headline: 'Good morning, Maya.',
            headlineSize: 30,
            contentPadding: 8,
          }),
          createDemoBlock('demo-home-copy', 'text', { colStart: 2, rowStart: 8, colSpan: 13, rowSpan: 3 }, {
            value: 'Your route is ready. Three locations are scheduled, with one safety inspection due before noon.',
            fontSize: 14,
            contentPadding: 8,
          }),
          createDemoBlock('demo-site-image', 'image', { colStart: 2, rowStart: 11, colSpan: 13, rowSpan: 7 }, {
            src: DEMO_HERO_IMAGE,
            alt: 'Construction team working at a field site',
            fit: 'cover',
            positionX: 50,
            positionY: 48,
            borderRadius: 20,
            borderColor: '#dbe3ef',
            borderWidth: 1,
            backgroundColor: '#dbeafe',
          }),
          createDemoBlock(ROUTE_CARD_ID, 'container', { colStart: 2, rowStart: 19, colSpan: 13, rowSpan: 6 }, {
            backgroundColor: '#ffffff',
            borderColor: '#dbe3ef',
            borderWidth: 1,
            borderRadius: 20,
            opacity: 1,
          }),
          createDemoBlock('demo-next-stop', 'text', { colStart: 1, rowStart: 1, colSpan: 13, rowSpan: 3 }, {
            value: 'NEXT STOP / 9:30 AM\nNorthline Distribution Center',
            fontSize: 14,
            contentPadding: 10,
          }, { parentId: ROUTE_CARD_ID }),
          createDemoBlock('demo-route-progress', 'progressBar', { colStart: 1, rowStart: 4, colSpan: 13, rowSpan: 2 }, {
            label: 'Route completed',
            value: 62,
            showLabel: true,
            trackColor: '#e2e8f0',
            fillColor: '#2563eb',
            textColor: '#475569',
          }, { parentId: ROUTE_CARD_ID }),
          createDemoBlock('demo-begin-inspection', 'button', { colStart: 2, rowStart: 27, colSpan: 9, rowSpan: 2 }, {
            label: 'Begin inspection',
            fontSize: 14,
            buttonPaddingX: 22,
            buttonPaddingY: 11,
            borderRadius: 12,
            backgroundColor: '#2563eb',
            textColor: '#ffffff',
            action: { type: 'navigate', targetPageId: INSPECTION_PAGE_ID },
          }),
        ],
      },
      {
        id: INSPECTION_PAGE_ID,
        title: 'Inspection',
        path: '/inspection',
        appearance: { backgroundColor: '#fffbf5' },
        blocks: [
          createDemoBlock('demo-job-badge', 'badge', { colStart: 2, rowStart: 2, colSpan: 6, rowSpan: 2 }, {
            text: 'JOB FR-2048',
            backgroundColor: '#e0e7ff',
            textColor: '#3730a3',
            borderColor: '#c7d2fe',
            fontSize: 12,
          }),
          createDemoBlock('demo-inspection-hero', 'hero', { colStart: 2, rowStart: 4, colSpan: 13, rowSpan: 4 }, {
            headline: 'Warehouse safety inspection',
            headlineSize: 27,
            contentPadding: 8,
          }),
          createDemoBlock('demo-location-copy', 'text', { colStart: 2, rowStart: 8, colSpan: 13, rowSpan: 3 }, {
            value: 'Northline Distribution Center\nDock 4 / Due 11:30 AM',
            fontSize: 14,
            contentPadding: 8,
          }),
          createDemoBlock('demo-checklist-progress', 'progressBar', { colStart: 2, rowStart: 12, colSpan: 13, rowSpan: 2 }, {
            label: 'Inspection checklist',
            value: 40,
            showLabel: true,
            fillColor: '#2563eb',
          }),
          createDemoBlock('demo-exits-check', 'checkbox', { colStart: 2, rowStart: 15, colSpan: 13, rowSpan: 2 }, {
            label: 'Emergency exits are clear',
            fieldKey: 'exitsClear',
            checked: true,
            boxColor: '#2563eb',
          }),
          createDemoBlock('demo-fire-check', 'checkbox', { colStart: 2, rowStart: 18, colSpan: 13, rowSpan: 2 }, {
            label: 'Fire equipment is accessible',
            fieldKey: 'fireEquipment',
            checked: true,
            boxColor: '#2563eb',
          }),
          createDemoBlock('demo-loading-check', 'checkbox', { colStart: 2, rowStart: 21, colSpan: 13, rowSpan: 2 }, {
            label: 'Loading zone is secured',
            fieldKey: 'loadingZone',
            checked: false,
            boxColor: '#2563eb',
          }),
          createDemoBlock('demo-photo-toggle', 'toggle', { colStart: 2, rowStart: 24, colSpan: 10, rowSpan: 2 }, {
            label: 'Require photo proof',
            fieldKey: 'photoProof',
            checked: true,
            activeColor: '#2563eb',
          }),
          createDemoBlock('demo-add-note', 'button', { colStart: 2, rowStart: 27, colSpan: 7, rowSpan: 2 }, {
            label: 'Add field note',
            contentPadding: 8,
            buttonPaddingX: 16,
            buttonPaddingY: 10,
            borderRadius: 12,
            action: { type: 'navigate', targetPageId: NOTES_PAGE_ID },
          }),
          createDemoBlock('demo-route-back', 'button', { colStart: 10, rowStart: 27, colSpan: 5, rowSpan: 2 }, {
            label: 'Back',
            contentPadding: 8,
            buttonPaddingX: 16,
            buttonPaddingY: 10,
            borderRadius: 12,
            backgroundColor: '#e2e8f0',
            textColor: '#0f172a',
            action: { type: 'navigate', targetPageId: HOME_PAGE_ID },
          }),
        ],
      },
      {
        id: NOTES_PAGE_ID,
        title: 'Notes',
        path: '/notes',
        appearance: { backgroundColor: '#f8fafc' },
        stateVariables: [
          {
            id: NOTE_VARIABLE_ID,
            name: 'Saved field note',
            type: 'text',
            initialValue: 'No field note saved yet.',
          },
        ],
        blocks: [
          createDemoBlock('demo-note-badge', 'badge', { colStart: 2, rowStart: 2, colSpan: 5, rowSpan: 2 }, {
            text: 'FIELD NOTE',
            backgroundColor: '#fef3c7',
            textColor: '#92400e',
            borderColor: '#fde68a',
            fontSize: 12,
          }),
          createDemoBlock('demo-note-hero', 'hero', { colStart: 2, rowStart: 4, colSpan: 13, rowSpan: 4 }, {
            headline: 'Capture site context',
            headlineSize: 28,
            contentPadding: 8,
          }),
          createDemoBlock('demo-note-copy', 'text', { colStart: 2, rowStart: 8, colSpan: 13, rowSpan: 3 }, {
            value: 'Record anything the office team should know before this inspection is closed.',
            fontSize: 14,
            contentPadding: 8,
          }),
          createDemoBlock(NOTE_FIELD_ID, 'text', { colStart: 2, rowStart: 11, colSpan: 13, rowSpan: 5 }, {
            value: '',
            editable: true,
            textInputMode: 'multiline',
            fieldLabel: 'Site note',
            showFieldLabel: true,
            placeholder: 'Example: Replace damaged dock signage...',
            fieldKey: 'siteNote',
            borderRadius: 14,
            backgroundColor: '#ffffff',
            borderColor: '#cbd5e1',
          }),
          createDemoBlock('demo-latest-note-badge', 'badge', { colStart: 2, rowStart: 17, colSpan: 5, rowSpan: 2 }, {
            text: 'LATEST NOTE',
            backgroundColor: '#e2e8f0',
            textColor: '#334155',
            borderColor: '#cbd5e1',
            fontSize: 11,
          }),
          createDemoBlock('demo-saved-note', 'text', { colStart: 2, rowStart: 19, colSpan: 13, rowSpan: 3 }, {
            value: 'No field note saved yet.',
            fontSize: 14,
            contentPadding: 8,
          }, {
            bindings: {
              value: {
                source: 'pageState',
                variableId: NOTE_VARIABLE_ID,
                fallback: 'No field note saved yet.',
              },
            },
          }),
          createDemoBlock('demo-save-note', 'button', { colStart: 2, rowStart: 23, colSpan: 7, rowSpan: 2 }, {
            label: 'Save note',
            contentPadding: 8,
            buttonPaddingX: 18,
            buttonPaddingY: 10,
            borderRadius: 12,
            action: {
              type: 'setPageState',
              variableId: NOTE_VARIABLE_ID,
              value: { source: 'formValue', fieldBlockId: NOTE_FIELD_ID, fallback: 'No field note saved yet.' },
            },
          }),
          createDemoBlock('demo-review-summary', 'button', { colStart: 2, rowStart: 27, colSpan: 8, rowSpan: 2 }, {
            label: 'Review summary',
            contentPadding: 8,
            buttonPaddingX: 18,
            buttonPaddingY: 10,
            borderRadius: 12,
            backgroundColor: '#0c1830',
            textColor: '#ffffff',
            action: { type: 'navigate', targetPageId: SUMMARY_PAGE_ID },
          }),
        ],
      },
      {
        id: SUMMARY_PAGE_ID,
        title: 'Summary',
        path: '/summary',
        appearance: { backgroundColor: '#f0fdf4' },
        blocks: [
          createDemoBlock('demo-ready-badge', 'badge', { colStart: 2, rowStart: 2, colSpan: 8, rowSpan: 2 }, {
            text: 'INSPECTION READY',
            backgroundColor: '#dcfce7',
            textColor: '#166534',
            borderColor: '#bbf7d0',
            fontSize: 12,
          }),
          createDemoBlock('demo-summary-hero', 'hero', { colStart: 2, rowStart: 4, colSpan: 13, rowSpan: 5 }, {
            headline: 'Ready for the office.',
            headlineSize: 30,
            contentPadding: 8,
          }),
          createDemoBlock('demo-summary-copy', 'text', { colStart: 2, rowStart: 9, colSpan: 13, rowSpan: 4 }, {
            value: 'Northline Distribution Center passed its required checks. The report is prepared for review and sync.',
            fontSize: 15,
            contentPadding: 8,
          }),
          createDemoBlock('demo-summary-progress', 'progressBar', { colStart: 2, rowStart: 14, colSpan: 13, rowSpan: 2 }, {
            label: 'Inspection complete',
            value: 100,
            showLabel: true,
            trackColor: '#dcfce7',
            fillColor: '#16a34a',
            textColor: '#166534',
          }),
          createDemoBlock(SUMMARY_CARD_ID, 'container', { colStart: 2, rowStart: 18, colSpan: 13, rowSpan: 6 }, {
            backgroundColor: '#ffffff',
            borderColor: '#bbf7d0',
            borderWidth: 1,
            borderRadius: 20,
            opacity: 1,
          }),
          createDemoBlock('demo-summary-details', 'text', { colStart: 1, rowStart: 1, colSpan: 13, rowSpan: 6 }, {
            value: '3 safety checks reviewed\nPhoto proof enabled\nField note attached\nLast updated just now',
            fontSize: 14,
            contentPadding: 12,
          }, { parentId: SUMMARY_CARD_ID }),
          createDemoBlock('demo-return-home', 'button', { colStart: 2, rowStart: 27, colSpan: 9, rowSpan: 2 }, {
            label: 'Return to today',
            contentPadding: 8,
            buttonPaddingX: 20,
            buttonPaddingY: 10,
            borderRadius: 12,
            backgroundColor: '#166534',
            textColor: '#ffffff',
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
