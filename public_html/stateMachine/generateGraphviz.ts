import { StateMachineState, StateMachineTransition, TransitionType } from "./stateInterfaces.js";

export function generateGraphvizImpl(stateArray: StateMachineState[]) {

    const lines: string[] = ["digraph jeopardy{\n"];

    stateArray.forEach((state: StateMachineState) => {

        state.transitions.forEach((transition: StateMachineTransition) => {


            switch (transition.type) {
                case TransitionType.Keyboard:
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

                    lines.push(`${state.name} -> ${transition.dest} [label="${label}"];`);
                    break;


                case TransitionType.Promise:
                case TransitionType.Immediate:
                    var label = transition.type.toString();
                    if (transition.fn) {
                        label += ` / ${transition.fn.name}`;
                    }

                    lines.push(`${state.name} -> ${transition.dest} [label="${label}"];`);
                    break;

                case TransitionType.Timeout:
                    var label: string;
                    if (typeof transition.duration === "number") {
                        label = transition.type.toString() + ": " + (transition.duration / 1000) + "sec";
                    } else {
                        label = transition.type.toString() + ": " + transition.duration;

                    }
                    if (transition.fn) {
                        label += ` / ${transition.fn.name}`;
                    }

                    lines.push(`${state.name} -> ${transition.dest} [label="${label}"];`);
                    break;


                case TransitionType.Manual:
                    var label = transition.type.toString() + ': \\"' + transition.triggerName.replace("manualTrigger_","") + '\\"';
                    if (transition.fn) {
                        label += ` / ${transition.fn.name}`;
                    }

                    lines.push(`${state.name} -> ${transition.dest} [label="${label}"];`);
                    break;

                case TransitionType.If:
                    const condition = transition.condition.name;

                    var labelThen = "if(" + condition + ")";
                    if (transition.then.fn) {
                        labelThen += ` / ${transition.then.fn.name}`;
                    }

                    var labelElse = "if(!" + condition + ")";
                    if (transition.else.fn) {
                        labelThen += ` / ${transition.else.fn.name}`;
                    }

                    lines.push(`${state.name} -> ${transition.then.dest} [label="${labelThen}"];`);
                    lines.push(`${state.name} -> ${transition.else.dest} [label="${labelElse}"];`);
                    break;

                default:
                    console.error("unknown transition type!");
                    break;
            }

        });
        lines.push("\n");

    });
    lines.push("}");

    window.prompt("graphviz", lines.join("\n"));

}
