import React from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Filler } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Filler);

const MiniLineChart = ({ labels = [], values = [], color }) => {
  const styles = getComputedStyle(document.documentElement);
  const brandSecondary = (styles.getPropertyValue('--brand-secondary') || '#C44536').trim();
  const brandTertiary = (styles.getPropertyValue('--brand-tertiary') || '#E1B382').trim();
  const strokeColor = color || brandSecondary;
  const data = {
    labels: labels.length ? labels : Array.from({ length: values.length || 7 }, (_, i) => i + 1),
    datasets: [
      {
        data: values.length ? values : [10, 12, 8, 14, 16, 15, 13],
        borderColor: strokeColor,
        backgroundColor: 'rgba(225,179,130,0.25)',
        fill: true,
        tension: 0.35,
        pointRadius: 0,
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
    scales: {
      x: { display: false },
      y: { display: false },
    },
  };

  return <div style={{ height: 'min(12vh, 90px)' }}><Line data={data} options={options} /></div>;
};

export default MiniLineChart;