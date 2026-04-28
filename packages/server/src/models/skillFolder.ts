import mongoose, { Schema, Document, Types } from 'mongoose';
import slugify from 'slugify';

export interface ISkillFolder extends Document {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  parent: Types.ObjectId | null;
  roles: Types.ObjectId[];
  description: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const skillFolderSchema = new Schema<ISkillFolder>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String },
    parent: { type: Schema.Types.ObjectId, ref: 'SkillFolder', default: null },
    roles: [{ type: Schema.Types.ObjectId, ref: 'Role' }],
    description: { type: String, default: '' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

skillFolderSchema.index({ parent: 1 });
skillFolderSchema.index({ roles: 1 });

skillFolderSchema.pre('save', function (next) {
  if (this.isModified('name') || !this.slug) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

export const SkillFolder = mongoose.model<ISkillFolder>('SkillFolder', skillFolderSchema);
