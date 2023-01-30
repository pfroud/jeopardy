import { Clue } from "../Clue";
import { select, Selection, BaseType } from "d3-selection";
import { scaleLinear } from "d3-scale";
import { axisBottom } from "d3-axis";
import { zoom, D3ZoomEvent } from "d3-zoom";

export interface BuzzHistoryForClue {

    clue: Clue;
    records: BuzzHistoryRecord[][];
    timestampWhenClueQuestionFinishedReading: number;
    lockoutDurationMillisec: number
}

interface BuzzHistoryRecord {
    timestamp: number;
    teamNumber: number;
    result: BuzzResult;
    source?: string;
}

type BuzzResult = BuzzResultTooEarly | BuzzResultTooLate | BuzzResultStartAnswer | BuzzResultIgnored

interface BuzzResultTooEarly {
    type: "too-early";
}
interface BuzzResultTooLate {
    type: "too-late";
}
interface BuzzResultStartAnswer {
    type: "start-answering";
    answeredCorrectly: boolean;
    endTimestamp: number;
}

interface BuzzResultIgnored {
    type: "ignore";
    reason: string;
}

export function createDiagram(_svg_: SVGSVGElement, history: BuzzHistoryForClue): void {
    const svgWidth = 800;
    const svgHeight = 600;
    const margin = {
        top: 20,
        left: 20,
        right: 20,
        bottom: 20
    };

    const contentWidth = svgWidth - margin.left - margin.right;
    const contentHeight = svgHeight - margin.top - margin.bottom;

    const spaceBeforeMillisec = 2_000;
    const spaceAfterMillisec = 3_000;
    const timestampDoneReading = history.timestampWhenClueQuestionFinishedReading;

    const rowHeight = 50;
    const dotRadius = 5;
    const barHeight = dotRadius * 2;

    const svg = select(_svg_)
        .attr("width", svgWidth)
        .attr("height", svgHeight);

    // purpose of the content group is to move stuff in from the margins
    const groupContent = svg.append("g")
        .attr("id", "content")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const groupAxis = svg.append("g")
        .attr("id", "axis")
        .attr("transform", `translate(${margin.left}, ${contentHeight})`);

    const initialScale = scaleLinear()
        .domain([timestampDoneReading - spaceBeforeMillisec, timestampDoneReading + spaceAfterMillisec])
        .range([0, contentWidth]);

    let zoomedScale = initialScale;

    const axis = axisBottom<number>(zoomedScale)
        .ticks(4)
        .tickSizeOuter(0)
        .tickFormat(n => (n - timestampDoneReading) + "ms")
        // .tickValues([-100, 0, 100, 200, 300].map(n => timestampDoneReading + n))
        ;

    groupAxis.call(axis);

    ///////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////// Pan & zoom //////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////

    function handleZoom(zoomEvent: D3ZoomEvent<SVGSVGElement, unknown>) {
        // console.log(zoomEvent.transform.toString());

        // groupContent.attr("transform",`translate(${margin.left + zoomEvent.transform.x}, ${margin.top}) scale(${zoomEvent.transform.k} 1)`);

        zoomedScale = zoomEvent.transform.rescaleX(initialScale);

        // pass the updated scale to the axis
        axis.scale(zoomedScale);

        // draw the updated axis
        groupAxis.call(axis);

        update();

    }

    // https://www.d3indepth.com/zoom-and-pan/
    // https://observablehq.com/@d3/pan-zoom-axes
    const zoomController = zoom<SVGSVGElement, unknown>()
        .on("zoom", handleZoom)
        ;

    svg.call(zoomController);

    ///////////////////////////////////////////////////////////////////////////////////
    /////////////////////////// Draw the buzz history records /////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////

    const rowsGroup = groupContent.append("g")
        .attr("id", "rows");

    const rowsArray: Selection<SVGGElement, unknown, null, undefined>[] = [];

    for (let teamindex = 0; teamindex < 8; teamindex++) {
        const group = rowsArray[teamindex] = rowsGroup.append("g")
            .attr("id", `team-index-${teamindex}`)
            .attr("transform", `translate(0, ${rowHeight * teamindex})`);

        // shaded background for alternate teams
        if (teamindex % 2 == 0) {
            group.append("rect")
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", contentWidth)
                .attr("height", rowHeight)
                .attr("fill", "#eee");
        }

        // horizontal lines to separate teams
        group.append("line")
            .attr("x1", 0)
            .attr("y1", rowHeight)
            .attr("x2", contentWidth)
            .attr("y2", rowHeight)
            .attr("stroke", "black")
            .attr("stroke-width", 1)
            ;

        // team name
        group.append("text")
            .attr("x", "10")
            .attr("y", rowHeight / 2)
            .attr("dominant-baseline", "middle")
            .text(`Team ${teamindex + 1}`);

    }

    // vertical line which shows when the operator pressed space
    const verticalLine = groupContent.append("line")
        .attr("id", "operator-finished-reading-question")
        .attr("x1", zoomedScale(timestampDoneReading))
        .attr("y1", 0)
        .attr("x2", zoomedScale(timestampDoneReading))
        .attr("y2", contentHeight)
        .attr("stroke", "black")
        .attr("stroke-width", 1);

    const yForBars = (rowHeight / 2) - (barHeight / 2);

    function update() {

        verticalLine
            .attr("x1", zoomedScale(timestampDoneReading))
            .attr("x2", zoomedScale(timestampDoneReading))

        history.records.forEach((recordsForTeam, teamIndex) => {

            const groupForTeam = rowsArray[teamIndex];

            /*
            https://www.d3indepth.com/datajoins/
            https://observablehq.com/@d3/selection-join
            */

            groupForTeam
                .selectAll("rect.too-early")
                .data(recordsForTeam.filter(r => r.result.type === "too-early"))
                .join("rect")
                .classed("too-early", true)
                .attr("x", d => zoomedScale(d.timestamp))
                .attr("y", yForBars)
                // the value I am giving to the scale is a duration
                .attr("width", zoomedScale(history.lockoutDurationMillisec) - zoomedScale(0))
                .attr("height", barHeight)
                .attr("fill", "red")
                .attr("stroke", "black")
                .attr("stroke-width", 1);


            groupForTeam
                .selectAll("rect.start-answering")
                .data(recordsForTeam.filter(r => r.result.type === "start-answering"))
                .join("rect")
                .classed("start-answering", true)
                .attr("x", d => zoomedScale(d.timestamp))
                .attr("y", yForBars)
                .attr("width", d =>
                    zoomedScale((d.result as BuzzResultStartAnswer).endTimestamp) -
                    zoomedScale(d.timestamp)
                )
                .attr("height", barHeight)
                .attr("fill", "lightblue")
                .attr("stroke", "black")
                .attr("stroke-width", 1);

            groupForTeam
                .selectAll("circle.buzzer-press")
                .data(recordsForTeam)
                .join("circle")
                .classed("buzzer-press", true)
                .attr("cx", d => zoomedScale(d.timestamp))
                .attr("cy", rowHeight / 2)
                .attr("r", dotRadius)
                .attr("fill", "black")
                .attr("stroke-width", 0);
            ;


        });
    }

    update();

}