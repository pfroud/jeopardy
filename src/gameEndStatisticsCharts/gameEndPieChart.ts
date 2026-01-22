import * as Chartist from "chartist";
import { BuzzerPressResult, BuzzerPressResultStartAnswer } from "../BuzzTimingChart";
import { createSvgElement, downloadSVG, querySelectorAndCheck } from "../commonFunctions";
import { Operator } from "../operator/Operator";
import { Team } from "../Team";

// These are in a string[] because we iterate over it later, which you can't do with only a type
const pieChartSlicesStrings = [
    "notPressedBuzzer",
    "pressedBuzzerButDidNotStartAnswer",
    "pressedBuzzerThenAnsweredRight",
    "pressedBuzzerThenAnsweredWrongOrTimedOut",
    "pressedBuzzerThenAnsweredWrongOrTimedOutThenBuzzedAgainAndAnsweredRight"
] as const;
type PieChartSliceType = typeof pieChartSlicesStrings[number];

type HowManyOfEachPieChartSliceType = { [key in PieChartSliceType]: number };


/**
 * Converts an ARRAY of buzz results to a SINGLE pie chart slice.
 */
function convertBuzzResultsToPieChartSlice(buzzResults: BuzzerPressResult[]): PieChartSliceType {
    if (buzzResults.length === 0) {
        return "notPressedBuzzer";
    }

    const buzzResultsWhichStartedAnswer = buzzResults.filter(
        /*
        Need to use a type predicate aka user-defined type guard for
        Typescript to be able to infer types from the array find() function.
        https://stackoverflow.com/questions/65279417/typescript-narrow-down-type-based-on-class-property-from-filter-find-etc
        https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates
        */
        function (result: BuzzerPressResult): result is BuzzerPressResultStartAnswer {
            return result.TYPE === "start-answer";
        }
    );

    if (buzzResultsWhichStartedAnswer.length === 0) {
        // Never started answer.
        if (buzzResults.every(result => (result.TYPE === "ignored" || result.TYPE === "too-early-start-lockout"))) {
            return "pressedBuzzerButDidNotStartAnswer";
        } else {
            throw new Error(`Unhandled case for this array of buzz results: [${buzzResults.map(result => result.TYPE).join(", ")}]`);
        }

    } else {
        // Started answering at least once.

        // Team can buzz multiple times, so it's possible they answered wrong then buzzed again and answered right.
        const answeredWrongOrTimedOut = buzzResultsWhichStartedAnswer.some(buzzResult => buzzResult.answerResult === "answeredWrongOrTimedOut");
        const answeredRight = buzzResultsWhichStartedAnswer.some(buzzResult => buzzResult.answerResult === "answeredRight");

        // ONLY answered right
        if (answeredRight && !answeredWrongOrTimedOut) {
            return "pressedBuzzerThenAnsweredRight";
        }

        // ONLY answered wrong or timed out
        if (answeredWrongOrTimedOut && !answeredRight) {
            return "pressedBuzzerThenAnsweredWrongOrTimedOut";
        }

        // Answered wrong or timed out at least once, THEN answered right
        if (answeredRight && answeredWrongOrTimedOut) {
            return "pressedBuzzerThenAnsweredWrongOrTimedOutThenBuzzedAgainAndAnsweredRight";
        }

        throw new Error(`Unhandled case for this array of buzz results: [${buzzResults.map(result => result.TYPE).join(", ")}]`);

    }
}


/**
 * Create a pie chart for each team which shows:
 *  - how many questions they got right
 *  - how many questions they got wrong or timed out after buzzing
 *  - how many questions the did not buzz for
 */
