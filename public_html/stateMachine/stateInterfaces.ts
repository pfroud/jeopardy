import { Clue } from "../interfaces";

export interface StateMachineState {
    name: string;
    presentationSlideToShow?: string;
    onEnter?: (keyboardEvent?: KeyboardEvent) => void;
    onExit?: () => void;
    transitions: StateMachineTransition[];
}

export type StateMachineTransition = ManualTransition | IfTransition | PromiseTransition | TimeoutTransition | KeyboardTransition;

export enum TransitionType {
    ManualTrigger,
    If,
    Promise,
    Timeout,
    Keyboard
}

export interface ManualTransition {
    type: TransitionType.ManualTrigger;
    triggerName: string;
    destination: string;
    fn?: () => void;
}

export interface IfTransition {
    type: TransitionType.If;
    condition: (arg0: KeyboardEvent) => boolean;
    then: {
        destination: string;
        fn?: () => void;
    };
    else: {
        destination: string;
        fn?: () => void;
    };
}

export interface PromiseTransition {
    type: TransitionType.Promise;
    functionToGetPromise: () => Promise<void>;
    destination: string;
    //fn?: () => void;
}

export interface TimeoutTransition {
    type: TransitionType.Timeout;
    duration: (() => number) | number;
    destination: string;
    countdownTimerShowDots?: boolean;
    fn?: () => void; //called when time runs out
}

export interface KeyboardTransition {
    type: TransitionType.Keyboard;
    keyboardKeys: string;
    destination: string;
    fn?: (keyboardEvent: KeyboardEvent) => void;
}
