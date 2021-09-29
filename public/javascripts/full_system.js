var readings = [];

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
        //$(`#${r}_status`).html(`Online (${data.runmode})`);
        $.getJSON(`/sensors/get_last_point?reading=${r}`, (val) => {
          $(`#${r}_status`).html(`${val.value} (${val.time_ago}s ago)`);
        });
      }
      else {
        $(`#${r}_status`).html(`Offline`);
      }
    });
  });
}
