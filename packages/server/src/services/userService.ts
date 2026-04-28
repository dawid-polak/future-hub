import { User } from '../models/user.js';
import { ApiKey } from '../models/apiKey.js';
import { generateApiKey } from '../utils/apiKeyGenerator.js';

interface ListParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

export async function list(params: ListParams) {
  const { page = 1, limit = 20, search, isActive } = params;
  const filter: Record<string, unknown> = {};
  if (isActive !== undefined) filter.isActive = isActive;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .populate('roles', 'name')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 }),
    User.countDocuments(filter),
  ]);

  return { users, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function getById(id: string) {
  const user = await User.findById(id).populate('roles');
  if (!user) throw new Error('Uzytkownik nie znaleziony');
  return user;
}

export async function create(data: {
  email: string;
  name: string;
  password: string;
  roles?: string[];
  isAdmin?: boolean;
}) {
  const existing = await User.findOne({ email: data.email });
  if (existing) throw new Error('Uzytkownik z tym emailem juz istnieje');

  const user = new User({
    email: data.email,
    name: data.name,
    passwordHash: data.password,
    roles: data.roles || [],
    isAdmin: data.isAdmin || false,
  });
  await user.save();
  return user.toJSON();
}

export async function update(id: string, data: Partial<{
  name: string;
  email: string;
  roles: string[];
  isAdmin: boolean;
  isActive: boolean;
}>) {
  const user = await User.findByIdAndUpdate(id, data, { new: true, runValidators: true }).populate('roles');
  if (!user) throw new Error('Uzytkownik nie znaleziony');
  return user.toJSON();
}

export async function deactivate(id: string) {
  const user = await User.findByIdAndUpdate(id, { isActive: false }, { new: true });
  if (!user) throw new Error('Uzytkownik nie znaleziony');
  return user.toJSON();
}

export async function createApiKey(userId: string, name: string) {
  const user = await User.findById(userId);
  if (!user) throw new Error('Uzytkownik nie znaleziony');

  const { raw, hash, prefix } = await generateApiKey();
  const apiKey = new ApiKey({
    userId,
    keyHash: hash,
    prefix,
    name,
  });
  await apiKey.save();

  return { raw, prefix, name, id: apiKey._id };
}

export async function listApiKeys(userId: string) {
  return ApiKey.find({ userId }).select('-keyHash').sort({ createdAt: -1 });
}

export async function revokeApiKey(userId: string, keyId: string) {
  const apiKey = await ApiKey.findOneAndUpdate(
    { _id: keyId, userId },
    { isActive: false },
    { new: true }
  );
  if (!apiKey) throw new Error('API key nie znaleziony');
  return apiKey;
}
