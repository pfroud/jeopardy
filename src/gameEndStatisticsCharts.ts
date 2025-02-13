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
export function createGameEndPieChartsOfBuzzResults(operator: Operator, divForPieCharts: HTMLDivElement, teams: Team[]): void {

    const questionCount = operator.getQuestionCountForPieCharts();

    const chartWidth = 180;
    const chartHeight = 180;

    teams.forEach(team => {
        const containerForTeamPieChart = document.createElement("div");
        containerForTeamPieChart.className = "team-pie-chart";
        divForPieCharts.appendChild(containerForTeamPieChart);

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
            width: `${chartWidth}px`,
            height: `${chartHeight}px`,
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

        pieChart.on("created", () => {

            const svgCreatedByChartist = querySelectorAndCheck<SVGSVGElement>(containerForTeamPieChart, "svg");

            const teamNameTextNode = createSvgElement("text");
            teamNameTextNode.innerHTML = team.getTeamName();
            teamNameTextNode.setAttribute("x", String(chartWidth / 2));
            teamNameTextNode.setAttribute("y", String(chartHeight / 2));
            teamNameTextNode.setAttribute("dominant-baseline", "middle");
            teamNameTextNode.setAttribute("text-anchor", "middle");
            teamNameTextNode.setAttribute("class", "team-name");
            svgCreatedByChartist.append(teamNameTextNode);

            /*
            If any of the series is 100% of the pie chart, Chartist puts the label in the center
            of the chart, but we already put our own label for "Team #" in the center. In that 
            case we will manually move the Chartist label.
            */
            const needToManuallyMoveLabel = seriesToPotentiallyAdd.map(obj => obj.value).some(n => n === questionCount);
            if (needToManuallyMoveLabel) {
                querySelectorAndCheck<SVGTextElement>(svgCreatedByChartist, "text").setAttribute("dy", "20");
            }
        });


    });
}

/** Create a single line chart with a series for each team. */
export function createGameEndLineChartOfMoneyOverTime(divForLineChart: HTMLDivElement, teams: Team[]): void {

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
            className: "horizontal-line-at-zero-dollars",
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

    const chartWidth = 800;
    const chartHeight = 500;

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
        width: `${chartWidth}px`,
        height: `${chartHeight}px`

    };

    const lineChart = new Chartist.LineChart(divForLineChart, chartData, chartOptions);

    lineChart.on("created", () => {
        /*
        Chartist creates:
         - grid lines
         - data series with line and points
         - axis labels

        I am manually adding:
         - axis titles
         - legend
        */
        const svgCreatedByChartist = querySelectorAndCheck<SVGSVGElement>(divForLineChart, "svg");

        const marginLeft = 30; // add space on the left for the Y axis title
        const marginBottom = 20; // add space on the bottom for X axis title
        const marginRight = 200; // add space on the right for the legend

        /*
        On the <svg>, chartist sets the width and height attributes AND sets the style attribute
        with the width and height again in inline CSS.
        I am going to remove the style attribute and only use the width and height attributes.
        */
        svgCreatedByChartist.setAttribute("style", "");

        // Increase SVG size to make room for the stuff we are adding
        svgCreatedByChartist.setAttribute("width", String(chartWidth + marginLeft + marginRight));
        svgCreatedByChartist.setAttribute("height", String(chartHeight + marginBottom));

        // Move everything created by Chartist into a new group
        const groupChartistCreated = createSvgElement("g");
        groupChartistCreated.setAttribute("id", "createdByChartist");
        groupChartistCreated.setAttribute("transform", `translate(${marginLeft}, 0)`); //move it to the right to make room for Y axis title
        groupChartistCreated.append(...svgCreatedByChartist.children); //the append() function moves nodes
        svgCreatedByChartist.append(groupChartistCreated);

        // Add axis titles
        const groupAxisTitles = createSvgElement("g");
        groupAxisTitles.setAttribute("id", "axisTitles");
        svgCreatedByChartist.append(groupAxisTitles);

        // Add Y axis title
        const yAxisTitle = createSvgElement("text");
        yAxisTitle.innerHTML = "Money";
        yAxisTitle.setAttribute("transform", `translate(15, ${chartHeight / 2}) rotate(-90)`);
        yAxisTitle.setAttribute("text-anchor", "middle");
        yAxisTitle.setAttribute("fill", "black");
        groupAxisTitles.append(yAxisTitle);

        // Add X axis title
        const xAxisTitle = createSvgElement("text");
        xAxisTitle.innerHTML = "Question number";
        xAxisTitle.setAttribute("x", String(marginLeft + (chartWidth / 2)));
        xAxisTitle.setAttribute("y", String(chartHeight));
        xAxisTitle.setAttribute("text-anchor", "middle");
        xAxisTitle.setAttribute("dominant-baseline", "hanging"); // top-align
        xAxisTitle.setAttribute("fill", "black");
        groupAxisTitles.append(xAxisTitle);

        // Add legend
        const groupLegend = createSvgElement("g");
        groupLegend.setAttribute("id", "legend");
        groupLegend.setAttribute("transform", `translate(${marginLeft + chartWidth + 40}, 20)`);
        svgCreatedByChartist.append(groupLegend);

        const legendLineWidth = 50;

        for (let teamIdx = 0; teamIdx < teams.length; teamIdx++) {

            // Container for the series and text
            const groupLegendRow = createSvgElement("g");
            groupLegendRow.setAttribute("class", `legend-row-${teamIdx + 1}`);
            groupLegend.appendChild(groupLegendRow);

            // Create an actual data series inside the legend
            const groupLegendSeries = createSvgElement("g");
            // Apply the same classes Chartist uses in the chart to get same colors set in CSS
            groupLegendSeries.setAttribute("class", `ct-series team-${teamIdx + 1}`);
            groupLegendRow.appendChild(groupLegendSeries);

            const y = teamIdx * 50;

            const legendLine = createSvgElement("path");
            legendLine.classList.add("ct-line");
            legendLine.setAttribute("d", `M0,${y} L${legendLineWidth},${y}`);
            groupLegendSeries.append(legendLine);

            // For some reason Chartist uses an SVG <line> for the points
            const legendPoint = createSvgElement("line");
            legendPoint.classList.add("ct-point");
            legendPoint.setAttribute("x1", String(legendLineWidth / 2));
            legendPoint.setAttribute("x2", String(legendLineWidth / 2));
            legendPoint.setAttribute("y1", String(y));
            legendPoint.setAttribute("y2", String(y));
            groupLegendSeries.append(legendPoint);

            const legendLabel = createSvgElement("text");
            legendLabel.innerHTML = teams[teamIdx].getTeamName();
            legendLabel.setAttribute("dominant-baseline", "middle");
            legendLabel.setAttribute("x", String(legendLineWidth + 10));
            legendLabel.setAttribute("y", String(y));
            xAxisTitle.setAttribute("fill", "black");
            groupLegendRow.append(legendLabel);

        }

    });

}