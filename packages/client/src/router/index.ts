import { createRouter, createWebHistory } from 'vue-router';
import axios from 'axios';

let setupStatus: { configured: boolean; hasAdmin: boolean } | null = null;
let setupCheckPromise: Promise<{ configured: boolean; hasAdmin: boolean }> | null = null;

async function checkSetupStatus(): Promise<{ configured: boolean; hasAdmin: boolean }> {
  // Return cached
  if (setupStatus !== null) return setupStatus;
  // Deduplicate concurrent calls
  if (setupCheckPromise) return setupCheckPromise;

  setupCheckPromise = axios.get('/api/setup/status')
    .then(({ data }) => {
      setupStatus = { configured: data.configured, hasAdmin: data.hasAdmin };
      return setupStatus!;
    })
    .catch(() => {
      // On error, assume configured (don't block navigation)
      return { configured: true, hasAdmin: true };
    })
    .finally(() => {
      setupCheckPromise = null;
    });

  return setupCheckPromise;
}

const routes = [
  {
    path: '/setup',
    name: 'setup',
    component: () => import('../views/setup.vue'),
    meta: { public: true, setup: true },
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/login.vue'),
    meta: { public: true },
  },
  {
    path: '/',
    name: 'dashboard',
    component: () => import('../views/dashboard.vue'),
  },
  {
    path: '/skills',
    name: 'skillList',
    component: () => import('../views/skills/skillList.vue'),
  },
  {
    path: '/skills/new',
    name: 'skillCreate',
    component: () => import('../views/skills/skillEditor.vue'),
  },
  {
    path: '/skills/:id/edit',
    name: 'skillEdit',
    component: () => import('../views/skills/skillEditor.vue'),
  },
  {
    path: '/skills/:id/versions',
    name: 'skillVersions',
    component: () => import('../views/skills/skillVersions.vue'),
  },
  {
    path: '/users',
    name: 'userList',
    component: () => import('../views/users/userList.vue'),
  },
  {
    path: '/users/new',
    name: 'userCreate',
    component: () => import('../views/users/userEdit.vue'),
  },
  {
    path: '/users/:id/edit',
    name: 'userEdit',
    component: () => import('../views/users/userEdit.vue'),
  },
  {
    path: '/roles',
    name: 'roleList',
    component: () => import('../views/roles/roleList.vue'),
  },
  {
    path: '/roles/new',
    name: 'roleCreate',
    component: () => import('../views/roles/roleEdit.vue'),
  },
  {
    path: '/roles/:id/edit',
    name: 'roleEdit',
    component: () => import('../views/roles/roleEdit.vue'),
  },
  {
    path: '/analytics',
    name: 'analytics',
    component: () => import('../views/analytics/analyticsDashboard.vue'),
  },
  {
    path: '/api-docs',
    name: 'apiDocs',
    component: () => import('../views/apiDocs.vue'),
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to, _from, next) => {
  // Allow setup and login pages always
  if (to.meta.setup || to.meta.public) {
    next();
    return;
  }

  // Auth guard first — no token = go to login immediately
  const token = localStorage.getItem('accessToken');
  if (!token) {
    next('/login');
    return;
  }

  // Check setup status only once (cached after first success)
  const status = await checkSetupStatus();
  if (!status.configured || !status.hasAdmin) {
    next('/setup');
    return;
  }

  next();
});

export function resetDbStatus() {
  setupStatus = null;
}
