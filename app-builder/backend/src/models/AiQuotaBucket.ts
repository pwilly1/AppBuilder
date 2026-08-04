import { Document, Schema, model } from 'mongoose';

export interface AiQuotaBucket extends Document {
  ownerId: string;
  windowStart: Date;
  count: number;
  lastReservationId: string;
  expiresAt: Date;
}

const AiQuotaBucketSchema = new Schema<AiQuotaBucket>(
  {
    ownerId: { type: String, required: true },
    windowStart: { type: Date, required: true },
    count: { type: Number, required: true, min: 0, default: 0 },
    lastReservationId: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  {
    collection: 'aiquotabuckets',
    versionKey: false,
  },
);

AiQuotaBucketSchema.index({ ownerId: 1, windowStart: 1 }, { unique: true });
AiQuotaBucketSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const AiQuotaBucketModel = model<AiQuotaBucket>('AiQuotaBucket', AiQuotaBucketSchema);
