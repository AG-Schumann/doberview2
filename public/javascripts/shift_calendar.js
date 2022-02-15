
function DrawCalendar() {
    var calendar = new FullCalendar.Calendar($('#calendar')[0], {
        initialView: 'dayGridMonth',
        themeSystem: 'bootstrap',
        firstDay: 1, // Monday
        eventClick: function(info) {ShiftDropdown(info.event._def.extendedProps.key);},
        events: function(info, success, failure) {
            var start = info.startStr.slice(0,10); // YYYY-MM-DD
            var end = info.endStr.slice(0,10);
            $.getJSON('shifts/get_shifts?start=' + start + '&end=' + end, function(data) {
                if (data.length < 1) {
                    failure({message:"No shifts in this duration"});
                } else {
                    success(data);
                }
            }); // getJSON
        }, // events function
    }); // calendar c'tor
    calendar.render();
}

function ShiftDropdown(key) {
    $.getJSON('shifts/shift_detail?key=' + key, function (data) {
        $("#shift_start").text(new Date(data.start).toString().slice(0,21));
        $("#shift_end").text(new Date(data.end).toString().slice(0,21));
        $(".contact_select option").removeAttr("selected");
        if (data.shifters[0] != "") {
            $("#primary_select option:contains(" + data.shifters[0] + ")").attr('selected', true);
        } else {
            $("#primary_select option:contains('None')").attr('selected', true);
        }
        if (data.shifters[1] != "") {
            $("#secondary_select option:contains(" + data.shifters[1] + ")").attr('selected', true);
        } else {
            $("#secondary_select option:contains('None')").attr('selected', true);
        }
        if (data.shifters[2] != "") {
            $("#alarm_duty_select option:contains(" + data.shifters[2] + ")").attr('selected', true);
        } else {
            $("#alarm_duty_select option:contains('None')").attr('selected', true);
        }
    });
    $("#shiftbox").modal('toggle');
}

function GetContactDropdown() {
    $.getJSON('shifts/contacts', function (data) {
        $(".contact_select").html(`<select class="form-control"><option value='None' selected> None</option>` + data.reduce((tot, rd) => tot + `<option value="${rd.name}"> ${rd.name} </option>`, "") + `</select>`);
    });
}