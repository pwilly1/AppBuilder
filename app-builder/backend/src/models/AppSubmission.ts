import { Schema, model, Document } from 'mongoose';

export type AppSubmissionValue = string | boolean;

export interface AppSubmission extends Document {
  ownerId: string;
  projectId: string;
  formBlockId: string;
  pageId: string;
  data: Record<string, AppSubmissionValue>;
  submittedAt: Date;
}

const AppSubmissionSchema = new Schema<AppSubmission>(
  {
    ownerId: { type: String, required: true, index: true },
    projectId: { type: String, required: true, index: true },
    formBlockId: { type: String, required: true, index: true },
    pageId: { type: String, required: true, index: true },
    data: { type: Schema.Types.Mixed, default: {} },
    submittedAt: { type: Date, default: () => new Date(), index: true },
  },
  { timestamps: false, versionKey: false },
);

export const AppSubmissionModel = model<AppSubmission>('AppSubmission', AppSubmissionSchema);
