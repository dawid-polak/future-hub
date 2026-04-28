import { User } from '../models/user.js';
import { SkillVersion } from '../models/skillVersion.js';
import type { ISkill } from '../models/skill.js';
import type { IRole } from '../models/role.js';

export interface InstallerSkill {
  slug: string;
  name: string;
  description: string;
  category: string;
  version: number;
  content: string;
}

function buildMarkdownWithFrontmatter(skill: InstallerSkill): string {
  const fm = [
    '---',
    `name: ${skill.name}`,
    `description: ${skill.description.replace(/\n/g, ' ').trim() || skill.name}`,
    `slug: ${skill.slug}`,
    `category: ${skill.category}`,
    `version: ${skill.version}`,
    '---',
    '',
  ].join('\n');
  return fm + skill.content;
}

export async function getSkillsForUser(userId: string): Promise<InstallerSkill[]> {
  const user = await User.findById(userId).populate({
    path: 'roles',
    populate: { path: 'skills' },
  });

  if (!user || !user.isActive) return [];

  const seen = new Set<string>();
  const skills: ISkill[] = [];

  for (const role of (user.roles as unknown as IRole[]) || []) {
    for (const skill of (role.skills as unknown as ISkill[]) || []) {
      if (!skill.isActive) continue;
      const id = skill._id.toString();
      if (seen.has(id)) continue;
      seen.add(id);
      skills.push(skill);
    }
  }

  const versions = await SkillVersion.find({
    skillId: { $in: skills.map((s) => s._id) },
  }).lean();

  const versionMap = new Map<string, { version: number; content: string }>();
  for (const v of versions) {
    const key = `${v.skillId.toString()}:${v.version}`;
    versionMap.set(key, { version: v.version, content: v.content });
  }

  const result: InstallerSkill[] = [];
  for (const skill of skills) {
    const v = versionMap.get(`${skill._id.toString()}:${skill.currentVersion}`);
    result.push({
      slug: skill.slug,
      name: skill.name,
      description: skill.description || '',
      category: skill.category,
      version: skill.currentVersion,
      content: v?.content || '',
    });
  }

  return result;
}

export async function getSkillsAsMarkdown(userId: string) {
  const skills = await getSkillsForUser(userId);
  return skills.map((s) => ({
    slug: s.slug,
    filename: `${s.slug}.md`,
    markdown: buildMarkdownWithFrontmatter(s),
  }));
}
