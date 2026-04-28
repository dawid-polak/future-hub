import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IRole extends Document {
  _id: Types.ObjectId;
  name: string;
  description: string;
  skills: Types.ObjectId[];
  agents: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const roleSchema = new Schema<IRole>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: '' },
    skills: [{ type: Schema.Types.ObjectId, ref: 'Skill' }],
    agents: [{ type: Schema.Types.ObjectId, ref: 'Agent' }],
  },
  { timestamps: true }
);

export const Role = mongoose.model<IRole>('Role', roleSchema);