export function createGameEndPieChartsOfBuzzResults(operator: Operator, divForPieCharts: HTMLDivElement, teams: Team[], isInOperatorWindow = false): void {

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
    const chartGridSpacing = 30; //spacing between grid elements, both x and y
    // height of the entire grid
    const chartGridHeight = Math.ceil(operator.teamCount / chartGridColumnCount) * (chartHeight + chartGridSpacing);

    const legendRows: { className: PieChartSliceType, label: string }[] = [
        {
            className: "notPressedBuzzer",
            label: "Did not press buzzer"
        },
        {
            className: "pressedBuzzerButDidNotStartAnswer",
            label: "Pressed buzzer but didn't get to answer"
        },
        {
            className: "pressedBuzzerThenAnsweredRight",
            label: "Pressed buzzer then answered right"
        },
        {
            className: "pressedBuzzerThenAnsweredWrongOrTimedOut",
            label: "Pressed buzzer then answered wrong or timed out"
        },
        {
            className: "pressedBuzzerThenAnsweredWrongOrTimedOutThenBuzzedAgainAndAnsweredRight",
            label: "Pressed buzzer, answered wrong or timed out, then pressed buzzer again and answered right"
        }
    ];

    const legendColorSwatchSize = 25;
    const legendRowSpacing = 15;
    const legendHeight = legendRows.length * (legendColorSwatchSize + legendRowSpacing);

    const containerSvg = createSvgElement("svg");
    containerSvg.id = "pieChartsContainer";
    containerSvg.setAttribute("class", "ct-chart-donut");
    containerSvg.setAttribute("width", `${chartGridColumnCount * (chartWidth + chartGridSpacing)}`);
    containerSvg.setAttribute("height", `${chartGridHeight + legendHeight}`);
    divForPieCharts.append(containerSvg);

    /*
    const defs = createSvgElement("defs");

    const linearGradient = createSvgElement("linearGradient");
    linearGradient.id = "stripes";
    linearGradient.setAttribute("spreadMethod", "repeat");
    linearGradient.setAttribute("gradientUnits", "userSpaceOnUse");
    linearGradient.setAttribute("x1", "0");
    linearGradient.setAttribute("y1", "0");
    const stripeSize = 10;
    linearGradient.setAttribute("x2", String(stripeSize));
    linearGradient.setAttribute("y2", String(stripeSize));


    {
        const stop = createSvgElement("stop");
        stop.setAttribute("offset", "0");
        stop.setAttribute("stop-color", "green");
        linearGradient.append(stop);
    }
    {
        const stop = createSvgElement("stop");
        stop.setAttribute("offset", "0.5");
        stop.setAttribute("stop-color", "green");
        linearGradient.append(stop);
    }
    {
        const stop = createSvgElement("stop");
        stop.setAttribute("offset", "0.5");
        stop.setAttribute("stop-color", "red");
        linearGradient.append(stop);
    }
    {
        const stop = createSvgElement("stop");
        stop.setAttribute("offset", "1");
        stop.setAttribute("stop-color", "red");
        linearGradient.append(stop);
    }

    defs.append(linearGradient);
    containerSvg.append(defs);
    */

    ///////////////////////////////////////////////////////////////////////////
    //////////////////////////// Create legend ///////////////////////////
    ///////////////////////////////////////////////////////////////////////////
    const groupLegend = createSvgElement("g");
    groupLegend.id = "legend";
    groupLegend.setAttribute("transform", `translate(0 ${chartGridHeight})`);
    containerSvg.append(groupLegend);


    legendRows.forEach((legendEntry, idx) => {

        const groupLegendRow = createSvgElement("g");
        groupLegendRow.setAttribute("id", `legend-row-${idx + 1}`);
        groupLegendRow.setAttribute("transform", `translate(0 ${idx * (legendColorSwatchSize + legendRowSpacing)})`);
        groupLegend.append(groupLegendRow);

        /*
        To make the line colors in the legend match the line colors in the 
        chart, we will add the same SVG elements with the same classes in
        the legend, then the CSS rules for the chart will apply to the legend.

        The SVG elements to create are:

            <g class="ct-series">
                <path class="ct-slice-donut">
            </g>

        */
        const groupChartistSeriesForLegend = createSvgElement("g");
        groupChartistSeriesForLegend.classList.add("ct-series");
        groupChartistSeriesForLegend.classList.add(legendEntry.className);

        const pathLegendLine = createSvgElement("path");
        pathLegendLine.classList.add("ct-slice-donut");
        const halfwayUp = legendColorSwatchSize / 2;
        pathLegendLine.setAttribute("d",
            // https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/d#path_commands
            `
            M 0                               ,${halfwayUp}
            L ${String(legendColorSwatchSize)},${halfwayUp}
            `
        );
        pathLegendLine.setAttribute("stroke-width", String(legendColorSwatchSize));
        groupChartistSeriesForLegend.append(pathLegendLine);
        groupLegendRow.append(groupChartistSeriesForLegend);

        const textElement = createSvgElement("text");
        textElement.innerHTML = legendEntry.label;
        // CSS sets dominant-baseline: middle
        textElement.setAttribute("x", String(legendColorSwatchSize + 5));
        textElement.setAttribute("y", `${legendColorSwatchSize / 2}`);
        groupLegendRow.append(textElement);

    });

    ////////////////////////////////////////////////////////////////////////////
    ////////////////////// Convert stats to Chartist format ///////////////////
    ////////////////////////////////////////////////////////////////////////////

    /** The index is the team index */
    const destinationAllTeams: HowManyOfEachPieChartSliceType[] = [];
    for (let teamIdx = 0; teamIdx < operator.teamCount; teamIdx++) {
        destinationAllTeams.push({
            notPressedBuzzer: 0,
            pressedBuzzerButDidNotStartAnswer: 0,
            pressedBuzzerThenAnsweredRight: 0,
            pressedBuzzerThenAnsweredWrongOrTimedOut: 0,
            pressedBuzzerThenAnsweredWrongOrTimedOutThenBuzzedAgainAndAnsweredRight: 0
        });
    }

    operator.buzzTiming_forAllTeams_forAllClues_forGameEndPieCharts.forEach(buzzHistoryForOneClue => {
        for (let teamIdx = 0; teamIdx < operator.teamCount; teamIdx++) {
            const recordsForTeam = buzzHistoryForOneClue[teamIdx];
            const mapToResultsOnly = recordsForTeam.map(record => record.RESULT);
            const pieChartSlice = convertBuzzResultsToPieChartSlice(mapToResultsOnly);
            destinationAllTeams[teamIdx][pieChartSlice]++;
        }
    });

    ///////////////////////////////////////////////////////////////////////////
    ///////////////////////////// Create pie charts ////////////////////////////
    ////////////////////////////////////////////////////////////////////////////
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


        // convert our stats format to chartist series object
        const statsForThisTeam = destinationAllTeams[teamIndex];
        const convertedToChartist: Chartist.FlatSeriesObjectValue<number>[] =
            pieChartSlicesStrings.map(
                sliceStr => ({
                    value: statsForThisTeam[sliceStr],
                    className: sliceStr
                })
            )
                .filter(series => series.value > 0);
        const chartData: Chartist.PieChartData = { series: convertedToChartist };

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
            /*
            if (convertedToChartist.some(obj => obj.value === questionCount)) {
                 querySelectorAndCheck(svgCreatedByChartist, "text").setAttribute("dy", "20");
             }
             */

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

            temporaryContainer.remove(); //Also removes the svg created by Chartist, which is now empty, inside the temporaryContainer

        });

    });


    if (isInOperatorWindow) {
        querySelectorAndCheck(document, "button#download-svg-game-end-pie-chart")
            .addEventListener("click", () => downloadSVG(containerSvg, "game end pie charts"));
    }


}
