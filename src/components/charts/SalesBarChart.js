import React from 'react';
import { Bar } from 'react-chartjs-2';
import { getDefaultOptions } from './chartConfig';

const SalesBarChart = ({ title = 'Vendas da Semana', labels, values }) => {
  const chartLabels = labels || ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  const dataValues = values || [1200, 1550, 980, 1800, 2150, 2400, 1950];

  const styles = getComputedStyle(document.documentElement);
  const brandSecondary = (styles.getPropertyValue('--brand-secondary') || '#C44536').trim();
  const data = {
    labels: chartLabels,
    datasets: [
      {
        label: 'Vendas (R$)',
        data: dataValues,
        backgroundColor: brandSecondary,
        borderColor: brandSecondary,
        borderWidth: 1,
        borderRadius: 6,
      },
    ],
  };

  return (
    <div style={{ height: 'min(24vh, 200px)' }}>
      <Bar options={getDefaultOptions()} data={data} />
    </div>
  );
};

export default SalesBarChart;