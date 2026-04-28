import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IUsageLog extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  skillId: Types.ObjectId;
  skillVersion: number;
  action: 'fetch' | 'execute' | 'list';
  apiKeyId: Types.ObjectId;
  ip: string;
  userAgent: string;
  timestamp: Date;
}

const usageLogSchema = new Schema<IUsageLog>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  skillId: { type: Schema.Types.ObjectId, ref: 'Skill' },
  skillVersion: { type: Number },
  action: { type: String, enum: ['fetch', 'execute', 'list'], required: true },
  apiKeyId: { type: Schema.Types.ObjectId, ref: 'ApiKey' },
  ip: { type: String, default: '' },
  userAgent: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now },
});

usageLogSchema.index({ timestamp: -1 });
usageLogSchema.index({ userId: 1, timestamp: -1 });
usageLogSchema.index({ skillId: 1, timestamp: -1 });

export const UsageLog = mongoose.model<IUsageLog>('UsageLog', usageLogSchema);
