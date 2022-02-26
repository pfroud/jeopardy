// https://www.chartjs.org/docs/latest/getting-started/integration.html#bundlers-webpack-rollup-etc
import Chart from 'chart.js/auto';

import ChartDataLabels from 'chartjs-plugin-datalabels';

document.addEventListener("DOMContentLoaded", function () {


    const canvas = document.querySelector<HTMLCanvasElement>("canvas#chartjs_test");

    const ctx = canvas.getContext("2d");

    Chart.defaults.animation = false;
    Chart.defaults.hover.mode = null;
    Chart.overrides.doughnut.plugins.tooltip.enabled = false;
    Chart.overrides.doughnut.plugins.legend.display = false;
    Chart.register(ChartDataLabels);
    Chart.defaults.plugins.datalabels = {
        clamp: true,
        anchor: "end",
        //https://chartjs-plugin-datalabels.netlify.app/guide/formatting.html#custom-labels
        formatter: function (value, context) {
            return context.chart.data.labels[context.dataIndex];
        }
    };

    // https://www.chartjs.org/docs/latest/charts/doughnut.html
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [1, 3, 5]
            }],
            labels: ["Did not buzz",
                "Buzzed then answered right",
                "Buzzed then answered wrong or timed out"]
        }
    });

});