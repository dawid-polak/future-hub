import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISkillFile {
  filename: string;
  path: string;
  mimeType: string;
  size: number;
}

export interface IMcpTool {
  name: string;
  description: string;
  inputSchema: object;
  handler: string;
}

export interface ISkillVersion extends Document {
  _id: Types.ObjectId;
  skillId: Types.ObjectId;
  version: number;
  content: string;
  files: ISkillFile[];
  toolDefinitions: IMcpTool[];
  changelog: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
}

const skillFileSchema = new Schema<ISkillFile>(
  {
    filename: { type: String, required: true },
    path: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
  },
  { _id: false }
);

const mcpToolSchema = new Schema<IMcpTool>(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    inputSchema: { type: Schema.Types.Mixed, default: {} },
    handler: { type: String, required: true },
  },
  { _id: false }
);

const skillVersionSchema = new Schema<ISkillVersion>(
  {
    skillId: { type: Schema.Types.ObjectId, ref: 'Skill', required: true },
    version: { type: Number, required: true },
    content: { type: String, default: '' },
    files: [skillFileSchema],
    toolDefinitions: [mcpToolSchema],
    changelog: { type: String, default: '' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

skillVersionSchema.index({ skillId: 1, version: 1 }, { unique: true });

export const SkillVersion = mongoose.model<ISkillVersion>('SkillVersion', skillVersionSchema);
