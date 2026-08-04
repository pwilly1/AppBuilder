import { Document, Schema, model } from 'mongoose';

export const AI_USAGE_STATUSES = [
  'started',
  'succeeded',
  'provider_error',
  'invalid_output',
] as const;

export type AiUsageStatus = typeof AI_USAGE_STATUSES[number];

export interface AiUsageRecord extends Document {
  requestId: string;
  ownerId: string;
  projectId: string;
  scope: 'page';
  provider: string;
  modelName: string;
  status: AiUsageStatus;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cachedInputTokens: number;
  reasoningOutputTokens: number;
  durationMs?: number;
  providerResponseId?: string;
  errorCode?: string;
  finishedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const AiUsageRecordSchema = new Schema<AiUsageRecord>(
  {
    requestId: { type: String, required: true, unique: true },
    ownerId: { type: String, required: true, index: true },
    projectId: { type: String, required: true, index: true },
    scope: { type: String, enum: ['page'], required: true },
    provider: { type: String, required: true },
    modelName: { type: String, required: true },
    status: { type: String, enum: AI_USAGE_STATUSES, required: true },
    inputTokens: { type: Number, required: true, min: 0, default: 0 },
    outputTokens: { type: Number, required: true, min: 0, default: 0 },
    totalTokens: { type: Number, required: true, min: 0, default: 0 },
    cachedInputTokens: { type: Number, required: true, min: 0, default: 0 },
    reasoningOutputTokens: { type: Number, required: true, min: 0, default: 0 },
    durationMs: { type: Number, min: 0 },
    providerResponseId: { type: String },
    errorCode: { type: String },
    finishedAt: { type: Date },
  },
  {
    collection: 'aiusagerecords',
    timestamps: true,
    versionKey: false,
  },
);

AiUsageRecordSchema.index({ ownerId: 1, createdAt: -1 });
AiUsageRecordSchema.index({ ownerId: 1, projectId: 1, createdAt: -1 });

export const AiUsageRecordModel = model<AiUsageRecord>('AiUsageRecord', AiUsageRecordSchema);
