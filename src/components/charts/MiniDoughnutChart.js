import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const MiniDoughnutChart = ({ labels = [], values = [] }) => {
  const styles = getComputedStyle(document.documentElement);
  const brandSecondary = (styles.getPropertyValue('--brand-secondary') || '#C44536').trim();
  const brandTertiary = (styles.getPropertyValue('--brand-tertiary') || '#E1B382').trim();
  const brandPrimary = (styles.getPropertyValue('--brand-primary') || '#5C4033').trim();
  const warning = (styles.getPropertyValue('--warning') || '#F4A259').trim();
  const data = {
    labels: labels.length ? labels : ['A', 'B', 'C', 'D'],
    datasets: [
      {
        data: values.length ? values : [40, 30, 20, 10],
        backgroundColor: [brandSecondary, brandTertiary, brandPrimary, warning],
        borderColor: brandPrimary,
        borderWidth: 1,
        cutout: '70%',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { mode: 'index', intersect: false },
    },
  };

  return <div style={{ height: 'min(12vh, 90px)' }}><Doughnut data={data} options={options} /></div>;
};

export default MiniDoughnutChart;