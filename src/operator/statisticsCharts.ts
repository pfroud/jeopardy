import * as Chartist from "chartist";
import { Team } from "../Team";
import { Operator } from "./Operator";

export function createPieCharts(divForPieCharts: HTMLDivElement, teams: Team[]): void {

    teams.forEach(teamObj => {
        const chartContainer = document.createElement("div");
        chartContainer.className = "team-pie-chart";
        divForPieCharts.appendChild(chartContainer);

        const chartTitleDiv = document.createElement("div");
        chartTitleDiv.className = "chart-title";
        chartTitleDiv.innerText = teamObj.teamName;
        chartContainer.appendChild(chartTitleDiv);

        const chartData: Chartist.PieChartData = {
            series: []
        };

        const seriesToAdd = [{
            value: teamObj.statistics.questionsNotBuzzed,
            className: "not-buzzed"
        }, {
            value: teamObj.statistics.questionsBuzzedThenAnsweredRight,
            className: "buzzed-then-answered-right"
        }, {
            value: teamObj.statistics.questionsBuzzedThenAnsweredWrongOrTimedOut,
            className: "buzzed-then-answered-wrong-or-timed-out"
        }];

        seriesToAdd.forEach(candidate => { if (candidate.value > 0) chartData.series.push(candidate) });

        if (chartData.series.length == 0) {
            return;
        }

        // https://gionkunz.github.io/chartist-js/api-documentation.html#chartistpie-declaration-defaultoptions
        const chartOptions: Chartist.PieChartOptions = {
            width: "200px",
            height: "200px",
            donut: true,
            donutWidth: "40%",
            //
            /*
            Padding of the chart drawing area to the container element
            and labels as a number or padding object {top: 5, right: 5, bottom: 5, left: 5}
            */
            chartPadding: 0,
            showLabel: true,
            //
            /*
            Label position offset from the standard position which is
            half distance of the radius. This value can be either positive
            or negative. Positive values will position the label away from the center.
            */
            labelOffset: 0,
            //
            /*
            Label direction can be 'neutral', 'explode' or 'implode'.
            The labels anchor will be positioned based on those settings
            as well as the fact if the labels are on the right or left
            side of the center of the chart. Usually explode is useful
            when labels are positioned far away from the center.
            */
            labelDirection: 'neutral',
            //
            /*
            This option can be set to 'inside', 'outside' or 'center'.
            Positioned with 'inside' the labels will be placed on half
            the distance of the radius to the border of the Pie by
            respecting the 'labelOffset'. The 'outside' option will
            place the labels at the border of the pie and 'center'
            will place the labels in the absolute center point of the
            chart. The 'center' option only makes sense in conjunction
            with the 'labelOffset' option.
            */
            labelPosition: "center"
        };

        new Chartist.PieChart(chartContainer, chartData, chartOptions);
    });
}

export function createLineChart(divForLineChart: HTMLDivElement, legendContainer: HTMLDivElement, teams: Team[]): void {

    interface XYPoint {
        x: number;
        y: number;
    }

    interface LineChartSeriesData {
        className: string;
        data: XYPoint[]
    }

    const lineChartDataForAllTeams: LineChartSeriesData[] =
        teams.map(
            (team, index) => ({
                className: `team-${index + 1}`,
                data: team.statistics.moneyAtEndOfEachRound.map(
                    (value, index) => ({ x: index, y: value })
                )
            })
        );


    const chartData: Chartist.LineChartData = {
        series: lineChartDataForAllTeams
    };

    const chartOptions: Chartist.LineChartOptions = {
        axisX: {
            showGrid: false,
            type: Chartist.AutoScaleAxis,
            onlyInteger: true
        },
        axisY: {
            showGrid: true,
            type: Chartist.AutoScaleAxis,
            onlyInteger: true,
            labelInterpolationFnc: value => "$" + value.toLocaleString()
        },
        lineSmooth: false,
        width: "900px",
        height: "500px"

    };

    new Chartist.LineChart(divForLineChart, chartData, chartOptions);

    // create legend
    for (let i = 0; i < teams.length; i++) {

        const legendRow = document.createElement("div");
        legendRow.className = "line-chart-legend-row";

        const svgWidth = 50;
        const svgHeight = 20;
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.classList.add("ct-chart-line");
        svg.setAttribute("width", svgWidth + "px");
        svg.setAttribute("height", svgHeight + "px");
        legendRow.appendChild(svg);

        const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
        group.classList.add("ct-series");
        group.classList.add(`team-${i + 1}`);
        svg.appendChild(group);

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.classList.add("ct-line");
        path.setAttribute("d", `M0,${svgHeight / 2} L${svgWidth},${svgHeight / 2}`);
        group.appendChild(path);

        const point = document.createElementNS("http://www.w3.org/2000/svg", "line");
        point.classList.add("ct-point");
        point.setAttribute("x1", String(svgWidth / 2));
        point.setAttribute("y1", String(svgHeight / 2));
        point.setAttribute("x2", String(svgWidth / 2));
        point.setAttribute("y2", String(svgHeight / 2));
        group.appendChild(point);

        legendRow.append(teams[i].teamName);

        legendContainer.appendChild(legendRow);

    }

}