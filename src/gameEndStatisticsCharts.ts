import * as Chartist from "chartist";
import { Team } from "./Team";
import { createSvgElement, downloadSVG, querySelectorAndCheck } from "./commonFunctions";
import { Operator } from "./operator/Operator";

/**
 * Create a pie chart for each team which shows:
 *  - how many questions they got right
 *  - how many questions they got wrong or timed out after buzzing
 *  - how many questions the did not buzz for
 */
export function createGameEndPieChartsOfBuzzResults(operator: Operator, divForPieCharts: HTMLDivElement, teams: Team[], isInOperatorWindow = false): void {

    const questionCount = operator.getQuestionCountForPieCharts();

    // Size of a single pie chart
    const chartWidth = 180;
    const chartHeight = 180;

    /*
    We will use Chartist to generate a pie chart for each team. Chartist creates
    an SVG for each chart, then I will move each pie chart into a single container
    SVG with a legend. That way I can download it as a single SVG and put into readme.md.
    The pie charts will go in a 2x4 grid at the top, and the legend will go below that.
    */

    const chartGridColumnCount = 4;
    const chartGridSpacing = 30;
    const chartGridHeight = Math.ceil(teams.length / chartGridColumnCount) * (chartHeight + chartGridSpacing);

    const legendRows = [
        { color: "gray", text: "Not buzzed" },
        { color: "green", text: "Buzzed then answered right" },
        { color: "red", text: "Buzzed then answered wrong or timed out" }
    ];
    const legendColorSwatchSize = 25;
    const legendRowSpacing = 10;
    const legendHeight = legendRows.length * (legendColorSwatchSize + legendRowSpacing);

    const containerSvg = createSvgElement("svg");
    containerSvg.setAttribute("id", "pie-charts-container");
    containerSvg.setAttribute("class", "ct-chart-donut");
    containerSvg.setAttribute("width", `${chartGridColumnCount * (chartWidth + chartGridSpacing)}`);
    containerSvg.setAttribute("height", `${chartGridHeight + legendHeight}`);
    divForPieCharts.append(containerSvg);

    // Add legend
    const groupLegend = createSvgElement("g");
    groupLegend.setAttribute("id", "legend");
    groupLegend.setAttribute("transform", `translate(0 ${chartGridHeight})`);
    containerSvg.append(groupLegend);
    legendRows.forEach((legendEntry, idx) => {

        const groupLegendRow = createSvgElement("g");
        groupLegendRow.setAttribute("id", `legend-row-${idx + 1}`);
        groupLegendRow.setAttribute("transform", `translate(0 ${idx * (legendColorSwatchSize + legendRowSpacing)})`);
        groupLegend.append(groupLegendRow);

        const colorSwatch = createSvgElement("rect");
        colorSwatch.setAttribute("fill", legendEntry.color);
        colorSwatch.setAttribute("x", "0");
        colorSwatch.setAttribute("y", "0");
        colorSwatch.setAttribute("width", String(legendColorSwatchSize));
        colorSwatch.setAttribute("height", String(legendColorSwatchSize));
        groupLegendRow.append(colorSwatch);

        const textElement = createSvgElement("text");
        textElement.innerHTML = legendEntry.text;
        // CSS sets dominant-baseline: middle
        textElement.setAttribute("x", String(legendColorSwatchSize + 5));
        textElement.setAttribute("y", `${legendColorSwatchSize / 2}`);
        groupLegendRow.append(textElement);

    });

    // Create pie charts using Chartist
    teams.forEach((team, teamIndex) => {

        /*
        // need to give each pie chart its own container otherwise chartist re-uses the svg
        Chartist will create an <svg> in a container, there's no way to tell it to use an existing SVG.
        If we re-use a container, Chartist will delete the contents of the old chart and make a new one.
        So we will need to create a container for each pie chart. But don't actually add it to the document.
        THen I am moving the svgs into a single svg, so then we can delete the containers.
        */
        const temporaryContainer = document.createElement("div");

        // Set up data series
        const teamStats = team.getStatistics();
        const allDataSeries: Chartist.FlatSeriesObjectValue<number>[] =
            [
                {
                    value: teamStats.questionsNotBuzzed,
                    className: "not-buzzed"
                }, {
                    value: teamStats.questionsBuzzedThenAnsweredRight,
                    className: "buzzed-then-answered-right"
                }, {
                    value: teamStats.questionsBuzzedThenAnsweredWrongOrTimedOut,
                    className: "buzzed-then-answered-wrong-or-timed-out"
                }
            ].filter(series => series.value > 0);

        const chartData: Chartist.PieChartData = { series: allDataSeries };

        /*
        Comments for the PieChartOptions object below are copied from here:

        interface Options:
        https://github.com/chartist-js/chartist/blob/10679003a8cec24f9c1f559bdd0c241ec02319a4/src/core/types.ts#L28

        interface PieChartOptions
        https://github.com/chartist-js/chartist/blob/10679003a8cec24f9c1f559bdd0c241ec02319a4/src/charts/PieChart/PieChart.types.ts#L27
        */
        const chartOptions: Chartist.PieChartOptions = {
            width: `${chartWidth}px`,
            height: `${chartHeight}px`,
            donut: true,
            donutWidth: "40%",
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

        const pieChart = new Chartist.PieChart(temporaryContainer, chartData, chartOptions);

        pieChart.on("created", createdEvent => {

            pieChart.detach(); //Remove window resize event listener

            const svgCreatedByChartist = createdEvent.svg.getNode<SVGSVGElement>();

            /*
            If any series is 100% of the pie chart, Chartist puts the label in the center
            of the donut. But we want put the team name label in center, so in this case we
            will manually move the Chartist label down a little.
            */
            if (allDataSeries.some(obj => obj.value === questionCount)) {
                querySelectorAndCheck(svgCreatedByChartist, "text").setAttribute("dy", "20");
            }

            // Add team name label in the center of the donut
            const teamNameTextElement = createSvgElement("text");
            teamNameTextElement.innerHTML = team.getTeamName();
            teamNameTextElement.setAttribute("x", String(chartWidth / 2));
            teamNameTextElement.setAttribute("y", String(chartHeight / 2));
            teamNameTextElement.setAttribute("dominant-baseline", "middle");
            teamNameTextElement.setAttribute("text-anchor", "middle");
            teamNameTextElement.setAttribute("class", "team-name");
            svgCreatedByChartist.append(teamNameTextElement);

            // Move the svg created by chartist into the big svg created by me so I can download it for readme.md
            const groupInContainerSvg = createSvgElement("g");
            groupInContainerSvg.setAttribute("id", `team-${teamIndex + 1}`);
            groupInContainerSvg.setAttribute("transform",
                // weird inline block comment below to visually line up the % and / operators. need to use floor() to do integer division
                `translate(
                ${(chartWidth + chartGridSpacing) * /*      */ (teamIndex % chartGridColumnCount)}
                ${(chartHeight + chartGridSpacing) * Math.floor(teamIndex / chartGridColumnCount)}
                )`);
            containerSvg.append(groupInContainerSvg);

            // The append() function MOVES elements into the destination
            groupInContainerSvg.append(...svgCreatedByChartist.children);
            // The SVG created by Chartist is now empty.

            temporaryContainer.remove(); //Also removes the svg created by Chartist inside the div

        });


    });


    if (isInOperatorWindow) {
        querySelectorAndCheck(document, "button#download-svg-game-end-pie-chart")
            .addEventListener("click", () => downloadSVG(containerSvg, "game end pie charts"));
    }


}

/** Create a single line chart with a series for each team. */
export function createGameEndLineChartOfMoneyOverTime(divForLineChart: HTMLDivElement, teams: Team[], isInOperatorWindow = false): void {
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


    lineChart.on("created", createdEvent => {

        // Remove window resize event listener
        lineChart.detach();

        /*
        Chartist creates:
         - grid lines
         - data series with line and points
         - axis labels

        I am manually adding:
         - axis titles
         - legend
        */
        const svgCreatedByChartist = createdEvent.svg.getNode<SVGSVGElement>();

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
        groupLegend.setAttribute("dominant-baseline", "middle");
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
            legendLabel.setAttribute("x", String(legendLineWidth + 10));
            legendLabel.setAttribute("y", String(y));
            xAxisTitle.setAttribute("fill", "black");
            groupLegendRow.append(legendLabel);

        }

        if (isInOperatorWindow) {
            querySelectorAndCheck(document, "button#download-svg-game-end-line-chart")
                .addEventListener("click", () => downloadSVG(svgCreatedByChartist, "game end money over time"));
        }

    });

}