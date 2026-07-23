import { Schema, model, Document } from 'mongoose';

export type AppDataRecordValue = string | boolean;

export interface AppDataRecord extends Document {
  ownerId: string;
  projectId: string;
  collectionId?: string;
  ownerAppUserId?: string;
  sourceBlockId?: string;
  sourcePageId?: string;
  data: Record<string, AppDataRecordValue>;
  createdAt?: Date;
  updatedAt?: Date;

  // Transitional fields for records created by the former AppSubmission model.
  appUserId?: string;
  formBlockId?: string;
  pageId?: string;
  submittedAt?: Date;
}

const AppDataRecordSchema = new Schema<AppDataRecord>(
  {
    ownerId: { type: String, required: true, index: true },
    projectId: { type: String, required: true, index: true },
    collectionId: { type: String, index: true },
    ownerAppUserId: { type: String, index: true },
    sourceBlockId: { type: String },
    sourcePageId: { type: String },
    data: { type: Schema.Types.Mixed, default: {} },

    // These optional fields let the new model read existing documents in place.
    appUserId: { type: String },
    formBlockId: { type: String },
    pageId: { type: String },
    submittedAt: { type: Date },
  },
  {
    collection: 'appsubmissions',
    timestamps: true,
    versionKey: false,
  },
);

AppDataRecordSchema.index({ ownerId: 1, projectId: 1, collectionId: 1, createdAt: -1 });
AppDataRecordSchema.index({ projectId: 1, collectionId: 1, ownerAppUserId: 1, createdAt: -1 });

export const AppDataRecordModel = model<AppDataRecord>('AppDataRecord', AppDataRecordSchema);
