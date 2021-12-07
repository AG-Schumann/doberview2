var readings = [];
var SIG_FIGS=3;
var LOG_THRESHOLD=3;
console.log('Change the number formatting by with the SIG_FIGS and LOG_THRESHOLD variables')

function PopulateReadings() {
  $.getJSON("/sensors/reading_list", (data) => {
    readings = data;
    //setInterval(UpdateLoop, 5000);
    $("#reading_history").attr('max', history.length);
    $("#reading_binning").attr('max', binning.length);
    RangeSliders();
    UpdateOnce();
  });
}


function GetGroupedReadings() {
  var group_by = $("#reading_grouping").val();
  $.getJSON(`/sensors/readings_grouped?group_by=${group_by}`, (data) => {
    $("#reading_table").empty();
    data.forEach(group => {
      var click = group_by == 'sensor' ? `onclick='SensorDropdown("${group._id}")'` : "";
      var head = `<tr ${click}><th colspan=2><strong>${group._id}</strong></th></tr>`;
      $("#reading_table").append(head + group['readings'].reduce((tot, rd) => tot + `<tr onclick="ReadingDropdown('${rd.name}')"><td>${rd.desc} (${rd.name})</td><td id="${rd.name}_status">Loading!</td></tr>`, ""));
    }); // data.forEach
  }); // getJSON
}

function UpdateOnce() {
  readings.forEach(r => {
    $.getJSON(`/sensors/reading_detail?reading=${r}`, (data) => {
      if (data.status === 'online') {
        $.getJSON(`/sensors/get_last_point?reading=${r}`, (val) => {
          var disp = Math.abs(Math.log10(Math.abs(val.value))) < LOG_THRESHOLD ? val.value.toFixed(SIG_FIGS) : val.value.toExponential(SIG_FIGS);
          $(`#${r}_status`).html(`${disp} (${val.time_ago}s ago)`);
        });
      }
      else {
        $(`#${r}_status`).html(`Offline`);
      }
    });
  });

}
