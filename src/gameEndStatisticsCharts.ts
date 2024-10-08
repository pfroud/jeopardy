import * as Chartist from "chartist";
import { Team } from "./Team";
import { createSvgElement, querySelectorAndCheck } from "./commonFunctions";
import { Operator } from "./operator/Operator";

/**
 * Create a pie chart for each team which shows:
 *  - how many questions they got right
 *  - how many questions they got wrong or timed out after buzzing
 *  - how many questions the did not buzz for
 */
export function createGameEndPieCharts(operator: Operator, divForPieCharts: HTMLDivElement, teams: Team[]): void {

    const questionCount = operator.getQuestionCountForPieCharts();

    teams.forEach(team => {
        const containerForTeamPieChart = document.createElement("div");
        containerForTeamPieChart.className = "team-pie-chart";
        divForPieCharts.appendChild(containerForTeamPieChart);

        const titleDiv = document.createElement("div");
        titleDiv.className = "chart-title";
        titleDiv.innerText = team.getTeamName();
        containerForTeamPieChart.appendChild(titleDiv);

        const chartData: Chartist.PieChartData = {
            series: []
        };

        const teamStats = team.getStatistics();

        const seriesToPotentiallyAdd = [{
            value: teamStats.questionsNotBuzzed,
            className: "not-buzzed"
        }, {
            value: teamStats.questionsBuzzedThenAnsweredRight,
            className: "buzzed-then-answered-right"
        }, {
            value: teamStats.questionsBuzzedThenAnsweredWrongOrTimedOut,
            className: "buzzed-then-answered-wrong-or-timed-out"
        }];
        // only add if non-zero
        seriesToPotentiallyAdd.forEach(candidate => { if (candidate.value > 0) chartData.series.push(candidate); });

        if (chartData.series.length === 0) {
            return;
        }

        /*
        https://gionkunz.github.io/chartist-js/api-documentation.html#chartistpie-declaration-defaultoptions
        You have to find the section called "declaration defaultOptions" and click the "show code" button!!
         */
        const chartOptions: Chartist.PieChartOptions = {
            width: "180px",
            height: "180px",
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

        const pieChart = new Chartist.PieChart(containerForTeamPieChart, chartData, chartOptions);

        /*
        If any of the series is 100% of the pie chart, Chartist puts the label in the center
        of the chart, but we already put our own label for "Team #" in the center. In that 
        case we will manually move the Chartist label.
        */
        const needToManuallyMoveLabel = seriesToPotentiallyAdd.map(obj => obj.value).some(n => n === questionCount);
        if (needToManuallyMoveLabel) {
            pieChart.on("created", () => {
                const svgCreatedByChartist = querySelectorAndCheck<SVGSVGElement>(containerForTeamPieChart, "svg");
                querySelectorAndCheck<SVGTextElement>(svgCreatedByChartist, "text").setAttribute("dy", "20");
            });
        }
    });
}

/** Create a single line chart with a series for each team. */
export function createGameEndLineChartOfMoneyOverTime(divForLineChart: HTMLDivElement, legendContainer: HTMLDivElement, teams: Team[]): void {

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
            (team, teamIndex) => ({
                className: `team-${teamIndex + 1}`,
                data: team.getStatistics().moneyAtEndOfEachRound.map(
                    (dollars, index) => ({ x: index, y: dollars })
                )
            })
        );


    if (teams.some(team => team.getStatistics().moneyAtEndOfEachRound.some(money => money < 0))) {
        // Add a horizontal line at $0.
        const maxIndex = teams[0].getStatistics().moneyAtEndOfEachRound.length - 1;
        const seriesData: LineChartSeriesData = {
            className: "zero",
            data: [{
                x: 0,
                y: 0
            }, {
                x: maxIndex,
                y: 0
            }]
        };
        lineChartDataForAllTeams.push(seriesData);
    }

    const chartData: Chartist.LineChartData = {
        series: lineChartDataForAllTeams
    };

    /*
    https://gionkunz.github.io/chartist-js/api-documentation.html#chartistline-declaration-defaultoptions
    You have to find the section called "declaration defaultOptions" and click the "show code" button!!
    */
    const chartOptions: Chartist.LineChartOptions = {
        axisX: {
            showGrid: false,
            type: Chartist.AutoScaleAxis,
            onlyInteger: true,
            labelInterpolationFnc: n => (n as number) + 1
        },
        axisY: {
            showGrid: true,
            type: Chartist.AutoScaleAxis,
            onlyInteger: true,
            labelInterpolationFnc: value => `$${value.toLocaleString()}`
        },
        lineSmooth: false,
        width: "800px",
        height: "500px"

    };

    new Chartist.LineChart(divForLineChart, chartData, chartOptions);

    /*
     We need to create the legend by hand.
     There is a package called chartist-plugin-legend but 
     plugins are not yet supported in chartist v1 (only v0.x).
     */
    for (let teamIdx = 0; teamIdx < teams.length; teamIdx++) {

        const legendRow = document.createElement("div");
        legendRow.className = "line-chart-legend-row";

        const svgWidth = 50;
        const svgHeight = 20;

        const svg = createSvgElement("svg");
        svg.classList.add("ct-chart-line");
        svg.setAttribute("width", `${svgWidth}px`);
        svg.setAttribute("height", `${svgHeight}px`);
        legendRow.appendChild(svg);

        const svgGroup = createSvgElement("g");
        svgGroup.classList.add("ct-series");
        svgGroup.classList.add(`team-${teamIdx + 1}`);
        svg.appendChild(svgGroup);

        const xCenter = svgWidth / 2;
        const yCenter = svgHeight / 2;

        const svgPath = createSvgElement("path");
        svgPath.classList.add("ct-line");
        svgPath.setAttribute("d", `M0,${yCenter} L${svgWidth},${yCenter}`);
        svgGroup.appendChild(svgPath);

        const point = createSvgElement("line");
        point.classList.add("ct-point");
        point.setAttribute("x1", String(xCenter));
        point.setAttribute("x2", String(xCenter));
        point.setAttribute("y1", String(yCenter));
        point.setAttribute("y2", String(yCenter));
        svgGroup.appendChild(point);

        legendRow.append(teams[teamIdx].getTeamName());

        legendContainer.appendChild(legendRow);

    }

}