import './style.css';
import * as Plot from '@observablehq/plot';
import * as aq from 'arquero';

function generateSalesData() {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const products = ['Product A', 'Product B', 'Product C', 'Product D'];
  
  const data = [];
  for (let month of months) {
    for (let product of products) {
      data.push({
        month,
        product,
        sales: Math.round(Math.random() * 10000 + 5000),
        units: Math.round(Math.random() * 500 + 100)
      });
    }
  }
  return data;
}

function generateTimeSeriesData() {
  const data = [];
  const startDate = new Date('2024-01-01');
  
  for (let i = 0; i < 365; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    
    data.push({
      date,
      revenue: Math.sin(i / 30) * 5000 + 15000 + Math.random() * 2000,
      customers: Math.cos(i / 45) * 50 + 150 + Math.random() * 20,
      orders: Math.sin(i / 20) * 30 + 100 + Math.random() * 15
    });
  }
  return data;
}

function generateCorrelationData() {
  const metrics = ['Sales', 'Marketing', 'Support', 'Development', 'Operations'];
  const data = [];
  
  for (let i = 0; i < metrics.length; i++) {
    for (let j = 0; j < metrics.length; j++) {
      const correlation = i === j ? 1 : Math.random() * 2 - 1;
      data.push({
        x: metrics[i],
        y: metrics[j],
        value: correlation
      });
    }
  }
  return data;
}

const salesData = generateSalesData();
const timeSeriesData = generateTimeSeriesData();
const correlationData = generateCorrelationData();

const dt = aq.from(salesData);

const salesByMonth = dt
  .groupby('month')
  .rollup({
    totalSales: d => aq.op.sum(d.sales),
    avgUnits: d => aq.op.mean(d.units)
  })
  .orderby('month')
  .objects();

const salesChart = Plot.plot({
  title: "Monthly Sales by Product",
  width: 600,
  height: 400,
  marginBottom: 80,
  color: {
    scheme: "tableau10",
    legend: true
  },
  marks: [
    Plot.barY(salesData, {
      x: "month",
      y: "sales",
      fill: "product",
      title: d => `${d.product}: $${d.sales.toLocaleString()}`
    }),
    Plot.ruleY([0])
  ],
  x: {
    label: "Month",
    tickRotate: -45
  },
  y: {
    label: "Sales ($)",
    grid: true
  }
});

document.querySelector('#sales-chart').appendChild(salesChart);

const distributionChart = Plot.plot({
  title: "Sales Distribution by Product",
  width: 600,
  height: 400,
  marks: [
    Plot.rectY(salesData, Plot.binX({y: "count"}, {
      x: "sales",
      fill: "product",
      thresholds: 20
    })),
    Plot.ruleY([0])
  ],
  x: {
    label: "Sales Amount ($)"
  },
  y: {
    label: "Frequency",
    grid: true
  },
  color: {
    scheme: "spectral",
    legend: true
  }
});

document.querySelector('#distribution-chart').appendChild(distributionChart);

const timeSeriesChart = Plot.plot({
  title: "Revenue Trend Over Time",
  width: 600,
  height: 400,
  marks: [
    Plot.areaY(timeSeriesData, {
      x: "date",
      y: "revenue",
      fill: "steelblue",
      fillOpacity: 0.3
    }),
    Plot.lineY(timeSeriesData, {
      x: "date",
      y: "revenue",
      stroke: "steelblue",
      strokeWidth: 2
    }),
    Plot.dot(timeSeriesData.filter((d, i) => i % 30 === 0), {
      x: "date",
      y: "revenue",
      fill: "steelblue",
      r: 4
    })
  ],
  x: {
    label: "Date",
    type: "time"
  },
  y: {
    label: "Revenue ($)",
    grid: true
  }
});

document.querySelector('#timeseries-chart').appendChild(timeSeriesChart);

const heatmapChart = Plot.plot({
  title: "Department Correlation Matrix",
  width: 600,
  height: 500,
  marginBottom: 80,
  marginLeft: 80,
  color: {
    type: "diverging",
    scheme: "RdBu",
    domain: [-1, 1],
    legend: true,
    label: "Correlation"
  },
  marks: [
    Plot.cell(correlationData, {
      x: "x",
      y: "y",
      fill: "value",
      inset: 0.5
    }),
    Plot.text(correlationData, {
      x: "x",
      y: "y",
      text: d => d.value.toFixed(2),
      fill: d => Math.abs(d.value) > 0.5 ? "white" : "black"
    })
  ],
  x: {
    label: null,
    tickRotate: -45,
    domain: ['Sales', 'Marketing', 'Support', 'Development', 'Operations']
  },
  y: {
    label: null,
    domain: ['Sales', 'Marketing', 'Support', 'Development', 'Operations']
  }
});

document.querySelector('#heatmap-chart').appendChild(heatmapChart);

const summaryStats = dt
  .derive({
    monthNum: d => ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(d.month)
  })
  .groupby('product')
  .rollup({
    'Total Sales': d => aq.op.sum(d.sales),
    'Avg Sales': d => aq.op.mean(d.sales),
    'Max Sales': d => aq.op.max(d.sales),
    'Min Sales': d => aq.op.min(d.sales),
    'Total Units': d => aq.op.sum(d.units)
  })
  .objects();

const tableHtml = `
  <table>
    <thead>
      <tr>
        <th>Product</th>
        <th>Total Sales</th>
        <th>Average Sales</th>
        <th>Max Sales</th>
        <th>Min Sales</th>
        <th>Total Units</th>
      </tr>
    </thead>
    <tbody>
      ${summaryStats.map(row => `
        <tr>
          <td>${row.product}</td>
          <td>$${row['Total Sales'].toLocaleString()}</td>
          <td>$${Math.round(row['Avg Sales']).toLocaleString()}</td>
          <td>$${row['Max Sales'].toLocaleString()}</td>
          <td>$${row['Min Sales'].toLocaleString()}</td>
          <td>${row['Total Units'].toLocaleString()}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
`;

document.querySelector('#stats-table').innerHTML = tableHtml;