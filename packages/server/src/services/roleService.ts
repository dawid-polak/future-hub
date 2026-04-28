import { Role } from '../models/role.js';
import { User } from '../models/user.js';

export async function list() {
  const roles = await Role.find().populate('skills', 'name category').sort({ name: 1 });
  const rolesWithCounts = await Promise.all(
    roles.map(async (role) => {
      const userCount = await User.countDocuments({ roles: role._id, isActive: true });
      return { ...role.toJSON(), userCount };
    })
  );
  return rolesWithCounts;
}

export async function getById(id: string) {
  const role = await Role.findById(id).populate('skills');
  if (!role) throw new Error('Rola nie znaleziona');
  return role;
}

export async function create(data: { name: string; description?: string; skills?: string[] }) {
  const existing = await Role.findOne({ name: data.name });
  if (existing) throw new Error('Rola o tej nazwie juz istnieje');
  const role = new Role(data);
  await role.save();
  return role;
}

export async function update(id: string, data: Partial<{ name: string; description: string; skills: string[]; agents: string[] }>) {
  const role = await Role.findByIdAndUpdate(id, data, { new: true, runValidators: true }).populate('skills');
  if (!role) throw new Error('Rola nie znaleziona');
  return role;
}

export async function remove(id: string) {
  const role = await Role.findByIdAndDelete(id);
  if (!role) throw new Error('Rola nie znaleziona');
  await User.updateMany({ roles: id }, { $pull: { roles: id } });
  return role;
}
