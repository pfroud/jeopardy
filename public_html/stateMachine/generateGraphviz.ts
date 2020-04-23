import { StateMachineState, StateMachineTransition, TransitionType } from "./stateInterfaces.js";

export function generateGraphvizImpl(stateArray: StateMachineState[]) {

    const lines: string[] = ["digraph jeopardy{\n"];

    stateArray.forEach((state: StateMachineState) => {

        state.transitions.forEach((transition: StateMachineTransition) => {


            switch (transition.type) {
                case TransitionType.Timeout:
                    lines.push(`${state.name} -> ${transition.dest} [label="timeout"];`);
                    break;

                case TransitionType.Keyboard:
                    lines.push(`${state.name} -> ${transition.dest} [label="${transition.keys}"];`);
                    break;

                case TransitionType.Manual:
                    lines.push(`${state.name} -> ${transition.dest} [label="manual"];`);
                    break;

                case TransitionType.Promise:
                    lines.push(`${state.name} -> ${transition.dest} [label="promise"];`);
                    break;

                case TransitionType.Immediate:
                    lines.push(`${state.name} -> ${transition.dest} [label="immediate"];`);
                    break;

                case TransitionType.If:
                    lines.push(`${state.name} -> ${transition.then} [label="then"];`);
                    lines.push(`${state.name} -> ${transition.else} [label="else"];`);
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
