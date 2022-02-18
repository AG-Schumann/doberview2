var sensors = [];
var units = {};
var SIG_FIGS=3;
var LOG_THRESHOLD=3;
console.log('Change the number formatting by with the SIG_FIGS and LOG_THRESHOLD variables')

function PopulateSensors() {
  $("#sensor_history").attr('max', history.length);
  $("#sensor_binning").attr('max', binning.length);
  $.getJSON("/devices/sensor_list", (data) => {
    sensors = data;
    RangeSliders();
    UpdateOnce();
  });
}

function GetGroupedSensors() {
  var group_by = $("#sensor_grouping").val();
  $.getJSON(`/devices/sensors_grouped?group_by=${group_by}`, (data) => {
    $("#sensor_table").empty();
    data.forEach(group => {
      var click = group_by == 'device' ? `onclick='DeviceDropdown("${group._id}")'` : "";
      var head = `<tr ${click}><th colspan=2><strong>${group._id}</strong></th></tr>`;
      group['sensors'].forEach(doc => units[doc.name] = doc.units);
      $("#sensor_table").append(head + group['sensors'].reduce((tot, rd) => tot + `<tr><td onclick="SensorDropdown('${rd.name}')">${rd.desc} (${rd.name})</td><td id="${rd.name}_status">Loading!</td></tr>`, ""));
    }); // data.forEach
  }); // getJSON
}

function SigFigs(val) {
  return Math.abs(Math.log10(Math.abs(val))) < LOG_THRESHOLD ? val.toFixed(SIG_FIGS) : val.toExponential(SIG_FIGS);
}

function UpdateOnce() {
  sensors.forEach(r => {
    $.getJSON(`/devices/get_last_point?sensor=${r}`, (val) => {
      $(`#${r}_status`).html(`${SigFigs(val.value)} ${units[r]} (${val.time_ago}s ago)`);
    });
  });
}
