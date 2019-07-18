$(document).ready(function () {

    const table = $("table tbody");

    makeTable();

    function makeTable() {
        for (var i = 0; i < 4; i++) {


            const tr = $("<tr>").appendTo(table);
            $("<td>").html("team name").appendTo(tr);


            var values = [1000, 800, 600, 400, 200];

            values.forEach(function (value) {
                const td = $("<td>").appendTo(tr);
                const button = $("<button>").html("-$" + value).appendTo(td);
            });

            const td = $("<td>").appendTo(tr);
            $("<input>").attr("type", "text").prop("value", "1234").appendTo(td);

            values.reverse();


            values.forEach(function (value) {
                const td = $("<td>").appendTo(tr);
                const button = $("<button>").html("+$" + value).appendTo(td);
            });


        }

    }



});