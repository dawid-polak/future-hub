import { createRouter, createMemoryHistory } from 'vue-router';

const routes = [
  { path: '/', name: 'splash', component: () => import('../views/splash.vue') },
  { path: '/login', name: 'login', component: () => import('../views/login.vue') },
  { path: '/dashboard', name: 'dashboard', component: () => import('../views/dashboard.vue') },
  { path: '/settings', name: 'settings', component: () => import('../views/settings.vue') },
];

export const router = createRouter({
  history: createMemoryHistory(),
  routes,
});
