import { SkillFolder } from '../models/skillFolder.js';
import { Skill } from '../models/skill.js';
import { Types } from 'mongoose';

export async function getTree() {
  const folders = await SkillFolder.find().populate('roles', 'name').sort({ name: 1 });
  const skills = await Skill.find({ isActive: true }).select('name slug category folder').sort({ name: 1 });

  // Build tree structure
  const folderMap = new Map<string, any>();
  const roots: any[] = [];

  for (const f of folders) {
    folderMap.set(f._id.toString(), {
      ...f.toJSON(),
      children: [],
      skills: [],
    });
  }

  for (const skill of skills) {
    const folderId = skill.folder?.toString();
    if (folderId && folderMap.has(folderId)) {
      folderMap.get(folderId).skills.push(skill.toJSON());
    }
  }

  for (const [id, folder] of folderMap) {
    const parentId = folder.parent?.toString();
    if (parentId && folderMap.has(parentId)) {
      folderMap.get(parentId).children.push(folder);
    } else {
      roots.push(folder);
    }
  }

  // Skills without folder (root level)
  const rootSkills = skills.filter((s) => !s.folder).map((s) => s.toJSON());

  return { folders: roots, rootSkills };
}

export async function list() {
  return SkillFolder.find().populate('roles', 'name').sort({ name: 1 });
}

export async function getById(id: string) {
  const folder = await SkillFolder.findById(id).populate('roles', 'name');
  if (!folder) throw new Error('Folder nie znaleziony');

  const children = await SkillFolder.find({ parent: id }).populate('roles', 'name').sort({ name: 1 });
  const skills = await Skill.find({ folder: id, isActive: true }).sort({ name: 1 });

  return { ...folder.toJSON(), children, skills };
}

export async function create(data: {
  name: string;
  description?: string;
  parent?: string | null;
  roles?: string[];
}, userId: string) {
  if (data.parent) {
    const parentExists = await SkillFolder.findById(data.parent);
    if (!parentExists) throw new Error('Folder nadrzedny nie istnieje');
  }

  const folder = new SkillFolder({
    name: data.name,
    description: data.description,
    parent: data.parent || null,
    roles: data.roles || [],
    createdBy: userId,
  });
  await folder.save();
  return folder;
}

export async function update(id: string, data: Partial<{
  name: string;
  description: string;
  parent: string | null;
  roles: string[];
}>) {
  // Prevent circular reference
  if (data.parent === id) throw new Error('Folder nie moze byc swoim wlasnym rodzicem');

  if (data.parent) {
    // Check if we'd create a cycle
    let current = data.parent;
    while (current) {
      if (current === id) throw new Error('Wykryto cykliczna zaleznosc folderow');
      const parent = await SkillFolder.findById(current);
      current = parent?.parent?.toString() || '';
    }
  }

  const folder = await SkillFolder.findByIdAndUpdate(id, data, { new: true, runValidators: true }).populate('roles', 'name');
  if (!folder) throw new Error('Folder nie znaleziony');
  return folder;
}

export async function remove(id: string) {
  // Move child folders to parent of deleted folder
  const folder = await SkillFolder.findById(id);
  if (!folder) throw new Error('Folder nie znaleziony');

  await SkillFolder.updateMany({ parent: id }, { parent: folder.parent });
  // Move skills to parent folder
  await Skill.updateMany({ folder: id }, { folder: folder.parent });

  await SkillFolder.findByIdAndDelete(id);
  return folder;
}

export async function moveSkill(skillId: string, folderId: string | null) {
  if (folderId) {
    const folderExists = await SkillFolder.findById(folderId);
    if (!folderExists) throw new Error('Folder docelowy nie istnieje');
  }

  const skill = await Skill.findByIdAndUpdate(skillId, { folder: folderId }, { new: true });
  if (!skill) throw new Error('Skill nie znaleziony');
  return skill;
}

// Get all folder IDs that are descendants of given folders (including themselves)
export async function getDescendantFolderIds(folderIds: string[]): Promise<string[]> {
  const result = new Set(folderIds);
  const queue = [...folderIds];

  while (queue.length > 0) {
    const parentId = queue.shift()!;
    const children = await SkillFolder.find({ parent: parentId }).select('_id');
    for (const child of children) {
      const childId = child._id.toString();
      if (!result.has(childId)) {
        result.add(childId);
        queue.push(childId);
      }
    }
  }

  return Array.from(result);
}

// Get all skills accessible through folder roles for a user
export async function getSkillsByFolderRoles(roleIds: string[]): Promise<string[]> {
  // Find folders that have any of the user's roles
  const folders = await SkillFolder.find({ roles: { $in: roleIds } }).select('_id');
  if (!folders.length) return [];

  const folderIds = folders.map((f) => f._id.toString());
  // Include all descendant folders
  const allFolderIds = await getDescendantFolderIds(folderIds);

  // Get all active skills in those folders
  const skills = await Skill.find({
    folder: { $in: allFolderIds },
    isActive: true,
  }).select('_id');

  return skills.map((s) => s._id.toString());
}
