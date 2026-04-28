import { UsageLog } from '../models/usageLog.js';
import { Skill } from '../models/skill.js';
import { User } from '../models/user.js';
import mongoose from 'mongoose';

export async function log(data: {
  userId: string;
  skillId?: string;
  skillVersion?: number;
  action: 'fetch' | 'execute' | 'list';
  apiKeyId?: string;
  ip: string;
  userAgent: string;
}) {
  return UsageLog.create({
    ...data,
    timestamp: new Date(),
  });
}

export async function getDashboard(dateRange?: { from: Date; to: Date }) {
  const dateFilter = dateRange
    ? { timestamp: { $gte: dateRange.from, $lte: dateRange.to } }
    : {};

  const [totalSkills, totalUsers, totalRoles, recentLogs, topSkills] = await Promise.all([
    Skill.countDocuments({ isActive: true }),
    User.countDocuments({ isActive: true }),
    mongoose.model('Role').countDocuments(),
    UsageLog.find(dateFilter)
      .sort({ timestamp: -1 })
      .limit(10)
      .populate('userId', 'name email')
      .populate('skillId', 'name'),
    UsageLog.aggregate([
      { $match: { ...dateFilter, skillId: { $exists: true } } },
      { $group: { _id: '$skillId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'skills',
          localField: '_id',
          foreignField: '_id',
          as: 'skill',
        },
      },
      { $unwind: '$skill' },
      { $project: { name: '$skill.name', category: '$skill.category', count: 1 } },
    ]),
  ]);

  return { totalSkills, totalUsers, totalRoles, recentLogs, topSkills };
}

export async function getSkillUsage(skillId: string, dateRange?: { from: Date; to: Date }) {
  const match: Record<string, unknown> = { skillId: new mongoose.Types.ObjectId(skillId) };
  if (dateRange) {
    match.timestamp = { $gte: dateRange.from, $lte: dateRange.to };
  }

  const usage = await UsageLog.aggregate([
    { $match: match },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const total = await UsageLog.countDocuments(match);
  return { usage, total };
}

export async function getUserActivity(userId: string, dateRange?: { from: Date; to: Date }) {
  const match: Record<string, unknown> = { userId: new mongoose.Types.ObjectId(userId) };
  if (dateRange) {
    match.timestamp = { $gte: dateRange.from, $lte: dateRange.to };
  }

  const logs = await UsageLog.find(match)
    .sort({ timestamp: -1 })
    .limit(50)
    .populate('skillId', 'name category');

  const total = await UsageLog.countDocuments(match);
  return { logs, total };
}
