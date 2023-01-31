/*
Most of this stuff from lib.dom.d.ts.
To get to that file, right-click on a querySelector() function then choose Go to Definition.
*/

export function querySelectorAndCheck<E extends Element = Element>(parent: ParentNode, query: string): E {
    const result = parent.querySelector<E>(query);
    if (result) {
        return result;
    } else {
        throw new Error(`${parent.nodeName}.querySelector("${query}") returned null`);
    }
}



export function querySelectorSVGAndCheck<K extends keyof SVGElementTagNameMap>
    (parent: ParentNode, query: K): SVGElementTagNameMap[K] {
    const result = parent.querySelector<K>(query);
    if (result) {
        return result;
    } else {
        throw new Error(`${parent.nodeName}.querySelector("${query}") returned null`);
    }
}