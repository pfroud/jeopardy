import * as d3 from "d3";
import { Clue } from "./operator/Operator";

export interface BuzzHistoryForClue {

    clue: Clue;
    /*
    Should I make a separate data structure to keep track of records
    for each team, or should the team number be a field in the record?
    */
    records: BuzzHistoryRecord[];
    timestampWhenClueQuestionFinishedReading: number;
}

export interface BuzzHistoryRecord {
    timestamp: number;
    teamNumber: number;
    // result: BuzzResult;
    note?: string;
}

export enum BuzzResult {
    TOO_EARLY = "too early",
    TOO_LATE_DO_NOTHING = "too late",
    START_ANSWERING = "start answering"
}

export const exampleBuzzHistory: BuzzHistoryForClue = {
    clue: null,
    records: [
        { timestamp: 1664501695729, teamNumber: 1, note: 'Operator.initBuzzerFootswitchIconDisplay() keydown' },
        { timestamp: 1664501695930, teamNumber: 1, note: 'Operator.initBuzzerFootswitchIconDisplay() keydown' },
        { timestamp: 1664501696039, teamNumber: 1, note: 'Operator.initBuzzerFootswitchIconDisplay() keydown' },
        { timestamp: 1664501696151, teamNumber: 1, note: 'Operator.initBuzzerFootswitchIconDisplay() keydown' },
        { timestamp: 1664501696267, teamNumber: 1, note: 'Operator.initBuzzerFootswitchIconDisplay() keydown' },
        { timestamp: 1664501696375, teamNumber: 1, note: 'Operator.initBuzzerFootswitchIconDisplay() keydown' },
        { timestamp: 1664501696502, teamNumber: 1, note: 'Operator.initBuzzerFootswitchIconDisplay() keydown' },
        { timestamp: 1664501696636, teamNumber: 1, note: 'Operator.initBuzzerFootswitchIconDisplay() keydown' },
        { timestamp: 1664501696778, teamNumber: 1, note: 'Operator.initBuzzerFootswitchIconDisplay() keydown' },
        { timestamp: 1664501696908, teamNumber: 1, note: 'Operator.initBuzzerFootswitchIconDisplay() keydown' },
        { timestamp: 1664501697078, teamNumber: 2, note: 'Operator.initBuzzerFootswitchIconDisplay() keydown' },
        { timestamp: 1664501697079, teamNumber: 2, note: 'Operator.handleBuzzerPress()' },
        { timestamp: 1664501700134, teamNumber: 3, note: 'Operator.initBuzzerFootswitchIconDisplay() keydown' }
    ],
    timestampWhenClueQuestionFinishedReading: 1664501696893
};

export function createDiagram(_svg_: SVGSVGElement, history: BuzzHistoryForClue): void {
    const svgWidth = 800;
    const svgHeight = 600;
    const margin = 20;

    const contentWidth = svgWidth - margin - margin;
    const contentHeight = svgHeight - margin - margin;

    const xAxisSpaceMillisec = 2000;
    const timestampDoneReading = history.timestampWhenClueQuestionFinishedReading;

    const rowHeight = 50;
    const dotRadius = 5;

    const svg = d3.select(_svg_)
        .attr("width", svgWidth)
        .attr("height", svgHeight);

    const groupContent = svg.append("g")
        .attr("id", "content")
        .attr("transform", `translate(${margin}, ${margin})`);

    const groupAxis = groupContent.append("g")
        .attr("id", "axis")
        .attr("transform", `translate(0, ${contentHeight})`);

    const scale = d3.scaleLinear()
        .domain([timestampDoneReading - xAxisSpaceMillisec, timestampDoneReading + xAxisSpaceMillisec])
        .range([0, svgWidth - margin - margin]);

    const axis = d3.axisBottom<number>(scale)
        .ticks(5)
        .tickSizeOuter(0)
        .tickFormat(n => (n - timestampDoneReading) + "ms")
        ;

    groupAxis.call(axis);

    const rowsGroup = groupContent.append("g")
        .attr("id", "rows");

    const rowsArray: d3.Selection<SVGGElement, unknown, null, undefined>[] = [];
    for (let i = 0; i < 5; i++) {
        const group = rowsArray[i] = rowsGroup.append("g")
            .attr("id", `row-${i}`)
            .attr("transform", `translate(0, ${rowHeight * i})`);

        group.append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", contentWidth)
            .attr("height", rowHeight)
            .attr("fill", d3.schemeAccent[i])

        group.append("text")
            .attr("x", "10")
            .attr("y", rowHeight / 2)
            .text("Team " + i);

    }

    groupContent.append("line")
        .attr("x1", scale(timestampDoneReading))
        .attr("y1", 0)
        .attr("x2", scale(timestampDoneReading))
        .attr("y2", contentHeight)
        .attr("stroke", "black")
        .attr("stroke-width", 1);

    history.records.forEach(record => {
        rowsArray[record.teamNumber].append("circle")
            .attr("cx", scale(record.timestamp))
            .attr("cy", rowHeight / 2)
            .attr("r", dotRadius)
            ;

    });


}