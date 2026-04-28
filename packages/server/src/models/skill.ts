import mongoose, { Schema, Document, Types } from 'mongoose';
import slugify from 'slugify';

export interface ISkill extends Document {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  description: string;
  category: string;
  tags: string[];
  currentVersion: number;
  isActive: boolean;
  folder: Types.ObjectId | null;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const skillSchema = new Schema<ISkill>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true },
    description: { type: String, default: '' },
    category: { type: String, default: 'general', trim: true },
    tags: [{ type: String, trim: true }],
    currentVersion: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true },
    folder: { type: Schema.Types.ObjectId, ref: 'SkillFolder', default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

skillSchema.index({ category: 1 });
skillSchema.index({ tags: 1 });
skillSchema.index({ folder: 1 });

skillSchema.pre('save', function (next) {
  if (this.isModified('name') || !this.slug) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

export const Skill = mongoose.model<ISkill>('Skill', skillSchema);
