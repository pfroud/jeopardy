import { Clue } from "../Clue";
import { select, Selection, BaseType } from "d3-selection";
import { scaleLinear } from "d3-scale";
import { axisBottom } from "d3-axis";
import { zoom, D3ZoomEvent } from "d3-zoom";

export interface BuzzHistoryForClue {
    clue: Clue;
    records: BuzzHistoryRecord[][]; //the first array index is the team index
    timestampWhenClueQuestionFinishedReading: number;
    lockoutDurationMillisec: number
}

interface BuzzHistoryRecord {
    timestamp: number;
    result: BuzzResult;
    source?: string;
}

export type BuzzResult = BuzzResultTooEarly | BuzzResultTooLate | BuzzResultStartAnswer | BuzzResultIgnored;

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

    // Change all the timestamps so time zero is when the operator finished reading the question
    history.records.forEach(arrayOfRecordsForTeam => arrayOfRecordsForTeam.forEach(record => {
        record.timestamp -= history.timestampWhenClueQuestionFinishedReading;
        if (record.result.type == "start-answering") {
            record.result.endTimestamp -= history.timestampWhenClueQuestionFinishedReading;
        }
    }));

    const svg = select(_svg_)
        .attr("width", svgWidth)
        .attr("height", svgHeight);

    // the content group is everything except the axis
    const groupContent = svg.append("g")
        .attr("id", "content")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const groupXAxis = svg.append("g")
        .attr("id", "axis")
        .attr("transform", `translate(${margin.left}, ${contentHeight})`);

    // This scale maps time (in milliseconds) to screen-space pixels
    const initialScale = scaleLinear()
        .domain([-2_000, 3_000]) //time in milliseconds to initially show on the X axis
        .range([0, contentWidth]);

    let zoomedScale = initialScale; //will be changed by the zoom controller

    const axisGenerator = axisBottom<number>(zoomedScale)
        .tickSizeOuter(0)
        .tickFormat(n => n + "ms");

    groupXAxis.call(axisGenerator);

    ///////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////// Pan & zoom //////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////

    /*
    https://www.d3indepth.com/zoom-and-pan/
    https://observablehq.com/@d3/pan-zoom-axes
    https://gist.github.com/jgbos/9752277
    */

    function handleZoom(zoomEvent: D3ZoomEvent<SVGSVGElement, unknown>) {

        zoomedScale = zoomEvent.transform.rescaleX(initialScale);

        // Change the scale which will be used by the axis generator
        axisGenerator.scale(zoomedScale);

        // Re-draw the axis
        groupXAxis.call(axisGenerator);

        // Re-draw the buzz history diagram
        update();
    }

    const zoomController = zoom<SVGSVGElement, unknown>()
        .on("zoom", handleZoom);

    svg.call(zoomController);

    ///////////////////////////////////////////////////////////////////////////////////
    /////////////////////////// Draw the buzz history records /////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////

    const rowHeight = 50;
    const dotRadius = 5;
    const barHeight = dotRadius * 2;

    const rowsGroup = groupContent.append("g")
        .attr("id", "rows");

    const rowsArray: Selection<SVGGElement, unknown, null, undefined>[] = [];

    // Draw team name, horizontal line, and alternating shaded background
    for (let teamIndex = 0; teamIndex < 8; teamIndex++) {

        const group = rowsArray[teamIndex] = rowsGroup.append("g")
            .attr("id", `team-index-${teamIndex}`)
            .attr("transform", `translate(0, ${rowHeight * teamIndex})`);

        // Shaded background for alternate teams
        if (teamIndex % 2 == 0) {
            group.append("rect")
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", contentWidth)
                .attr("height", rowHeight)
                .attr("fill", "#eee");
        }

        // Horizontal lines to separate teams
        group.append("line")
            .attr("x1", 0)
            .attr("y1", rowHeight)
            .attr("x2", contentWidth)
            .attr("y2", rowHeight)
            .attr("stroke", "black")
            .attr("stroke-width", 1);

        // Team name
        group.append("text")
            .attr("x", "10")
            .attr("y", rowHeight / 2)
            .attr("dominant-baseline", "middle")
            .text(`Team ${teamIndex + 1}`);
    }

    // Draw a vertical line to show when the operator pressed space
    const verticalLine = groupContent.append("line")
        .attr("id", "operator-finished-reading-question")
        .attr("y1", 0)
        .attr("y2", contentHeight)
        // x1 and x2 are set in the update() function
        .attr("stroke", "black")
        .attr("stroke-width", 1);

    const yForBars = (rowHeight / 2) - (barHeight / 2);

    function update() {

        // Move the vertical line
        verticalLine
            .attr("x1", zoomedScale(0))
            .attr("x2", zoomedScale(0))

        history.records.forEach((recordsForTeam, teamIndex) => {

            const groupForTeam = rowsArray[teamIndex];

            /*
            https://www.d3indepth.com/datajoins/
            https://observablehq.com/@d3/selection-join
            */

            // Draw bars for buzzes that were too early
            groupForTeam
                .selectAll("rect.too-early")
                .data(recordsForTeam.filter(r => r.result.type === "too-early"))
                .join("rect")
                .classed("too-early", true)
                .attr("x", d => zoomedScale(d.timestamp))
                .attr("y", yForBars)
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
                .attr("width", d => {
                    const result = d.result as BuzzResultStartAnswer;
                    return zoomedScale(result.endTimestamp) - zoomedScale(d.timestamp);
                })
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
        });
    }

    update();

}