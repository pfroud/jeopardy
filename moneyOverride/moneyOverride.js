$(document).ready(function () {

    if (!window.opener) {
        console.error("no window.opener, we're fucked");
    }

    const teamArray = window.opener.operator.teamArray;

    makeTable();

    function makeTable() {
        const table = $("table tbody");
        for (let teamIndex = 0; teamIndex < 4; teamIndex++) {
            makeTableRow(teamIndex);
        }

        function makeTableRow(teamIndex) {
            const teamObj = teamArray[teamIndex];
            var dollarValues = [1000, 800, 600, 400, 200];
            
            const tr = $("<tr>").appendTo(table);
            $("<td>").html(teamObj.teamName).appendTo(tr);

            // buttons to subtract money
            dollarValues.forEach(function (dollarValue) {
                const td = $("<td>").appendTo(tr);
                const button = $("<button>").addClass("money-change").html("-$" + dollarValue).appendTo(td).on("click", () => {
                    console.log("team " + teamIndex + " clicked on -$" + dollarValue);
                });
            });

            // present value
            const td = $("<td>").appendTo(tr);
            td.append(document.createTextNode("$"));
            $("<input>").attr("type", "text").prop("value", teamObj.dollars).appendTo(td);

            // buttons to add money
            dollarValues.reverse();
            dollarValues.forEach(function (value) {
                const td = $("<td>").appendTo(tr);
                const button = $("<button>").addClass("money-change").html("+$" + value).appendTo(td);
            });

        }
        
    }



});