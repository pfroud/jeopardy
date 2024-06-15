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

export function createSvgElement<K extends keyof SVGElementTagNameMap>(qualifiedName: K): SVGElementTagNameMap[K] {
    return document.createElementNS<K>("http://www.w3.org/2000/svg", qualifiedName);
}