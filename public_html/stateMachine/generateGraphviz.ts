import { StateMachineState, StateMachineTransition, TransitionType } from "./stateInterfaces.js";

export function generateGraphvizImpl(stateArray: StateMachineState[]): void {

    const lines: string[] = [];
    lines.push("digraph jeopardy {");
    lines.push("\tgraph [id=\"jeopardy\"];")
    lines.push("\tnode [shape=\"rect\"];");

    stateArray.forEach((state: StateMachineState) => {

        lines.push(`\t${state.name} [id="${state.name}"];`);

        state.transitions.forEach((transition: StateMachineTransition) => {


            switch (transition.type) {
                case TransitionType.Keyboard: {
                    const keys = transition.keys;
                    var label = "keyboard: ";
                    if (keys === " ") {
                        label += "[space]"
                    } else {
                        label += '\\"' + keys + '\\"';
                    }

                    if (transition.fn) {
                        label += ` / ${transition.fn.name}`;
                    }

                    lines.push(`\t${state.name} -> ${transition.dest} [label="${label}"];`);
                    break;

                }
                case TransitionType.Promise: {
                    var label = transition.type.toString();
                    if (transition.fn) {
                        label += ` / ${transition.fn.name}`;
                    }

                    lines.push(`\t${state.name} -> ${transition.dest} [label="${label}"];`);
                    break;
                }
                case TransitionType.Timeout: {
                    var label: string;
                    if (typeof transition.duration === "number") {
                        label = transition.type.toString() + ": " + (transition.duration / 1000) + "sec";
                    } else {
                        // the timeout is a function which returns a number
                        label = transition.type.toString() + ": " + transition.duration;

                    }
                    if (transition.fn) {
                        label += ` / ${transition.fn.name}`;
                    }

                    lines.push(`\t${state.name} -> ${transition.dest} [label="${label}"];`);
                    break;
                }
                case TransitionType.Manual: {
                    var label = transition.type.toString() + ': \\"' + transition.triggerName.replace("manualTrigger_", "") + '\\"';
                    if (transition.fn) {
                        label += ` / ${transition.fn.name}`;
                    }

                    lines.push(`\t${state.name} -> ${transition.dest} [label="${label}"];`);
                    break;
                }
                case TransitionType.If: {
                    const condition = transition.condition.name;

                    var labelThen = "if(" + condition + ")";
                    if (transition.then.fn) {
                        labelThen += ` / ${transition.then.fn.name}`;
                    }

                    var labelElse = "if(!" + condition + ")";
                    if (transition.else.fn) {
                        labelThen += ` / ${transition.else.fn.name}`;
                    }

                    lines.push(`\t${state.name} -> ${transition.then.dest} [label="${labelThen}"];`);
                    lines.push(`\t${state.name} -> ${transition.else.dest} [label="${labelElse}"];`);
                    break;
                }
                default:
                    console.error("unknown transition type!");
                    break;
            }

        });
        lines.push(""); // empty string becomes one newline because the whole array gets joines wih t\n

    });
    lines.push("}");

    const joined = lines.join("\n");

    // max length of string allowed in window.prompt is 2053 so I'm going to open a new window
    const gvDocument = window.open("", "generatedGraphviz", "popup").document;
    gvDocument.title = "Generated DOT for Graphviz";

    const pre = gvDocument.createElement("pre");
    pre.innerText = joined;
    gvDocument.body.appendChild(pre);


}
