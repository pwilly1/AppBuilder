import { createBlock } from '../shared/schema/registry'
import { CURRENT_SCHEMA_VERSION } from '../shared/schema/gridMigration'
import type { Block, BlockType, GridPlacement, Project } from '../shared/schema/types'

export const DEMO_PROJECT_ID = 'apptura-demo'
export const DEMO_PROJECT_ROUTE = '/editor/demo'

const WELCOME_PAGE_ID = 'demo-welcome'
const HOME_PAGE_ID = 'demo-home'
const INSPECTION_PAGE_ID = 'demo-inspection'
const NOTES_PAGE_ID = 'demo-notes'
const SUMMARY_PAGE_ID = 'demo-summary'
const NOTE_FIELD_ID = 'demo-note-field'
const NOTE_VARIABLE_ID = 'demo-saved-note'
const INSPECTION_COLLECTION_ID = 'demo-inspection-reports'

const ROUTE_CARD_ID = 'demo-route-card'
const TASK_CARD_ID = 'demo-task-card'
const NOTE_PREVIEW_CARD_ID = 'demo-note-preview-card'
const SUMMARY_CARD_ID = 'demo-summary-card'
const SUMMARY_STATUS_CARD_ID = 'demo-summary-status-card'
const WELCOME_STATS_ID = 'demo-welcome-stats'

const COLORS = {
  navy: '#0c1830',
  blue: '#2563eb',
  blueDark: '#1d4ed8',
  blueSoft: '#dbeafe',
  canvas: '#f4f7fb',
  ivory: '#fffbf5',
  surface: '#ffffff',
  border: '#dbe3ef',
  text: '#0f172a',
  muted: '#64748b',
  green: '#15803d',
  greenSoft: '#dcfce7',
  amber: '#b45309',
  amberSoft: '#fef3c7',
}

const DEMO_HERO_IMAGE =
  'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=900&q=85'

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

const cardSurface = {
  backgroundColor: COLORS.surface,
  borderColor: COLORS.border,
  borderWidth: 1,
  borderRadius: 18,
  opacity: 1,
}

const primaryButton = {
  fontSize: 14,
  contentPadding: 8,
  buttonPaddingX: 20,
  buttonPaddingY: 11,
  borderRadius: 12,
  backgroundColor: COLORS.blue,
  textColor: COLORS.surface,
}

