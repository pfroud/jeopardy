$(document).ready(function () {

    const table = $("table tbody");

    makeTable();

    function makeTable() {
        for (var i = 0; i < 4; i++) {


            const tr = $("<tr>").appendTo(table).html("team name");


            var values = [1000, 800, 600, 400, 200];

            values.forEach(function (value) {
                const td = $("<td>").appendTo(tr);
                const button = $("<button>").appendTo(td).html("-$" + value);
            });

            const td = $("<td>").appendTo(tr);
            $("<input>").attr("type", "text").appendTo(td).prop("value", "1234");

            values.reverse();


            values.forEach(function (value) {
                const td = $("<td>").appendTo(tr);
                const button = $("<button>").appendTo(td).html("+$" + value);
            });


        }

    }



});