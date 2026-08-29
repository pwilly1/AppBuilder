import type {
  AiGenerationDensity,
  AiGenerationSectionPattern,
} from '@apptura/shared/ai'

export type AiVisualPromptCase = {
  id: string
  prompt: string
  expectedSectionPatterns: AiGenerationSectionPattern[]
  expectedDensity: AiGenerationDensity
  requiresCollection: boolean
  visualFocus: string
}

// This corpus is intentionally provider-agnostic. It gives manual and future
// automated evaluations a stable set of layouts instead of cherry-picked prompts.
export const AI_VISUAL_PROMPT_CORPUS: AiVisualPromptCase[] = [
  {
    id: 'account-sign-in',
    prompt: 'Create a clean sign-in page with email, password, and a strong primary action.',
    expectedSectionPatterns: ['intro', 'form', 'actions'],
    expectedDensity: 'comfortable',
    requiresCollection: false,
    visualFocus: 'Clear hierarchy, equal fields, and a prominent sign-in action.',
  },
  {
    id: 'account-sign-up',
    prompt: 'Create a modern account creation page with name, email, password, and confirmation actions.',
    expectedSectionPatterns: ['intro', 'form', 'actions'],
    expectedDensity: 'comfortable',
    requiresCollection: false,
    visualFocus: 'Long-form rhythm without cramped inputs or uneven edges.',
  },
  {
    id: 'crew-directory',
    prompt: 'Create a crew directory page that lists team members and has an action to add a new person.',
    expectedSectionPatterns: ['intro', 'list', 'actions', 'split'],
    expectedDensity: 'comfortable',
    requiresCollection: true,
    visualFocus: 'Readable list hierarchy and balanced repeated name and role fields.',
  },
  {
    id: 'inspection-entry',
    prompt: 'Create a field inspection submission page with location, result, notes, and a submit action.',
    expectedSectionPatterns: ['intro', 'form', 'actions'],
    expectedDensity: 'compact',
    requiresCollection: true,
    visualFocus: 'Efficient field layout with consistent controls and usable spacing.',
  },
  {
    id: 'maintenance-history',
    prompt: 'Create a vehicle maintenance page with a service form and recent maintenance history.',
    expectedSectionPatterns: ['intro', 'form', 'actions', 'list'],
    expectedDensity: 'compact',
    requiresCollection: true,
    visualFocus: 'Separate entry and history areas while preserving one coherent page.',
  },
  {
    id: 'protected-profile',
    prompt: 'Create a signed-in user profile page with editable account details and save and cancel actions.',
    expectedSectionPatterns: ['intro', 'form', 'actions'],
    expectedDensity: 'comfortable',
    requiresCollection: true,
    visualFocus: 'Calm account settings layout with clear primary and secondary actions.',
  },
  {
    id: 'delivery-checklist',
    prompt: 'Create a delivery checklist page with driver details, delivery status, notes, and completion action.',
    expectedSectionPatterns: ['intro', 'form', 'actions'],
    expectedDensity: 'compact',
    requiresCollection: true,
    visualFocus: 'Operational density without overlapping or undersized controls.',
  },
  {
    id: 'event-rsvp',
    prompt: 'Create an event RSVP page with event details, attendee information, and a reserve spot action.',
    expectedSectionPatterns: ['intro', 'form', 'actions'],
    expectedDensity: 'comfortable',
    requiresCollection: true,
    visualFocus: 'Inviting top section followed by a visually distinct response form.',
  },
  {
    id: 'inventory-overview',
    prompt: 'Create an inventory overview with a compact list of products and an add item action.',
    expectedSectionPatterns: ['intro', 'list', 'actions', 'split'],
    expectedDensity: 'compact',
    requiresCollection: true,
    visualFocus: 'Dense but aligned list rows with consistent value columns.',
  },
  {
    id: 'flight-activity',
    prompt: 'Create a nearby flight activity page with a concise introduction and a list of recent aircraft.',
    expectedSectionPatterns: ['intro', 'list', 'split'],
    expectedDensity: 'compact',
    requiresCollection: true,
    visualFocus: 'Structured information display with balanced repeated details.',
  },
  {
    id: 'client-contacts',
    prompt: 'Create a client contacts page with searchable-looking contact rows and a new contact action.',
    expectedSectionPatterns: ['intro', 'list', 'actions', 'split'],
    expectedDensity: 'comfortable',
    requiresCollection: true,
    visualFocus: 'Professional directory spacing and strong alignment across rows.',
  },
  {
    id: 'service-landing',
    prompt: 'Create a polished service landing page with a headline, supporting copy, and two clear actions.',
    expectedSectionPatterns: ['intro', 'actions'],
    expectedDensity: 'comfortable',
    requiresCollection: false,
    visualFocus: 'Strong hierarchy, restrained whitespace, and balanced paired actions.',
  },
]
