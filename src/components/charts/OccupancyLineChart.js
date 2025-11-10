import React from 'react';
import { Line } from 'react-chartjs-2';
import { getDefaultOptions } from './chartConfig';

const OccupancyLineChart = ({ title = 'Taxa de Ocupação', labels, values }) => {
  const chartLabels = labels || ['01', '02', '03', '04', '05', '06', '07'];
  const dataValues = values || [62, 68, 71, 65, 73, 78, 75];

  const styles = getComputedStyle(document.documentElement);
  const brandSecondary = (styles.getPropertyValue('--brand-secondary') || '#C44536').trim();
  const brandTertiary = (styles.getPropertyValue('--brand-tertiary') || '#E1B382').trim();
  const data = {
    labels: chartLabels,
    datasets: [
      {
        label: 'Ocupação (%)',
        data: dataValues,
        fill: true,
        backgroundColor: 'rgba(225, 179, 130, 0.25)',
        borderColor: brandSecondary,
        tension: 0.35,
        pointRadius: 3,
        pointBackgroundColor: brandSecondary,
      },
    ],
  };

  const opts = {
    ...getDefaultOptions(),
    scales: {
      ...getDefaultOptions().scales,
      y: { ...getDefaultOptions().scales.y, ticks: { ...getDefaultOptions().scales.y.ticks, callback: (v) => `${v}%` } },
    },
  };

  return (
    <div style={{ height: 'min(24vh, 200px)' }}>
      <Line options={opts} data={data} />
    </div>
  );
};

export default OccupancyLineChart;