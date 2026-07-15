import type { TemplateBlockDefinition, TemplateSectionPlacement } from './templateTypes'

export function rootContainer(
  key: string,
  cols: number,
  rows: number,
  backgroundColor: string,
  borderColor: string,
  borderRadius: number,
): TemplateBlockDefinition {
  return {
    key,
    type: 'container',
    grid: { colStart: 1, rowStart: 1, colSpan: cols, rowSpan: rows },
    props: {
      backgroundColor,
      borderColor,
      borderWidth: 1,
      borderRadius,
      opacity: 1,
    },
  }
}

export function section(
  sectionId: string,
  colStart: number,
  rowStart: number,
  colSpan: number,
  rowSpan: number,
  blockProps?: Record<string, Record<string, any>>,
): TemplateSectionPlacement {
  return {
    sectionId,
    grid: { colStart, rowStart, colSpan, rowSpan },
    blockProps,
  }
}

export function featureRow(prefix: string, rowStart: number, iconName: string, title: string, body: string): TemplateBlockDefinition[] {
  return [
    {
      key: `${prefix}Icon`,
      parentKey: 'container',
      type: 'icon',
      grid: { colStart: 2, rowStart, colSpan: 2, rowSpan: 2 },
      props: { iconName, fontSize: 22, backgroundColor: '#eff6ff', color: '#2563eb' },
    },
    {
      key: `${prefix}Title`,
      parentKey: 'container',
      type: 'text',
      grid: { colStart: 4, rowStart, colSpan: 8, rowSpan: 1 },
      props: { value: title, fontSize: 15 },
      render: { alignX: 'start', alignY: 'start' },
    },
    {
      key: `${prefix}Body`,
      parentKey: 'container',
      type: 'text',
      grid: { colStart: 4, rowStart: rowStart + 1, colSpan: 9, rowSpan: 1 },
      props: { value: body, fontSize: 12 },
      render: { alignX: 'start', alignY: 'start' },
    },
  ]
}

export function checkboxRow(
  key: string,
  rowStart: number,
  label: string,
  checked: boolean,
  submitGroupKey?: string,
): TemplateBlockDefinition {
  return {
    key,
    parentKey: 'container',
    type: 'checkbox',
    grid: { colStart: 2, rowStart, colSpan: 10, rowSpan: 2 },
    props: { label, checked, ...(submitGroupKey ? { submitGroupKey } : {}) },
    render: { alignX: 'start', alignY: 'start' },
  }
}

export function metricCard(prefix: string, colStart: number, value: string, label: string): TemplateBlockDefinition[] {
  return [
    {
      key: `${prefix}Value`,
      parentKey: 'container',
      type: 'text',
      grid: { colStart, rowStart: 2, colSpan: 5, rowSpan: 2 },
      props: { value, fontSize: 24 },
      render: { alignX: 'start', alignY: 'start' },
    },
    {
      key: `${prefix}Label`,
      parentKey: 'container',
      type: 'badge',
      grid: { colStart, rowStart: 5, colSpan: 5, rowSpan: 2 },
      props: { text: label, backgroundColor: '#ffffff', textColor: '#475569', borderColor: '#bfdbfe' },
      render: { alignX: 'start', alignY: 'start' },
    },
  ]
}

export function button(key: string, colStart: number, label: string): TemplateBlockDefinition {
  return {
    key,
    parentKey: 'container',
    type: 'button',
    grid: { colStart, rowStart: 1, colSpan: 5, rowSpan: 3 },
    props: {
      label,
      backgroundColor: '#f8fafc',
      textColor: '#0f172a',
      borderRadius: 14,
      fontSize: 12,
      buttonPaddingX: 10,
      buttonPaddingY: 8,
    },
  }
}
