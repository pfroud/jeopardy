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
    containerSvg.setAttribute("id", "pieChartsContainer");
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
        Chartist will create a new <svg> in the specified container. There's no way to tell Chartist to
        use an existing SVG. If we re-use a container, Chartist will delete the contents of the old chart
        and make a new one.

        So we need to create a new temporary container for each pie chart. No need to add the temporary
        container to the document. Then move each svg created by Chartist into a single container svg
        (so I can download it to a single file and add it to readme.me), then delete the temporary container.
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

    // Convert team stats into Chartist data series
    const allDataSeries: Chartist.SeriesObject<Chartist.Multi>[] =
        teams.map((teamObj, teamIndex) => ({
            className: `team-${teamIndex + 1}`,
            data: teamObj.getStatistics().moneyAtEndOfEachRound.map(
                (dollars, index) => ({ x: index, y: dollars })
            )
        }));


    // Add a horizontal line at $0 if any values go negative
    if (teams.some(team => team.getStatistics().moneyAtEndOfEachRound.some(money => money < 0))) {
        const indexOfMaxQuestionNumber = teams[0].getStatistics().moneyAtEndOfEachRound.length - 1;
        allDataSeries.push({
            className: "horizontal-line-at-zero-dollars",
            data: [
                { x: 0, y: 0 },
                { x: indexOfMaxQuestionNumber, y: 0 }]
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
        const extraSpaceLeftForYAxisTitle = 30;
        const extraSpaceBottomForXAxisTitle = 20;
        const extraSpaceRightForLegend = 200;

        /*
        On the <svg>, Chartist sets the width & height attributes AND sets the style
        attribute with the width & height set again in inline CSS.
        We are going to change the size of the svg. Remove the style attribute and
        only use the width & height attributes.
        */
        svgCreatedByChartist.removeAttribute("style");

        // Make SVG bigger to fit the stuff we are adding
        svgCreatedByChartist.setAttribute("width", String(chartWidth + extraSpaceLeftForYAxisTitle + extraSpaceRightForLegend));
        svgCreatedByChartist.setAttribute("height", String(chartHeight + extraSpaceBottomForXAxisTitle));

        // Move everything created by Chartist into a new group
        const groupChartistCreated = createSvgElement("g");
        groupChartistCreated.setAttribute("id", "createdByChartist");
        groupChartistCreated.setAttribute("transform", `translate(${extraSpaceLeftForYAxisTitle}, 0)`);
        // The append() function MOVES elements to the destination
        groupChartistCreated.append(...svgCreatedByChartist.children);
        svgCreatedByChartist.append(groupChartistCreated);

        // Add axis titles
        const groupAxisTitles = createSvgElement("g");
        groupAxisTitles.setAttribute("id", "axisTitles");
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
        // For easy rotation use transform instead of x & y attributes
        yAxisTitle.setAttribute("transform", `translate(15, ${chartHeight / 2}) rotate(-90)`);
        yAxisTitle.setAttribute("text-anchor", "middle");
        yAxisTitle.setAttribute("fill", "black");
        groupAxisTitles.append(yAxisTitle);

        // Add legend
        const groupLegend = createSvgElement("g");
        groupLegend.setAttribute("id", "legend");
        groupLegend.setAttribute("dominant-baseline", "middle");
        groupLegend.setAttribute("transform", `translate(${extraSpaceLeftForYAxisTitle + chartWidth + 40}, 20)`);
        svgCreatedByChartist.append(groupLegend);

        for (let teamIdx = 0; teamIdx < teams.length; teamIdx++) {

            const groupLegendRow = createSvgElement("g");
            groupLegendRow.setAttribute("id", `legend-row-${teamIdx + 1}`);
            groupLegendRow.setAttribute("transform", `translate(0 ${teamIdx * 50})`);
            groupLegend.append(groupLegendRow);

            /*
            To make the line colors in the legend match the line colors in the 
            chart, we will add the same SVG elements with the same classes in
            the legend, then the CSS rules for the will apply.

            The stuff to create is:

            <g class="ct-series">
                <path class="ct-line"> 
                <line class="ct"point">
            </g>

            The <path> is the line segments connecting each data point.
            The <line> is a dot at each point. Yes that is confusing.
            */
            const groupLegendSeries = createSvgElement("g");
            groupLegendSeries.setAttribute("class", `ct-series team-${teamIdx + 1}`);
            groupLegendRow.append(groupLegendSeries);

            // Add short horizontal line
            const legendLineLength = 50;
            const legendLine = createSvgElement("path");
            legendLine.setAttribute("class", "ct-line");
            legendLine.setAttribute("d", `M0,0 L${legendLineLength},0`); // https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/d#path_commands
            groupLegendSeries.append(legendLine);

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
            groupLegendSeries.append(legendPoint);

            // Add label
            const legendLabel = createSvgElement("text");
            legendLabel.innerHTML = teams[teamIdx].getTeamName();
            legendLabel.setAttribute("x", String(legendLineLength + 10));
            legendLabel.setAttribute("y", "0");
            // dominant-baseline="middle" on the entire legend group
            legendLabel.setAttribute("fill", "black");
            groupLegendRow.append(legendLabel);

        }

        if (isInOperatorWindow) {
            querySelectorAndCheck(document, "button#download-svg-game-end-line-chart")
                .addEventListener("click", () => downloadSVG(svgCreatedByChartist, "game end money over time"));
        }

    });

}