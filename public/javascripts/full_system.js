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

function GetGroupedReadings(group_by) {
  $.getJSON(`/sensors/readings_grouped?group_by=${group_by}`, (data) => {
    $("#reading_table").empty();
    data.forEach(group => {
      var click = group_by == 'sensor' ? `data-bs-toggle="modal" data-bs-target="#sensorbox" onclick='SensorDropdown("${group._id}")'` : "";
      var head = `<thead><tr ${click}><th colspan=2>${group._id}</th></tr></thead><tbody>`;
      $("#reading_table").append(head + group['readings'].reduce((tot, rd) => tot + `<tr data-bs-toggle="modal" data-bs-target="#readingbox" onclick="ReadingDropdown('${rd.name}')"><td>${rd.desc} (${rd.name})</td><td id="${rd.name}_status">Unknown</td><td id="${rd.name}_value">-</td></tr>`));
      $("#reading_table").append('</tbody>');
    });
  });
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
