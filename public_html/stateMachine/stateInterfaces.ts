export interface StateMachineState {
    name: string;
    showSlide?: string;
    onEnter?: Function;
    onExit?: Function;
    transitions: StateMachineTransition[];
}

//todo maybe change this to an enum?
export type StateMachineTransition = ManualTransition | IfTransition | PromiseTransition | ImmediateTransition | TimeoutTransition | KeyboardTransition;

export interface ManualTransition{
    type: "manual";
    name: string;
    dest: string;
}

export interface IfTransition{
    type: "if";
    condition: (arg0: KeyboardEvent) => boolean;
    then: string;
    else: string;
}

export interface PromiseTransition{
    type: "promise";
    dest: string;
}

export interface ImmediateTransition{
    type: "immediate";
    dest: string;
}

export interface TimeoutTransition{
    type: "timeout";
    duration: (() => number) | number;
    dest: string;
    countdownTimerShowDots?: boolean;
}

export interface KeyboardTransition{
    type: "keyboard";
    keys: string;
    dest: string;
}


class MyClass {
    something: string;
}

type something = MyClass | number;

const myArray: something[] = [new MyClass()];

const element:something = myArray[0];

if(element instanceof MyClass){
    console.log("yes");
    
}