import * as Chartist from "chartist";

// https://gionkunz.github.io/chartist-js/examples.html
// https://gionkunz.github.io/chartist-js/api-documentation.html

const data: Chartist.IChartistData = {
    series: [5, 3, 4],
    labels: ["hello", "world", "asdf"]
};

const options: Chartist.IPieChartOptions = {
    width: "100%",
    height: "100%",
    donut: true,
    donutWidth: "50%",
    chartPadding: 0,
    showLabel: true,
    labelPosition: "outside"
};

new Chartist.Pie('.ct-chart',
    data,
    options
);
