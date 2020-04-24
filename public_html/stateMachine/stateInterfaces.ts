export interface StateMachineState {
    name: string;
    showSlide?: string;
    onEnter?: Function;
    onExit?: Function;
    transitions: StateMachineTransition[];
}

export type StateMachineTransition = ManualTransition | IfTransition | PromiseTransition | ImmediateTransition | TimeoutTransition | KeyboardTransition;

export enum TransitionType {
    Manual = "manual",
    If = "if",
    Promise = "promise",
    Immediate = "immediate",
    Timeout = "timeout",
    Keyboard = "keyboard"
}

export interface ManualTransition {
    type: TransitionType.Manual;
    triggerName: string;
    dest: string;
    fn?: Function;
}

export interface IfTransition {
    type: TransitionType.If;
    condition: (arg0: KeyboardEvent) => boolean;
    then: {
        dest: string;
        fn?: Function;
    };
    else: {
        dest: string;
        fn?: Function;
    };
}

export interface PromiseTransition {
    type: TransitionType.Promise;
    dest: string;
    fn?: Function;
}

export interface ImmediateTransition {
    type: TransitionType.Immediate;
    dest: string;
    fn?: Function;
}

export interface TimeoutTransition {
    type: TransitionType.Timeout;
    duration: (() => number) | number;
    dest: string;
    countdownTimerShowDots?: boolean;
    fn?: Function;
}

export interface KeyboardTransition {
    type: TransitionType.Keyboard;
    keys: string;
    dest: string;
    fn?: Function;
}
