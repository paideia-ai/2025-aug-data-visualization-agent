import React, { useEffect } from 'react'
import * as Plot from '@observablehq/plot'
import * as aq from 'arquero'
import { csv } from 'd3-fetch'
import './ObservableDemo.css'

function ObservableDemo() {
  useEffect(() => {
    async function createCharts() {
      const salesData = aq.table({
        month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        sales: [45000, 52000, 48000, 61000, 59000, 67000],
        profit: [12000, 15000, 13000, 18000, 17000, 21000],
        costs: [33000, 37000, 35000, 43000, 42000, 46000]
      })

      const salesChart = Plot.plot({
        title: "Monthly Sales Trend",
        width: 800,
        height: 400,
        marginLeft: 60,
        marks: [
          Plot.line(salesData.objects(), {x: "month", y: "sales", stroke: "#4a90e2", strokeWidth: 2}),
          Plot.dot(salesData.objects(), {x: "month", y: "sales", fill: "#4a90e2", r: 4}),
          Plot.line(salesData.objects(), {x: "month", y: "profit", stroke: "#50e3c2", strokeWidth: 2}),
          Plot.dot(salesData.objects(), {x: "month", y: "profit", fill: "#50e3c2", r: 4}),
          Plot.ruleY([0]),
        ],
        y: {
          label: "Amount ($)",
          tickFormat: d => `$${d/1000}k`
        }
      })
      
      const salesContainer = document.querySelector("#sales-chart")
      if (salesContainer) {
        salesContainer.innerHTML = ''
        salesContainer.append(salesChart)
      }

      const productData = aq.table({
        product: ['Product A', 'Product B', 'Product C', 'Product D', 'Product E'],
        units: [320, 280, 450, 190, 360]
      })

      const distributionChart = Plot.plot({
        title: "Product Unit Distribution",
        width: 800,
        height: 400,
        marginLeft: 100,
        marks: [
          Plot.barX(productData.objects(), {
            y: "product",
            x: "units",
            fill: "#9b59b6",
            sort: {y: "x", reverse: true}
          }),
          Plot.text(productData.objects(), {
            y: "product",
            x: "units",
            text: d => d.units,
            textAnchor: "start",
            dx: 5
          })
        ],
        x: {
          label: "Units Sold"
        }
      })
      
      const distContainer = document.querySelector("#distribution-chart")
      if (distContainer) {
        distContainer.innerHTML = ''
        distContainer.append(distributionChart)
      }

      const timeData = aq.table({
        date: Array.from({length: 30}, (_, i) => new Date(2024, 0, i + 1)),
        value: Array.from({length: 30}, () => Math.random() * 50 + 25)
      })

      const timeseriesChart = Plot.plot({
        title: "Daily Performance Metrics",
        width: 800,
        height: 400,
        marks: [
          Plot.areaY(timeData.objects(), {
            x: "date",
            y: "value",
            fill: "#3498db",
            fillOpacity: 0.3
          }),
          Plot.line(timeData.objects(), {
            x: "date",
            y: "value",
            stroke: "#2980b9",
            strokeWidth: 2
          })
        ],
        x: {
          type: "time",
          label: "Date"
        },
        y: {
          label: "Performance Score"
        }
      })
      
      const timeContainer = document.querySelector("#timeseries-chart")
      if (timeContainer) {
        timeContainer.innerHTML = ''
        timeContainer.append(timeseriesChart)
      }

      const correlationData = []
      const categories = ['A', 'B', 'C', 'D', 'E']
      for (let x of categories) {
        for (let y of categories) {
          correlationData.push({
            x: x,
            y: y,
            value: x === y ? 1 : Math.random()
          })
        }
      }

      const heatmapChart = Plot.plot({
        title: "Category Correlation Matrix",
        width: 600,
        height: 600,
        marginLeft: 60,
        marginBottom: 60,
        color: {
          scheme: "RdYlBu",
          reverse: true,
          domain: [0, 1]
        },
        marks: [
          Plot.cell(correlationData, {
            x: "x",
            y: "y",
            fill: "value"
          }),
          Plot.text(correlationData, {
            x: "x",
            y: "y",
            text: d => d.value.toFixed(2),
            fill: d => d.value > 0.5 ? "white" : "black"
          })
        ]
      })
      
      const heatContainer = document.querySelector("#heatmap-chart")
      if (heatContainer) {
        heatContainer.innerHTML = ''
        heatContainer.append(heatmapChart)
      }

      const statsSummary = salesData
        .rollup({
          total_sales: aq.op.sum('sales'),
          avg_sales: aq.op.mean('sales'),
          total_profit: aq.op.sum('profit'),
          avg_profit: aq.op.mean('profit'),
          profit_margin: d => aq.op.sum('profit') / aq.op.sum('sales') * 100
        })

      const statsTable = document.querySelector("#stats-table")
      if (statsTable) {
        statsTable.innerHTML = `
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <th style="text-align: left; padding: 10px; border-bottom: 2px solid #ddd;">Metric</th>
              <th style="text-align: right; padding: 10px; border-bottom: 2px solid #ddd;">Value</th>
            </tr>
            ${statsSummary.objects().map(stats => `
              <tr><td style="padding: 10px; border-bottom: 1px solid #eee;">Total Sales</td><td style="text-align: right; padding: 10px; border-bottom: 1px solid #eee;">$${stats.total_sales.toLocaleString()}</td></tr>
              <tr><td style="padding: 10px; border-bottom: 1px solid #eee;">Average Monthly Sales</td><td style="text-align: right; padding: 10px; border-bottom: 1px solid #eee;">$${Math.round(stats.avg_sales).toLocaleString()}</td></tr>
              <tr><td style="padding: 10px; border-bottom: 1px solid #eee;">Total Profit</td><td style="text-align: right; padding: 10px; border-bottom: 1px solid #eee;">$${stats.total_profit.toLocaleString()}</td></tr>
              <tr><td style="padding: 10px; border-bottom: 1px solid #eee;">Average Monthly Profit</td><td style="text-align: right; padding: 10px; border-bottom: 1px solid #eee;">$${Math.round(stats.avg_profit).toLocaleString()}</td></tr>
              <tr><td style="padding: 10px;">Profit Margin</td><td style="text-align: right; padding: 10px;">${stats.profit_margin.toFixed(2)}%</td></tr>
            `).join('')}
          </table>
        `
      }
    }

    createCharts()
  }, [])

  return (
    <div className="observable-demo">
      <header>
        <h1>Data Visualization Demo</h1>
        <p>Built with Observable Plot & Arquero</p>
      </header>
      
      <main>
        <section className="chart-section">
          <h2>Sales Performance Dashboard</h2>
          <div id="sales-chart"></div>
        </section>

        <section className="chart-section">
          <h2>Product Distribution</h2>
          <div id="distribution-chart"></div>
        </section>

        <section className="chart-section">
          <h2>Time Series Analysis</h2>
          <div id="timeseries-chart"></div>
        </section>

        <section className="chart-section">
          <h2>Correlation Matrix</h2>
          <div id="heatmap-chart"></div>
        </section>

        <section className="stats-section">
          <h2>Data Summary</h2>
          <div id="stats-table"></div>
        </section>
      </main>
    </div>
  )
}

export default ObservableDemo