export function createDemoProject(): Project {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id: DEMO_PROJECT_ID,
    name: 'FieldReady',
    dataCollections: [
      {
        id: INSPECTION_COLLECTION_ID,
        name: 'Inspection Reports',
        publicRead: false,
        access: {
          create: 'authenticated',
          read: 'own',
          update: 'own',
          delete: 'own',
        },
        fields: [
          { id: 'demo-site-field', key: 'siteName', label: 'Site name', type: 'text', required: true },
          { id: 'demo-note-field-schema', key: 'siteNote', label: 'Site note', type: 'text' },
          { id: 'demo-exits-field', key: 'exitsClear', label: 'Exits clear', type: 'boolean', required: true },
          { id: 'demo-fire-field', key: 'fireEquipment', label: 'Fire equipment', type: 'boolean', required: true },
          { id: 'demo-photo-field', key: 'photoProof', label: 'Photo proof', type: 'boolean' },
          { id: 'demo-status-field', key: 'status', label: 'Status', type: 'text', required: true },
        ],
      },
    ],
    pages: [
      {
        id: WELCOME_PAGE_ID,
        title: 'Welcome',
        path: '/welcome',
        access: { mode: 'signedOut', redirectPageId: HOME_PAGE_ID },
        appearance: { backgroundColor: COLORS.canvas },
        blocks: [
          createDemoBlock('demo-welcome-badge', 'badge', { colStart: 2, rowStart: 2, colSpan: 7, rowSpan: 2 }, {
            text: 'FIELDREADY / OPERATIONS',
            backgroundColor: COLORS.blueSoft,
            textColor: COLORS.blueDark,
            borderColor: '#bfdbfe',
            fontSize: 11,
          }),
          createDemoBlock('demo-welcome-mark', 'icon', { colStart: 13, rowStart: 2, colSpan: 2, rowSpan: 2 }, {
            iconName: 'star',
            fontSize: 22,
            color: COLORS.surface,
            backgroundColor: COLORS.navy,
            borderRadius: 999,
          }),
          createDemoBlock('demo-welcome-hero', 'hero', { colStart: 2, rowStart: 4, colSpan: 13, rowSpan: 4 }, {
            headline: 'Field work, without the paperwork.',
            headlineSize: 29,
            contentPadding: 8,
          }),
          createDemoBlock('demo-welcome-copy', 'text', { colStart: 2, rowStart: 8, colSpan: 13, rowSpan: 3 }, {
            value: 'Plan visits, complete inspections, and hand clean reports back to the office from one focused workspace.',
            fontSize: 14,
            contentPadding: 8,
            textColor: COLORS.muted,
          }),
          createDemoBlock('demo-welcome-image', 'image', { colStart: 2, rowStart: 11, colSpan: 13, rowSpan: 8 }, {
            src: DEMO_HERO_IMAGE,
            alt: 'Field operations team reviewing a construction site',
            fit: 'cover',
            positionX: 50,
            positionY: 46,
            borderRadius: 20,
            borderColor: COLORS.border,
            borderWidth: 1,
            backgroundColor: COLORS.blueSoft,
          }),
          createDemoBlock(WELCOME_STATS_ID, 'container', { colStart: 2, rowStart: 20, colSpan: 13, rowSpan: 5 }, cardSurface),
          createDemoBlock('demo-stat-sites', 'text', { colStart: 1, rowStart: 1, colSpan: 4, rowSpan: 5 }, {
            value: '03\nSites today',
            fontSize: 14,
            contentPadding: 10,
            textColor: COLORS.text,
          }, { parentId: WELCOME_STATS_ID }),
          createDemoBlock('demo-stat-checks', 'text', { colStart: 5, rowStart: 1, colSpan: 4, rowSpan: 5 }, {
            value: '11\nChecks due',
            fontSize: 14,
            contentPadding: 10,
            textColor: COLORS.text,
          }, { parentId: WELCOME_STATS_ID }),
          createDemoBlock('demo-stat-start', 'text', { colStart: 9, rowStart: 1, colSpan: 5, rowSpan: 5 }, {
            value: '08:30\nFirst visit',
            fontSize: 14,
            contentPadding: 10,
            textColor: COLORS.text,
          }, { parentId: WELCOME_STATS_ID }),
          createDemoBlock('demo-enter-workspace', 'button', { colStart: 2, rowStart: 27, colSpan: 9, rowSpan: 3 }, {
            ...primaryButton,
            label: 'Open today\'s route',
            action: { type: 'navigate', targetPageId: HOME_PAGE_ID },
          }),
          createDemoBlock('demo-enter-arrow', 'icon', { colStart: 12, rowStart: 27, colSpan: 3, rowSpan: 3 }, {
            iconName: 'arrow',
            fontSize: 24,
            color: COLORS.surface,
            backgroundColor: COLORS.navy,
            borderRadius: 14,
            action: { type: 'navigate', targetPageId: HOME_PAGE_ID },
          }),
        ],
      },
      {
        id: HOME_PAGE_ID,
        title: 'Today',
        path: '/today',
        access: { mode: 'public' },
        appearance: { backgroundColor: COLORS.canvas },
        blocks: [
          createDemoBlock('demo-today-badge', 'badge', { colStart: 2, rowStart: 2, colSpan: 6, rowSpan: 2 }, {
            text: 'MONDAY / 22 JUL',
            backgroundColor: COLORS.surface,
            textColor: COLORS.muted,
            borderColor: COLORS.border,
            fontSize: 11,
          }),
          createDemoBlock('demo-home-hero', 'hero', { colStart: 2, rowStart: 4, colSpan: 13, rowSpan: 4 }, {
            headline: 'Good morning, Maya.',
            headlineSize: 29,
            contentPadding: 8,
          }),
          createDemoBlock('demo-home-copy', 'text', { colStart: 2, rowStart: 8, colSpan: 13, rowSpan: 3 }, {
            value: 'Your route is on schedule. One safety inspection needs attention before noon.',
            fontSize: 14,
            contentPadding: 8,
            textColor: COLORS.muted,
          }),
          createDemoBlock('demo-route-progress', 'progressBar', { colStart: 2, rowStart: 11, colSpan: 13, rowSpan: 2 }, {
            label: 'Daily route',
            value: 62,
            showLabel: true,
            trackColor: '#e2e8f0',
            fillColor: COLORS.blue,
            textColor: COLORS.muted,
          }),
          createDemoBlock(ROUTE_CARD_ID, 'container', { colStart: 2, rowStart: 14, colSpan: 13, rowSpan: 5 }, cardSurface),
          createDemoBlock('demo-route-icon', 'icon', { colStart: 1, rowStart: 2, colSpan: 2, rowSpan: 2 }, {
            iconName: 'home',
            fontSize: 20,
            color: COLORS.blue,
            backgroundColor: COLORS.blueSoft,
            borderRadius: 12,
          }, { parentId: ROUTE_CARD_ID }),
          createDemoBlock('demo-next-stop', 'text', { colStart: 4, rowStart: 1, colSpan: 9, rowSpan: 3 }, {
            value: 'Northline Distribution Center\nDock 4 / 9:30 AM',
            fontSize: 14,
            contentPadding: 8,
            textColor: COLORS.text,
          }, { parentId: ROUTE_CARD_ID }),
          createDemoBlock('demo-route-due', 'badge', { colStart: 9, rowStart: 4, colSpan: 4, rowSpan: 2 }, {
            text: 'NEXT STOP',
            backgroundColor: COLORS.blueSoft,
            textColor: COLORS.blueDark,
            borderColor: '#bfdbfe',
            fontSize: 10,
          }, { parentId: ROUTE_CARD_ID }),
          createDemoBlock(TASK_CARD_ID, 'container', { colStart: 2, rowStart: 20, colSpan: 13, rowSpan: 5 }, cardSurface),
          createDemoBlock('demo-task-icon', 'icon', { colStart: 1, rowStart: 2, colSpan: 2, rowSpan: 2 }, {
            iconName: 'check',
            fontSize: 20,
            color: COLORS.green,
            backgroundColor: COLORS.greenSoft,
            borderRadius: 12,
          }, { parentId: TASK_CARD_ID }),
          createDemoBlock('demo-task-copy', 'text', { colStart: 4, rowStart: 1, colSpan: 9, rowSpan: 3 }, {
            value: 'Warehouse safety inspection\n11 checklist items assigned',
            fontSize: 14,
            contentPadding: 8,
            textColor: COLORS.text,
          }, { parentId: TASK_CARD_ID }),
          createDemoBlock('demo-task-priority', 'badge', { colStart: 9, rowStart: 4, colSpan: 4, rowSpan: 2 }, {
            text: 'HIGH PRIORITY',
            backgroundColor: COLORS.amberSoft,
            textColor: COLORS.amber,
            borderColor: '#fde68a',
            fontSize: 9,
          }, { parentId: TASK_CARD_ID }),
          createDemoBlock('demo-begin-inspection', 'button', { colStart: 2, rowStart: 27, colSpan: 10, rowSpan: 3 }, {
            ...primaryButton,
            label: 'Begin inspection',
            action: { type: 'navigate', targetPageId: INSPECTION_PAGE_ID },
          }),
          createDemoBlock('demo-inspection-arrow', 'icon', { colStart: 13, rowStart: 27, colSpan: 2, rowSpan: 3 }, {
            iconName: 'arrow',
            fontSize: 22,
            color: COLORS.blue,
            backgroundColor: COLORS.blueSoft,
            borderRadius: 12,
            action: { type: 'navigate', targetPageId: INSPECTION_PAGE_ID },
          }),
        ],
      },
      {
        id: INSPECTION_PAGE_ID,
        title: 'Inspection',
        path: '/inspection',
        access: { mode: 'public' },
        appearance: { backgroundColor: COLORS.ivory },
        blocks: [
          createDemoBlock('demo-job-badge', 'badge', { colStart: 2, rowStart: 2, colSpan: 6, rowSpan: 2 }, {
            text: 'JOB FR-2048',
            backgroundColor: COLORS.blueSoft,
            textColor: COLORS.blueDark,
            borderColor: '#bfdbfe',
            fontSize: 11,
          }),
          createDemoBlock('demo-inspection-hero', 'hero', { colStart: 2, rowStart: 4, colSpan: 13, rowSpan: 4 }, {
            headline: 'Warehouse safety inspection',
            headlineSize: 27,
            contentPadding: 8,
          }),
          createDemoBlock('demo-location-copy', 'text', { colStart: 2, rowStart: 8, colSpan: 13, rowSpan: 2 }, {
            value: 'Northline Distribution Center / Dock 4',
            fontSize: 14,
            contentPadding: 8,
            textColor: COLORS.muted,
          }),
          createDemoBlock('demo-checklist-progress', 'progressBar', { colStart: 2, rowStart: 11, colSpan: 13, rowSpan: 2 }, {
            label: 'Required checks',
            value: 75,
            showLabel: true,
            trackColor: '#e2e8f0',
            fillColor: COLORS.blue,
            textColor: COLORS.muted,
          }),
          createDemoBlock('demo-exits-check', 'checkbox', { colStart: 2, rowStart: 14, colSpan: 13, rowSpan: 2 }, {
            label: 'Emergency exits are clear',
            fieldKey: 'exitsClear',
            checked: true,
            boxColor: COLORS.blue,
          }),
          createDemoBlock('demo-fire-check', 'checkbox', { colStart: 2, rowStart: 17, colSpan: 13, rowSpan: 2 }, {
            label: 'Fire equipment is accessible',
            fieldKey: 'fireEquipment',
            checked: true,
            boxColor: COLORS.blue,
          }),
          createDemoBlock('demo-loading-check', 'checkbox', { colStart: 2, rowStart: 20, colSpan: 13, rowSpan: 2 }, {
            label: 'Loading zone is secured',
            fieldKey: 'loadingZone',
            checked: false,
            boxColor: COLORS.blue,
          }),
          createDemoBlock('demo-photo-toggle', 'toggle', { colStart: 2, rowStart: 23, colSpan: 11, rowSpan: 2 }, {
            label: 'Require photo proof',
            fieldKey: 'photoProof',
            checked: true,
            activeColor: COLORS.blue,
          }),
          createDemoBlock('demo-add-note', 'button', { colStart: 2, rowStart: 27, colSpan: 9, rowSpan: 3 }, {
            ...primaryButton,
            label: 'Add field note',
            action: { type: 'navigate', targetPageId: NOTES_PAGE_ID },
          }),
          createDemoBlock('demo-route-back', 'icon', { colStart: 12, rowStart: 27, colSpan: 3, rowSpan: 3 }, {
            iconName: 'home',
            fontSize: 22,
            color: COLORS.navy,
            backgroundColor: '#e2e8f0',
            borderRadius: 14,
            action: { type: 'navigate', targetPageId: HOME_PAGE_ID },
          }),
        ],
      },
      {
        id: NOTES_PAGE_ID,
        title: 'Field Note',
        path: '/field-note',
        access: { mode: 'public' },
        appearance: { backgroundColor: '#f8fafc' },
        stateVariables: [
          {
            id: NOTE_VARIABLE_ID,
            name: 'Saved field note',
            type: 'text',
            initialValue: 'No note captured yet.',
          },
        ],
        blocks: [
          createDemoBlock('demo-note-badge', 'badge', { colStart: 2, rowStart: 2, colSpan: 6, rowSpan: 2 }, {
            text: 'LIVE PAGE DATA',
            backgroundColor: COLORS.amberSoft,
            textColor: COLORS.amber,
            borderColor: '#fde68a',
            fontSize: 10,
          }),
          createDemoBlock('demo-note-hero', 'hero', { colStart: 2, rowStart: 4, colSpan: 13, rowSpan: 4 }, {
            headline: 'Capture site context',
            headlineSize: 28,
            contentPadding: 8,
          }),
          createDemoBlock('demo-note-copy', 'text', { colStart: 2, rowStart: 8, colSpan: 13, rowSpan: 2 }, {
            value: 'Type a note, then save it to update the live preview below.',
            fontSize: 14,
            contentPadding: 8,
            textColor: COLORS.muted,
          }),
          createDemoBlock(NOTE_FIELD_ID, 'text', { colStart: 2, rowStart: 11, colSpan: 13, rowSpan: 6 }, {
            value: '',
            editable: true,
            textInputMode: 'multiline',
            fieldLabel: 'Site note',
            showFieldLabel: true,
            placeholder: 'Example: Replace damaged dock signage...',
            fieldKey: 'siteNote',
            borderRadius: 14,
            backgroundColor: COLORS.surface,
            borderColor: '#cbd5e1',
            textColor: COLORS.text,
          }),
          createDemoBlock(NOTE_PREVIEW_CARD_ID, 'container', { colStart: 2, rowStart: 18, colSpan: 13, rowSpan: 5 }, cardSurface),
          createDemoBlock('demo-note-preview-badge', 'badge', { colStart: 1, rowStart: 1, colSpan: 5, rowSpan: 2 }, {
            text: 'LIVE PREVIEW',
            backgroundColor: COLORS.greenSoft,
            textColor: COLORS.green,
            borderColor: '#bbf7d0',
            fontSize: 9,
          }, { parentId: NOTE_PREVIEW_CARD_ID }),
          createDemoBlock('demo-saved-note', 'text', { colStart: 1, rowStart: 3, colSpan: 13, rowSpan: 3 }, {
            value: 'No note captured yet.',
            fontSize: 14,
            contentPadding: 10,
            textColor: COLORS.text,
          }, {
            parentId: NOTE_PREVIEW_CARD_ID,
            bindings: {
              value: {
                source: 'pageState',
                variableId: NOTE_VARIABLE_ID,
                fallback: 'No note captured yet.',
              },
            },
          }),
          createDemoBlock('demo-save-note', 'button', { colStart: 2, rowStart: 24, colSpan: 8, rowSpan: 2 }, {
            ...primaryButton,
            label: 'Update preview',
            buttonPaddingX: 12,
            buttonPaddingY: 9,
            action: {
              type: 'setPageState',
              variableId: NOTE_VARIABLE_ID,
              value: { source: 'formValue', fieldBlockId: NOTE_FIELD_ID, fallback: 'No note captured yet.' },
            },
          }),
          createDemoBlock('demo-review-summary', 'button', { colStart: 11, rowStart: 24, colSpan: 4, rowSpan: 2 }, {
            ...primaryButton,
            label: 'Review',
            buttonPaddingX: 10,
            buttonPaddingY: 9,
            backgroundColor: COLORS.navy,
            action: { type: 'navigate', targetPageId: SUMMARY_PAGE_ID },
          }),
          createDemoBlock('demo-back-to-checklist', 'button', { colStart: 2, rowStart: 27, colSpan: 7, rowSpan: 2 }, {
            label: 'Back to checklist',
            fontSize: 13,
            buttonPaddingX: 14,
            buttonPaddingY: 9,
            borderRadius: 12,
            backgroundColor: '#e2e8f0',
            textColor: COLORS.navy,
            action: { type: 'navigate', targetPageId: INSPECTION_PAGE_ID },
          }),
        ],
      },
      {
        id: SUMMARY_PAGE_ID,
        title: 'Summary',
        path: '/summary',
        access: { mode: 'public' },
        appearance: { backgroundColor: '#f0fdf4' },
        blocks: [
          createDemoBlock('demo-ready-badge', 'badge', { colStart: 2, rowStart: 2, colSpan: 8, rowSpan: 2 }, {
            text: 'READY FOR REVIEW',
            backgroundColor: COLORS.greenSoft,
            textColor: COLORS.green,
            borderColor: '#bbf7d0',
            fontSize: 11,
          }),
          createDemoBlock('demo-summary-hero', 'hero', { colStart: 2, rowStart: 4, colSpan: 13, rowSpan: 4 }, {
            headline: 'Inspection package complete.',
            headlineSize: 28,
            contentPadding: 8,
          }),
          createDemoBlock('demo-summary-copy', 'text', { colStart: 2, rowStart: 8, colSpan: 13, rowSpan: 3 }, {
            value: 'Northline Distribution Center is ready for supervisor review.',
            fontSize: 15,
            contentPadding: 8,
            textColor: COLORS.muted,
          }),
          createDemoBlock('demo-summary-progress', 'progressBar', { colStart: 2, rowStart: 12, colSpan: 13, rowSpan: 2 }, {
            label: 'Report completeness',
            value: 100,
            showLabel: true,
            trackColor: COLORS.greenSoft,
            fillColor: COLORS.green,
            textColor: COLORS.green,
          }),
          createDemoBlock(SUMMARY_CARD_ID, 'container', { colStart: 2, rowStart: 15, colSpan: 13, rowSpan: 6 }, {
            ...cardSurface,
            borderColor: '#bbf7d0',
          }),
          createDemoBlock('demo-summary-icon', 'icon', { colStart: 1, rowStart: 2, colSpan: 3, rowSpan: 3 }, {
            iconName: 'check',
            fontSize: 24,
            color: COLORS.surface,
            backgroundColor: COLORS.green,
            borderRadius: 999,
          }, { parentId: SUMMARY_CARD_ID }),
          createDemoBlock('demo-summary-details', 'text', { colStart: 4, rowStart: 1, colSpan: 9, rowSpan: 5 }, {
            value: '3 required checks reviewed\nPhoto proof enabled\nField note prepared',
            fontSize: 14,
            contentPadding: 10,
            textColor: COLORS.text,
          }, { parentId: SUMMARY_CARD_ID }),
          createDemoBlock(SUMMARY_STATUS_CARD_ID, 'container', { colStart: 2, rowStart: 22, colSpan: 13, rowSpan: 4 }, cardSurface),
          createDemoBlock('demo-summary-accent', 'shape', { colStart: 1, rowStart: 1, colSpan: 13, rowSpan: 1 }, {
            shapeType: 'pill',
            fillColor: COLORS.blue,
            borderColor: COLORS.blue,
            borderWidth: 0,
            opacity: 1,
          }, { parentId: SUMMARY_STATUS_CARD_ID }),
          createDemoBlock('demo-summary-status', 'text', { colStart: 1, rowStart: 2, colSpan: 13, rowSpan: 3 }, {
            value: 'Status: awaiting supervisor approval',
            fontSize: 13,
            contentPadding: 10,
            textColor: COLORS.text,
          }, { parentId: SUMMARY_STATUS_CARD_ID }),
          createDemoBlock('demo-return-home', 'button', { colStart: 2, rowStart: 27, colSpan: 9, rowSpan: 3 }, {
            ...primaryButton,
            label: 'Return to today',
            backgroundColor: COLORS.green,
            action: { type: 'navigate', targetPageId: HOME_PAGE_ID },
          }),
          createDemoBlock('demo-home-icon', 'icon', { colStart: 12, rowStart: 27, colSpan: 3, rowSpan: 3 }, {
            iconName: 'home',
            fontSize: 22,
            color: COLORS.green,
            backgroundColor: COLORS.greenSoft,
            borderRadius: 14,
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
