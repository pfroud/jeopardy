export interface StateMachineState {
    name: string;
    showSlide?: string;
    onEnter?: Function;
    onExit?: Function;
    transitions: StateMachineTransition[];
}

//todo maybe change this to an enum?
export type StateMachineTransition = ManualTransition | IfTransition | PromiseTransition | ImmediateTransition | TimeoutTransition | KeyboardTransition;

export interface TransitionInterface {
    type: string;
}

export interface ManualTransition extends TransitionInterface {
    name: string;
    dest: string;
}

export interface IfTransition extends TransitionInterface {
    condition: (arg0: KeyboardEvent) => boolean;
    then: string;
    else: string;
}

export interface PromiseTransition extends TransitionInterface {
    dest: string;
}

export interface ImmediateTransition extends TransitionInterface {
    dest: string;
}

export interface TimeoutTransition extends TransitionInterface {
    duration: (() => number) | number;
    dest: string;
    countdownTimerShowDots?: boolean;
}

export interface KeyboardTransition extends TransitionInterface {
    keys: string;
    dest: string;
}