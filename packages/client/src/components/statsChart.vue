<script setup lang="ts">
import { Bar, Line, Doughnut } from 'vue-chartjs';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend);

const props = defineProps<{
  type: 'bar' | 'line' | 'doughnut';
  data: any;
  options?: any;
}>();

const components = { bar: Bar, line: Line, doughnut: Doughnut };
</script>

<template>
  <component :is="components[type]" :data="data" :options="options" />
</template>
