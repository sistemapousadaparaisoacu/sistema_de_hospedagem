import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import { getDefaultOptions } from './chartConfig';

const RevenueDoughnutChart = ({ title = 'Receita por Canal', labels, values }) => {
  const chartLabels = labels || ['Direto', 'OTAs', 'Corporativo', 'Agências'];
  const dataValues = values || [45, 30, 15, 10];

  const styles = getComputedStyle(document.documentElement);
  const brandSecondary = (styles.getPropertyValue('--brand-secondary') || '#C44536').trim();
  const brandTertiary = (styles.getPropertyValue('--brand-tertiary') || '#E1B382').trim();
  const brandPrimary = (styles.getPropertyValue('--brand-primary') || '#5C4033').trim();
  const warning = (styles.getPropertyValue('--warning') || '#F4A259').trim();
  const data = {
    labels: chartLabels,
    datasets: [
      {
        label: 'Participação (%)',
        data: dataValues,
        backgroundColor: [brandSecondary, brandTertiary, brandPrimary, warning],
        borderColor: brandPrimary,
        borderWidth: 1,
      },
    ],
  };

  const opts = {
    ...getDefaultOptions(),
    plugins: {
      ...getDefaultOptions().plugins,
      legend: { position: 'bottom', labels: { color: getComputedStyle(document.documentElement).getPropertyValue('--surface-text').trim() || '#2E2E2E' } },
    },
  };

  return (
    <div style={{ height: 'min(22vh, 180px)' }}>
      <Doughnut options={opts} data={data} />
    </div>
  );
};

export default RevenueDoughnutChart;