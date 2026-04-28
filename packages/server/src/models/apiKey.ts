import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IApiKey extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  keyHash: string;
  prefix: string;
  name: string;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  isActive: boolean;
  createdAt: Date;
}

const apiKeySchema = new Schema<IApiKey>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    keyHash: { type: String, required: true },
    prefix: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    lastUsedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

apiKeySchema.index({ prefix: 1 });
apiKeySchema.index({ userId: 1 });

export const ApiKey = mongoose.model<IApiKey>('ApiKey', apiKeySchema);
