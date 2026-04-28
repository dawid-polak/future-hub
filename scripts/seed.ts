import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { User } from '../packages/server/src/models/user.js';
import { Role } from '../packages/server/src/models/role.js';
import { Skill } from '../packages/server/src/models/skill.js';
import { SkillVersion } from '../packages/server/src/models/skillVersion.js';

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('Brak MONGODB_URI w .env');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Polaczono z MongoDB');

  // Admin
  let admin = await User.findOne({ email: process.env.ADMIN_EMAIL });
  if (!admin) {
    admin = new User({
      email: process.env.ADMIN_EMAIL || 'admin@futurehub.pl',
      name: 'Administrator',
      passwordHash: process.env.ADMIN_PASSWORD || 'Admin123!',
      isAdmin: true,
      isActive: true,
    });
    await admin.save();
    console.log(`Admin utworzony: ${admin.email}`);
  } else {
    console.log(`Admin juz istnieje: ${admin.email}`);
  }

  // Role
  const roleNames = [
    { name: 'frontend-dev', description: 'Frontend developer — Vue, React, CSS, TypeScript' },
    { name: 'devops', description: 'DevOps — Docker, CI/CD, monitoring, infrastructure' },
    { name: 'testing', description: 'QA / Testing — testy jednostkowe, integracyjne, e2e' },
  ];

  const roles: Record<string, any> = {};
  for (const r of roleNames) {
    let role = await Role.findOne({ name: r.name });
    if (!role) {
      role = await Role.create(r);
      console.log(`Rola utworzona: ${r.name}`);
    }
    roles[r.name] = role;
  }

  // Skille
  const skillsData = [
    {
      name: 'Vue Component Generator',
      category: 'frontend',
      tags: ['vue', 'components', 'typescript'],
      content: '# Vue Component Generator\n\nGeneruj komponenty Vue 3 z Composition API i `<script setup>`.\n\n## Zasady\n- Uzywaj TypeScript\n- Uzywaj Composition API\n- Dodawaj props z typami\n- Emituj eventy z typami\n\n## Szablon\n```vue\n<script setup lang="ts">\ninterface Props {\n  // props tutaj\n}\nconst props = defineProps<Props>()\n</script>\n\n<template>\n  <!-- template -->\n</template>\n```',
      role: 'frontend-dev',
    },
    {
      name: 'TypeScript Conventions',
      category: 'frontend',
      tags: ['typescript', 'conventions', 'style'],
      content: '# TypeScript Conventions\n\n## Nazewnictwo\n- camelCase dla zmiennych i funkcji\n- PascalCase dla typow i interfejsow\n- UPPER_SNAKE_CASE dla stalych\n\n## Typy\n- Preferuj `interface` nad `type` dla obiektow\n- Uzywaj `unknown` zamiast `any`\n- Uzywaj strict mode\n\n## Eksport\n- Named exports zamiast default\n- Barrel exports w index.ts',
      role: 'frontend-dev',
    },
    {
      name: 'Docker Compose Helper',
      category: 'devops',
      tags: ['docker', 'compose', 'containers'],
      content: '# Docker Compose Helper\n\nPomagaj w tworzeniu i debugowaniu plikow docker-compose.\n\n## Zasady\n- Uzywaj version 3.8+\n- Zawsze definiuj healthchecks\n- Uzywaj named volumes\n- Unikaj bind mounts w produkcji\n- Definiuj networks jawnie',
      role: 'devops',
    },
    {
      name: 'Test Best Practices',
      category: 'testing',
      tags: ['testing', 'jest', 'vitest'],
      content: '# Test Best Practices\n\n## Zasady\n- Testuj zachowanie, nie implementacje\n- Jeden assert per test (gdy mozliwe)\n- Uzywaj opisowych nazw testow\n- Arrange-Act-Assert pattern\n- Mockuj zewnetrzne zaleznosci, nie wewnetrzne modul',
      role: 'testing',
    },
  ];

  for (const s of skillsData) {
    let skill = await Skill.findOne({ name: s.name });
    if (!skill) {
      skill = new Skill({
        name: s.name,
        category: s.category,
        tags: s.tags,
        currentVersion: 1,
        createdBy: admin._id,
      });
      await skill.save();

      await SkillVersion.create({
        skillId: skill._id,
        version: 1,
        content: s.content,
        changelog: 'Wersja poczatkowa',
        createdBy: admin._id,
      });

      // Przypisz skill do roli
      const role = roles[s.role];
      if (role) {
        role.skills.push(skill._id);
        await role.save();
      }

      console.log(`Skill utworzony: ${s.name} -> rola: ${s.role}`);
    }
  }

  console.log('\nSeed zakonczony pomyslnie!');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Blad seed:', err);
  process.exit(1);
});
