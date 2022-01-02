import { CountdownTimer } from "../CountdownTimer";

export interface StateMachineState {
    name: string;
    presentationSlideToShow?: string;
    onEnter?: (keyboardEvent?: KeyboardEvent) => void;// TODO why does this get a keyboard event??
    onExit?: () => void;
    transitions: StateMachineTransition[];
    //graphvizNodeShape: NodeShape;
}

/*
export enum NodeShape {
    // https://www.gliffy.com/blog/guide-to-flowchart-symbols
    // https://graphviz.org/doc/info/shapes.html
    Terminal = "oval",
    Process = "rect",
    Decision = "diamond"
}
*/

export type StateMachineTransition = ManualTransition | IfTransition | PromiseTransition | TimeoutTransition | KeyboardTransition;

// need to specify string values for enum so it appears in graphviz dot file
export enum TransitionType {
    ManualTrigger = "manualTrigger",
    If = "if",
    Promise = "promise",
    Timeout = "timeout",
    Keyboard = "keyboard"
}

export interface ManualTransition {
    type: TransitionType.ManualTrigger;
    triggerName: string;
    destination: string;
    onTransition?: () => void;
    guardCondition?: () => boolean;
}


export interface IfTransition {
    type: TransitionType.If;
    condition: (arg0: KeyboardEvent) => boolean;// TODO why does this get a keyboard event??
    then: {
        destination: string;
        onTransitionThen?: () => void;
    };
    else: {
        destination: string;
        onTransitionElse?: () => void;
    };
}


export interface PromiseTransition {
    type: TransitionType.Promise;
    functionToGetPromise: () => Promise<void>;
    destination: string;
    guardCondition?: () => boolean;
}

// https://stackoverflow.com/a/37688375
interface TimeoutTransitionBase {
    type: TransitionType.Timeout;
    destination: string;
    countdownTimerShowDots?: boolean;
    onTransition?: () => void; //called when time runs out
    guardCondition?: () => boolean;
}
// https://stackoverflow.com/a/61281828
interface StartNewCountdownTimer extends TimeoutTransitionBase {
    durationForNewCountdownTimer: number;
    countdownTimerToResume?: never;
}
interface ContinueCountdownTimer extends TimeoutTransitionBase {
    durationForNewCountdownTimer?: never;
    countdownTimerToResume: () => CountdownTimer;
}
export type TimeoutTransition = StartNewCountdownTimer | ContinueCountdownTimer;

export interface KeyboardTransition {
    type: TransitionType.Keyboard;
    keyboardKeys: string;
    destination: string;
    onTransition?: (keyboardEvent: KeyboardEvent) => void;
    guardCondition?: (keyboardEvent: KeyboardEvent) => boolean;
}
