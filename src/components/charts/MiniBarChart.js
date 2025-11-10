import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

const MiniBarChart = ({ labels = [], values = [], color }) => {
  const styles = getComputedStyle(document.documentElement);
  const brandSecondary = (styles.getPropertyValue('--brand-secondary') || '#C44536').trim();
  const strokeColor = color || brandSecondary;
  const data = {
    labels: labels.length ? labels : Array.from({ length: values.length || 5 }, (_, i) => i + 1),
    datasets: [
      {
        data: values.length ? values : [3, 7, 5, 9, 4],
        backgroundColor: strokeColor,
        borderColor: strokeColor,
        borderWidth: 1,
        borderRadius: 6,
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

  return <div style={{ height: 'min(12vh, 90px)' }}><Bar data={data} options={options} /></div>;
};

export default MiniBarChart;