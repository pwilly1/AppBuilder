import { AI_GENERATION_CAPABILITIES } from '@apptura/shared/ai';
import type { ProjectRecord } from '../repositories/ProjectRepository.js';

type AiContextPage = {
  title: string;
  path?: string;
  accessMode: 'public' | 'signedIn' | 'signedOut';
  blockTypes: string[];
};

type AiContextCollection = {
  name: string;
  fields: Array<{
    key: string;
    label: string;
    type: string;
    required: boolean;
  }>;
  access: {
    create: 'anyone' | 'authenticated';
    read: 'public' | 'own' | 'none';
    update: 'own' | 'none';
    delete: 'own' | 'none';
  };
};

export type AiGenerationContext = {
  project: {
    name: string;
    schemaVersion: number | null;
    pages: AiContextPage[];
    collections: AiContextCollection[];
  };
  capabilities: typeof AI_GENERATION_CAPABILITIES;
};

export function buildAiGenerationContext(project: ProjectRecord): AiGenerationContext {
  return {
    project: {
      name: project.name,
      schemaVersion: project.schemaVersion ?? null,
      pages: (project.pages ?? []).map((page) => ({
        title: page.title?.trim() || 'Untitled Page',
        ...(page.path ? { path: page.path } : {}),
        accessMode: page.access?.mode ?? 'public',
        blockTypes: collectBlockTypes(page.blocks),
      })),
      collections: (project.dataCollections ?? []).map((collection) => ({
        name: collection.name,
        fields: collection.fields.map((field) => ({
          key: field.key,
          label: field.label,
          type: field.type,
          required: field.required === true,
        })),
        access: collection.access ?? {
          create: 'anyone',
          read: collection.publicRead ? 'public' : 'none',
          update: 'none',
          delete: 'none',
        },
      })),
    },
    capabilities: AI_GENERATION_CAPABILITIES,
  };
}

function collectBlockTypes(blocks: unknown[] | undefined): string[] {
  const types = new Set<string>();
  for (const block of blocks ?? []) {
    if (!block || typeof block !== 'object' || Array.isArray(block)) continue;
    const type = (block as Record<string, unknown>).type;
    if (typeof type === 'string' && type) types.add(type);
  }
  return [...types].sort();
}
