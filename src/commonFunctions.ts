/*
Most of this stuff from lib.dom.d.ts.
To get to that file, right-click on a querySelector() function then choose Go to Definition.
*/

/*
I'm pretty sure this type parameter is actually necessary
https://typescript-eslint.io/rules/no-unnecessary-type-parameters/#im-using-the-type-parameter-inside-the-function-so-why-is-the-rule-reporting
*/
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function querySelectorAndCheck<E extends Element = HTMLElement>(parent: ParentNode, query: string): E {
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

/**
 * Downloading the SVG only takes four lines of Javascript. What the rest of this function does:
 * 
 *  - Make a clone so the original is still usable
 *  - Add light background to make it readable in dark theme
 *  - Change Chartist axis labels from <span>s inside <foreignObject>s to <text>s
 *  - Copy styles from CSS to XML attributes
 *  - Remove some XML attributes to reduce file size
 *  - Create a formatted date string in yyyy-mm-dd hh-mm-ss format
 * 
 * After downloading the SVG file, you should send it through SVG Optimizer (https://svgomg.net)
 * to get super small file size!
 */
export function downloadSVG(originalSvg: SVGSVGElement, downloadFilenameLabel: string): void {

    /*
    To minimize the file size of the downloaded SVG, we will remove all the id and class
    attributes. Removing those attributes breaks the D3 pan/zoom controller used for the 
    buzz history chart. To preserve the original SVG, we will clone the SVG and do all the
    processing only on the clone.
    */
    const clonedSvg = originalSvg.cloneNode(true) as SVGSVGElement;

    /*
    The cloned SVG must be added to the document for CSS style to get applied. To make the
    clone a sibling of the original we need to do this annoying parentNode.insertBefore() thing.
    The cloned SVG gets removed from the document at the end of this function. 
    */
    originalSvg.parentNode?.insertBefore(clonedSvg, originalSvg);

    /*
    Even though the file extension will be .svg, we still need to set the XML namespace attribute.
    Otherwise when opening the SVG file in Chrome or Firefox it says:
        This XML file does not appear to have any style information associated with it. The document tree is shown below.
    Apparently the xmlns attribute is not needed then it's an <svg> tag inside an HTML document,
    only when opening it as an .svg file from disk.
    */
    clonedSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");


    /* *****************************************************************
    ************************** Add background **************************
    ********************************************************************
    The purpose of downloading SVGs is to put them in readme.md, which can be viewed in dark theme.
    Text in the SVG is black, so we need a light background to make it readable.
    */
    const backgroundRect = createSvgElement("rect");
    backgroundRect.id = "background";
    backgroundRect.setAttribute("fill", "white");
    backgroundRect.setAttribute("stroke", "none");
    backgroundRect.setAttribute("x", "0");
    backgroundRect.setAttribute("y", "0");
    backgroundRect.setAttribute("width", String(clonedSvg.getAttribute("width")));
    backgroundRect.setAttribute("height", String(clonedSvg.getAttribute("height")));
    clonedSvg.insertBefore(backgroundRect, clonedSvg.firstChild);


    /* ******************************************************************************************
    ******** Change Chartist axis labels from <span>s inside <foreignObject>s to <text>s ********
    *********************************************************************************************
    I don't know why Chartist does this. Doing this replacement reduces the file size a lot.
    */
    const groupLabels = clonedSvg.querySelector("g.ct-labels");
    if (groupLabels) {
        groupLabels.setAttribute("font-size", "12");

        // Create new groups so we can set the text alignment on the groups instead of on each <text>.
        const groupXAxisLabels = createSvgElement("g");
        groupXAxisLabels.id = "xAxisLabels";
        groupXAxisLabels.setAttribute("dominant-baseline", "hanging");
        groupLabels.append(groupXAxisLabels);

        const groupYAxisLabels = createSvgElement("g");
        groupYAxisLabels.id = "yAxisLabels";
        groupYAxisLabels.setAttribute("text-anchor", "end");
        groupLabels.append(groupYAxisLabels);

        groupLabels.querySelectorAll("foreignObject").forEach(foreignObject => {

            const span = querySelectorAndCheck<HTMLSpanElement>(foreignObject, "span");

            const textElement = createSvgElement("text");
            textElement.innerHTML = span.innerText;
            if (span.innerText.startsWith("$")) {
                // Y axis is dollars, starts with dollar sign
                textElement.setAttribute("x", String(
                    Number(foreignObject.getAttribute("x")) + Number(foreignObject.getAttribute("width"))
                ));
                textElement.setAttribute("y", String(
                    Number(foreignObject.getAttribute("y")) + Number(foreignObject.getAttribute("height"))
                ));
                groupYAxisLabels.append(textElement);

            } else {
                // X axis is the question number, no dollar sign
                textElement.setAttribute("x", String(foreignObject.getAttribute("x")));
                textElement.setAttribute("y", String(foreignObject.getAttribute("y")));
                groupXAxisLabels.append(textElement);
            }
            foreignObject.remove();
        });
    }

    /* *************************************************************************
   ********************* Copy CSS styles to XML attributes *********************
   *****************************************************************************
   A lot of stuff is set in a separate CSS file, which is not accessible after
   downloading the SVG to a file.
   */

    clonedSvg.setAttribute("font-family", "sans-serif");

    /*
    The CSS styles we care about. For some of them, the XML attribute name is different.
    We are going to set all these attributes on every element, then SVG Optimizer (https://svgomg.net)
    will removes ones with no effect.
    */
    const stylesToCopy: { cssPropName: keyof CSSStyleDeclaration, xmlAttribName?: string }[] = [
        { cssPropName: "fill" },
        { cssPropName: "stroke" },
        { cssPropName: "strokeWidth", xmlAttribName: "stroke-width" },
        { cssPropName: "fontSize", xmlAttribName: "font-size" },

        // Used for labels on pie charts
        { cssPropName: "paintOrder", xmlAttribName: "paint-order" },
        { cssPropName: "dominantBaseline", xmlAttribName: "dominant-baseline" },

        // Dash array is used for grid lines
        { cssPropName: "strokeDasharray", xmlAttribName: "stroke-dasharray" },

        // Line cap needed because in the game-end line chart of money over time, data points are <line>s for some reason
        { cssPropName: "strokeLinecap", xmlAttribName: "stroke-linecap" }
    ];


    recurse(clonedSvg.children);

    function recurse(children: HTMLCollection): void {
        Array.from(children).forEach(child => {

            const computedCssStyle = window.getComputedStyle(child);

            if (computedCssStyle.display === "none" || computedCssStyle.opacity === "0") {
                // In the buzz history chart, some grids are invisible until you zoom in.
                child.remove();
            } else {
                stylesToCopy.forEach(styleToCopy => {

                    const cssPropName = styleToCopy.cssPropName;
                    const cssValue = String(computedCssStyle[cssPropName]);
                    const xmlAttribName = styleToCopy.xmlAttribName ?? String(cssPropName);

                    if (!child.hasAttribute(xmlAttribName)) {
                        child.setAttribute(xmlAttribName, cssValue);
                    }
                });
                recurse(child.children);
            }
        });
    }


    /* *******************************************************************************
      **************** Remove some XML attributes to reduce file size ****************
      ********************************************************************************
      Remove stuff which is not removed by SVG Optimizer (https://svgomg.net)
      */

    clonedSvg.removeAttribute("xmlns:ct"); //chartist namespace
    clonedSvg.removeAttribute("class");
    clonedSvg.removeAttribute("id");
    clonedSvg.querySelectorAll("*").forEach(element => {
        element.removeAttribute("class");
        element.removeAttribute("id");

        /*
        In the game-end line chart of money over time, Chartist generates dots for each data
        point using <line> elements for some reason. Each <line> has the data values in an
        attribute which do not get removed by SVG Optimizer.
        
        In fact, after removing the "xmlns:ct" attribute from the <svg>, if any of these
        attributes are still on anything, Firefox shows this error:
            XML Parsing Error: prefix not bound to a namespace
        and Chrome shows this error:
            Namespace prefix ct for value on line is not defined
        */
        element.removeAttribute("ct:value");
    });


    /* ******************************************************************
      ************************ Download the file ************************
      *******************************************************************/

    // Generate date in yyyy-mm-dd hh-mm-ss format, apparently there is not a built-in date format function
    const now = new Date();

    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    const hours24 = now.getHours();
    // hour zero is midnight, hour 12 is noon, hour 13 is 1 PM.
    const hours12 = hours24 > 12 ? hours24 - 12 : hours24; //TODO need to change hour zero to 12
    const amOrPm = hours24 > 12 ? "PM" : "AM";

    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    const formattedDate = `${now.getFullYear()}-${month}-${day} ${hours12}-${minutes}-${seconds} ${amOrPm}`;

    // Download the file
    const a = document.createElement('a');
    a.href = `data:image/svg+xml,${encodeURIComponent(clonedSvg.outerHTML)}`;
    a.download = `Jeopardy ${downloadFilenameLabel} ${formattedDate}.svg`;
    a.click(); //no need to add the <a> to the document

    clonedSvg.remove();

}