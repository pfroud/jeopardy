import * as Chartist from "chartist";
import { createSvgElement, querySelectorAndCheck, downloadSVG } from "../commonFunctions";
import { Team } from "../Team";

/**
 * Create a line chart where the X axis is question number, the Y axis is money, and there's a series for each team.
 * */
export function createGameEndLineChartOfMoneyOverTime(divForLineChart: HTMLDivElement, teams: Team[], isInOperatorWindow = false): void {

    // Convert team statistics to Chartist data series
    const allDataSeries: Chartist.SeriesObject<Chartist.Multi>[] =
        teams.map((teamObj, teamIndex) => ({
            className: `team-${teamIndex + 1}`,
            data: teamObj.moneyAtEndOfEachRound.map(
                (dollars, index) => ({ x: index, y: dollars })
            )
        }));

    // Add a horizontal line at $0 if any values go negative
    if (teams.some(team => team.moneyAtEndOfEachRound.some(money => money < 0))) {
        const indexOfMaxQuestion = teams[0].moneyAtEndOfEachRound.length - 1;
        allDataSeries.push({
            className: "horizontal-line-at-zero-dollars",
            data: [
                { x: 0, y: 0 },
                { x: indexOfMaxQuestion, y: 0 }]
        });
    }

    const chartData: Chartist.LineChartData = { series: allDataSeries };

    const chartWidth = 800;
    const chartHeight = 500;

    /*
    Reference for LineChartOptions object:

    interface Options:
    https://github.com/chartist-js/chartist/blob/10679003a8cec24f9c1f559bdd0c241ec02319a4/src/core/types.ts#L28

    interface LineChartOptions:
    https://github.com/chartist-js/chartist/blob/10679003a8cec24f9c1f559bdd0c241ec02319a4/src/charts/LineChart/LineChart.types.ts#L25

    interface AxisOptions:
    https://github.com/chartist-js/chartist/blob/10679003a8cec24f9c1f559bdd0c241ec02319a4/src/core/types.ts#L72
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

        lineChart.detach(); //Remove window resize event listener

        const svgCreatedByChartist = createdEvent.svg.getNode<SVGSVGElement>();

        /*
        Chartist created:
         - Data series with line and points
         - Gridlines
         - Axis labels

        Now we are manually adding:
         - Axis titles
         - Legend
        */

        /*
        We are going to make the SVG bigger to make space for the stuff we're adding.

        Chartist sets the size of the SVG in two ways:
            - width & height attributes, AND
            - style attribute with the width & height set again in inline CSS.
        We are going to change the size of the svg. Remove the style attribute and
        only use the width & height attributes.
        */
        svgCreatedByChartist.removeAttribute("style");

        const extraSpaceLeftForYAxisTitle = 30;
        const extraSpaceBottomForXAxisTitle = 20;
        const extraSpaceRightForLegend = 200;
        svgCreatedByChartist.setAttribute("width", String(chartWidth + extraSpaceLeftForYAxisTitle + extraSpaceRightForLegend));
        svgCreatedByChartist.setAttribute("height", String(chartHeight + extraSpaceBottomForXAxisTitle));

        // Move everything created by Chartist into a new group
        const groupChartistCreated = createSvgElement("g");
        groupChartistCreated.id = "createdByChartist";
        groupChartistCreated.setAttribute("transform", `translate(${extraSpaceLeftForYAxisTitle}, 0)`);
        // The append() function MOVES elements to the destination
        groupChartistCreated.append(...svgCreatedByChartist.children);
        svgCreatedByChartist.append(groupChartistCreated);

        // Add axis titles
        const groupAxisTitles = createSvgElement("g");
        groupAxisTitles.id = "axisTitles";
        // wait this is bogus, chartist did not create the axis titles, we are creating the axis titles!!!!!!!!!!!!!!
        svgCreatedByChartist.append(groupAxisTitles);

        // Add X axis title
        const xAxisTitle = createSvgElement("text");
        xAxisTitle.innerHTML = "Question number";
        xAxisTitle.setAttribute("x", String(extraSpaceLeftForYAxisTitle + (chartWidth / 2)));
        xAxisTitle.setAttribute("y", String(chartHeight));
        xAxisTitle.setAttribute("text-anchor", "middle");
        xAxisTitle.setAttribute("dominant-baseline", "hanging"); //top-align
        xAxisTitle.setAttribute("fill", "black");
        groupAxisTitles.append(xAxisTitle);

        // Add Y axis title
        const yAxisTitle = createSvgElement("text");
        yAxisTitle.innerHTML = "Money";
        // For easy rotation, use transform to do translation instead of x & y attributes
        yAxisTitle.setAttribute("transform", `translate(15, ${chartHeight / 2}) rotate(-90)`);
        yAxisTitle.setAttribute("text-anchor", "middle");
        yAxisTitle.setAttribute("fill", "black");
        groupAxisTitles.append(yAxisTitle);

        // Add legend
        const groupLegend = createSvgElement("g");
        groupLegend.id = "legend";
        groupLegend.setAttribute("dominant-baseline", "middle");
        groupLegend.setAttribute("transform", `translate(${extraSpaceLeftForYAxisTitle + chartWidth + 40}, 20)`);
        svgCreatedByChartist.append(groupLegend); // BOGUS - WE CREATE THE LEGEND, IT WAS NOT CREATED BY CHARTIST!!!!!!!!!

        for (let teamIdx = 0; teamIdx < teams.length; teamIdx++) {

            const groupLegendRow = createSvgElement("g");
            groupLegendRow.setAttribute("id", `legend-row-${teamIdx + 1}`);
            groupLegendRow.setAttribute("transform", `translate(0 ${teamIdx * 50})`);
            groupLegend.append(groupLegendRow);

            /*
            To make the line colors in the legend match the line colors in the 
            chart, we will add the same SVG elements with the same classes in
            the legend, then the CSS rules for the chart will apply to the legend.

            The SVG elements to create are:

                <g class="ct-series">
                    <path class="ct-line"> 
                    <line class="ct"point">
                </g>

            Where:
            - The <path> is the line segments connecting each data point.
            - The <line> is a dot at each point. Yes that is confusing, for
              some reason Chartist makes a dot using a <line> with the start
              & end points in the same place. We just need to duplicate what
              Chartist does.
            */
            const groupChartistSeriesForLegend = createSvgElement("g");
            groupChartistSeriesForLegend.setAttribute("class", `ct-series team-${teamIdx + 1}`);
            groupLegendRow.append(groupChartistSeriesForLegend);

            /*
            Add short horizontal line. This is a <path> not a <line> which is
            confusing because Chartist uses a <line> for the data point.
            */
            const legendLineLength = 50;
            const legendLine = createSvgElement("path");
            legendLine.setAttribute("class", "ct-line");
            legendLine.setAttribute("d", `M0,0 L${legendLineLength},0`); // https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/d#path_commands
            groupChartistSeriesForLegend.append(legendLine);

            /*
            Add dot for data point. For some reason Chartist does this using
            an SVG <line> with the start & end points in the same place. To
            be visible, stroke-linecap must be set to round or square.
            */
            const pointX = String(legendLineLength / 2);
            const legendPoint = createSvgElement("line");
            legendPoint.setAttribute("class", "ct-point");
            legendPoint.setAttribute("x1", pointX);
            legendPoint.setAttribute("x2", pointX);
            legendPoint.setAttribute("y1", "0");
            legendPoint.setAttribute("y2", "0");
            groupChartistSeriesForLegend.append(legendPoint);

            // Add label
            const legendLabel = createSvgElement("text");
            legendLabel.innerHTML = teams[teamIdx].getTeamName();
            legendLabel.setAttribute("x", String(legendLineLength + 10));
            legendLabel.setAttribute("y", "0");
            legendLabel.setAttribute("fill", "black");
            groupLegendRow.append(legendLabel);

        }

        if (isInOperatorWindow) {
            querySelectorAndCheck(document, "button#download-svg-game-end-line-chart")
                .addEventListener("click", () => downloadSVG(svgCreatedByChartist, "game end money over time"));
        }

    });

}