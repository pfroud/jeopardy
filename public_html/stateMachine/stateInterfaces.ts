import { Clue } from "../interfaces";

export interface StateMachineState {
    name: string;
    showPresentationSlide?: string;
    onEnter?: (keyboardEvent?: KeyboardEvent) => (Promise<Clue> | void);
    onExit?: () => void;
    transitions: StateMachineTransition[];
}

export type StateMachineTransition = ManualTransition | IfTransition | PromiseTransition | TimeoutTransition | KeyboardTransition;

export enum TransitionType {
    Manual = "manual",
    If = "if",
    Promise = "promise",
    Timeout = "timeout",
    Keyboard = "keyboard"
}

export interface ManualTransition {
    type: TransitionType.Manual;
    triggerName: string;
    dest: string;
    fn?: () => void;
}

export interface IfTransition {
    type: TransitionType.If;
    condition: (arg0: KeyboardEvent) => boolean;
    then: {
        dest: string;
        fn?: () => void;
    };
    else: {
        dest: string;
        fn?: () => void;
    };
}

export interface PromiseTransition {
    type: TransitionType.Promise;
    dest: string;
    fn?: () => void;
}

export interface TimeoutTransition {
    type: TransitionType.Timeout;
    duration: (() => number) | number;
    dest: string;
    countdownTimerShowDots?: boolean;
    fn?: () => void;
}

export interface KeyboardTransition {
    type: TransitionType.Keyboard;
    keys: string;
    dest: string;
    fn?: (keyboardEvent: KeyboardEvent) => void;
}
