import { Skill } from '../models/skill.js';
import { SkillVersion } from '../models/skillVersion.js';

interface ListParams {
  page?: number;
  limit?: number;
  category?: string;
  tags?: string[];
  search?: string;
  sort?: string;
}

export async function list(params: ListParams) {
  const { page = 1, limit = 20, category, tags, search, sort = '-createdAt' } = params;
  const filter: Record<string, unknown> = { isActive: true };
  if (category) filter.category = category;
  if (tags?.length) filter.tags = { $in: tags };
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  const [skills, total] = await Promise.all([
    Skill.find(filter).skip((page - 1) * limit).limit(limit).sort(sort),
    Skill.countDocuments(filter),
  ]);

  return { skills, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function getById(id: string) {
  const skill = await Skill.findById(id);
  if (!skill) throw new Error('Skill nie znaleziony');

  const currentVersion = await SkillVersion.findOne({
    skillId: skill._id,
    version: skill.currentVersion,
  });

  return { ...skill.toJSON(), currentVersionData: currentVersion };
}

export async function create(data: {
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  content: string;
  changelog?: string;
  folder?: string | null;
}, userId: string) {
  const skill = new Skill({
    name: data.name,
    description: data.description,
    category: data.category,
    tags: data.tags,
    folder: data.folder || null,
    currentVersion: 1,
    createdBy: userId,
  });
  await skill.save();

  const version = new SkillVersion({
    skillId: skill._id,
    version: 1,
    content: data.content,
    changelog: data.changelog || 'Wersja poczatkowa',
    createdBy: userId,
  });
  await version.save();

  return { ...skill.toJSON(), currentVersionData: version };
}

export async function updateMeta(id: string, data: Partial<{
  name: string;
  description: string;
  category: string;
  tags: string[];
  isActive: boolean;
  folder: string | null;
}>) {
  const skill = await Skill.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!skill) throw new Error('Skill nie znaleziony');
  return skill;
}

export async function deactivate(id: string) {
  const skill = await Skill.findByIdAndUpdate(id, { isActive: false }, { new: true });
  if (!skill) throw new Error('Skill nie znaleziony');
  return skill;
}

export async function publishVersion(id: string, data: {
  content: string;
  changelog: string;
  files?: Array<{ filename: string; path: string; mimeType: string; size: number }>;
  toolDefinitions?: Array<{ name: string; description: string; inputSchema: object; handler: string }>;
}, userId: string) {
  const skill = await Skill.findById(id);
  if (!skill) throw new Error('Skill nie znaleziony');

  const newVersionNum = skill.currentVersion + 1;
  const version = new SkillVersion({
    skillId: skill._id,
    version: newVersionNum,
    content: data.content,
    changelog: data.changelog,
    files: data.files || [],
    toolDefinitions: data.toolDefinitions || [],
    createdBy: userId,
  });
  await version.save();

  skill.currentVersion = newVersionNum;
  await skill.save();

  return version;
}

export async function getVersions(id: string) {
  return SkillVersion.find({ skillId: id }).sort({ version: -1 });
}

export async function getVersion(id: string, version: number) {
  const v = await SkillVersion.findOne({ skillId: id, version });
  if (!v) throw new Error('Wersja nie znaleziona');
  return v;
}

export async function rollback(id: string, targetVersion: number, userId: string) {
  const target = await SkillVersion.findOne({ skillId: id, version: targetVersion });
  if (!target) throw new Error('Wersja docelowa nie znaleziona');

  return publishVersion(id, {
    content: target.content,
    changelog: `Rollback do wersji ${targetVersion}`,
    files: target.files as Array<{ filename: string; path: string; mimeType: string; size: number }>,
    toolDefinitions: target.toolDefinitions as Array<{ name: string; description: string; inputSchema: object; handler: string }>,
  }, userId);
}
