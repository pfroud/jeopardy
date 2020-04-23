export interface StateMachineState {
    name: string;
    showSlide?: string;
    onEnter?: Function;
    onExit?: Function;
    transitions: StateMachineTransition[];
}

export type StateMachineTransition = ManualTransition | IfTransition | PromiseTransition | ImmediateTransition | TimeoutTransition | KeyboardTransition;

export enum TransitionType {
    Manual, If, Promise, Immediate, Timeout, Keyboard
}

export interface ManualTransition{
    type: TransitionType.Manual;
    name: string;
    dest: string;
}

export interface IfTransition{
    type: TransitionType.If;
    condition: (arg0: KeyboardEvent) => boolean;
    then: string;
    else: string;
}

export interface PromiseTransition{
    type: TransitionType.Promise;
    dest: string;
}

export interface ImmediateTransition{
    type: TransitionType.Immediate;
    dest: string;
}

export interface TimeoutTransition{
    type: TransitionType.Timeout;
    duration: (() => number) | number;
    dest: string;
    countdownTimerShowDots?: boolean;
}

export interface KeyboardTransition{
    type: TransitionType.Keyboard;
    keys: string;
    dest: string;
}
