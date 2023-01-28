import * as d3 from "d3";
import { Clue } from "../Clue";

export interface BuzzHistoryForClue {

    clue: Clue;
    /*
    Should I make a separate data structure to keep track of records
    for each team, or should the team number be a field in the record?
    */
    records: BuzzHistoryRecord[];
    timestampWhenClueQuestionFinishedReading: number;
    lockoutDurationMillisec: number
}

export interface BuzzHistoryRecord {
    timestamp: number;
    teamNumber: number;
    result: BuzzResult;
    source?: string;
}

export type BuzzResult = BuzzResultTooEarly | BuzzResultTooLate | BuzzResultStartAnswer | BuzzResultIgnored

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

    const svg = d3.select(_svg_)
        .attr("width", svgWidth)
        .attr("height", svgHeight);

    const groupContent = svg.append("g")
        .attr("id", "content")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const groupAxis = groupContent.append("g")
        .attr("id", "axis")
        .attr("transform", `translate(0, ${contentHeight})`);

    const scale = d3.scaleLinear()
        .domain([timestampDoneReading - spaceBeforeMillisec, timestampDoneReading + spaceAfterMillisec])
        .range([0, contentWidth]);

    const axis = d3.axisBottom<number>(scale)
        .ticks(4)
        .tickSizeOuter(0)
        .tickFormat(n => (n - timestampDoneReading) + "ms")
        ;

    groupAxis.call(axis);

    const rowsGroup = groupContent.append("g")
        .attr("id", "rows");

    const rowsArray: d3.Selection<SVGGElement, unknown, null, undefined>[] = [];


    for (let i = 0; i < 8; i++) {
        const group = rowsArray[i] = rowsGroup.append("g")
            .attr("id", `row-${i}`)
            .attr("transform", `translate(0, ${rowHeight * i})`);

        // shaded background for alternate teams
        if (i % 2 == 0) {
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
            .text(`Team ${i + 1}`);

    }

    // vertical line which shows when the operator pressed space
    groupContent.append("line")
        .attr("id", "operator-finished-reading-question")
        .attr("x1", scale(timestampDoneReading))
        .attr("y1", 0)
        .attr("x2", scale(timestampDoneReading))
        .attr("y2", contentHeight)
        .attr("stroke", "black")
        .attr("stroke-width", 1);

    history.records.forEach(record => {
        const groupForTeam = rowsArray[record.teamNumber];
        const yForBars = (rowHeight / 2) - (barHeight / 2);
        switch (record.result.type) {
            case "too-early":
                // create a red bar
                groupForTeam.append("rect")
                    .attr("x", scale(record.timestamp))
                    .attr("y", yForBars)
                    .attr("width", scale(history.lockoutDurationMillisec) - scale(0))
                    .attr("height", barHeight)
                    .attr("fill", "red")
                    .attr("stroke", "black")
                    .attr("stroke-width", 1);

                break;
            case "start-answering":

                // create a blue bar
                groupForTeam.append("rect")
                    .attr("x", scale(record.timestamp))
                    .attr("y", yForBars)
                    .attr("width", scale(record.result.endTimestamp))
                    .attr("height", barHeight)
                    .attr("fill", "lightblue" /*record.result.answeredCorrectly ? "green" : "orange"*/)
                    .attr("stroke", "black")
                    .attr("stroke-width", 1);

                /*
                // shade the entire area when the team is answering
                groupContent.append("rect")
                    .attr("id", "")
                    .attr("x", scale(record.timestamp))
                    .attr("y", 0)
                    .attr("width", scale(record.result.endTimestamp))
                    .attr("height", contentHeight)
                    .attr("fill", "#0088ff88")
                    .attr("stroke", "black")
                    .attr("stroke-width", 0);
                */

                break;
        }

        // circle which shows every time the buzzer switch went down.
        // a circle is bad because it has a lot of width. 
        groupForTeam.append("circle")
            .attr("cx", scale(record.timestamp))
            .attr("cy", rowHeight / 2)
            .attr("r", dotRadius)
            .attr("fill", "black")
            .attr("stroke-width", 0);


    });


}