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
  Filler,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

const readVar = (name, fallback) => {
  try {
    const styles = getComputedStyle(document.documentElement);
    const val = styles.getPropertyValue(name).trim();
    return val || fallback;
  } catch (e) {
    return fallback;
  }
};

export const getDefaultOptions = () => {
  const labelColor = readVar('--surface-text', '#2E2E2E');
  const gridColor = readVar('--surface-border', 'rgba(0,0,0,0.08)');
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: { color: labelColor },
      },
      title: { display: false },
      tooltip: { mode: 'index', intersect: false },
    },
    scales: {
      x: { ticks: { color: labelColor }, grid: { display: false } },
      y: { ticks: { color: labelColor }, grid: { color: gridColor } },
    },
  };
};