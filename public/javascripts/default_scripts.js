const binning = ['1s', '10s', '1m', '10m', '1h'];
const history = ['10m', '1h', '6h', '12h', '24h', '48h', '72h', '1w', '2w', '4w'];
var readings = [];

function PopulateReadings() {
  $.getJSON("/sensors/reading_list", (data) => {
    readings = data;
    //setInterval(UpdateLoop, 5000);
  });
}

function ReadingDropdown(reading) {
  $.getJSON(`/sensors/reading_detail?reading=${reading}`, (data) => {
    if (Object.keys(data).length == 0)
      return;
    $("#detail_reading_name").html(data.name);
    $("#reading_desc").val(data.description).attr('size', data.description.length + 3);
    $("#reading_status").prop('checked', data.status === 'online');
    $("#readout_interval").val(data.readout_interval);

    $("#runmode option").filter(function() {return this.value == data.runmode;}).prop('selected', true);
    function alarm_row(i) {
      var tot = "";
      tot += `<tr id="alarm_${i}" onclick="$('#alarm_${i}').remove()"><th colspan=2>Remove level</th></tr>`;
      tot += `<tr><td>Low: <input type="number" id="alarm_${i}_low" onchange="SetAlarmMidRange(${i})"></td>`;
      tot += `<td>Mid: <input type="number" id="alarm_${i}_mid" onchange="SetAlarmLowHigh(${i})"></td></tr>`;
      tot += `<tr><td>High: <input type="number" id="alarm_${i}_high" onchange="SetAlarmMidRange(${i})"><td>`;
      tot += `<td>Half-range: <input type="number" id="alarm_${i}_range" onchange="SetAlarmLowHigh(${i})"></td></tr>`;
      return tot;
    }
    // TODO alarms. The following code only works for simple alarms
    $("#alarm_table").html(data.alarms.reduce((tot, alarm, i) => {
      tot += alarm_row(i);
      if (i == data.alarms.length-1)
        tot += `<tr id="alarm_new" onclick="$('#alarm_table').append(alarm_row(${i+1}))"><th colspan=2>Add new</th></tr>`;
      return tot;}, ""));
    data.alarms.forEach((alarm, i) => {
      var low = alarm[0];
      var high = alarm[1];
      var mid = (high+low)/2;
      var range = (high-low)/2;
      $(`#alarm_${i}_low`).val(low);
      $(`#alarm_${i}_high`).val(high);
      $(`#alarm_${i}_mid`).val(mid);
      $(`#alarm_${i}_range`).val(range);
    });
    $("#readingbox").css("display", "block");

  });
  DrawReadingHistory(reading);
}

function SetAlarmLowHigh(i) {
  var mid = $(`#alarm_${i}_mid`).val();
  var range = $(`#alarm+${i}_range`).val();
  $(`#alarm_${i}_low`).val(mid-range/2);
  $(`#alarm_${i}_high`).val(mid+range/2);
}
function SetAlarmMidRange(i) {
  var low = $(`#alarm_${i}_low`).val();
  var high = $(`#alarm+${i}_high`).val();
  $(`#alarm_${i}_mid`).val((high+low)/2);
  $(`#alarm_${i}_range`).val((high-low)/2);
}

function SensorDropdown(sensor) {
  $.getJSON(`/sensors/sensor_detail?sensor=${sensor}`, (data) => {
    if (Object.keys(data).length == 0)
      return;
    $("#detail_sensor_name").html(data.name);
    if (typeof data.address.ip != 'undefined') {
      $("#sensor_ip").val(data.address.ip);
      $("#sensor_port").val(data.address.port);
      $("#sensor_eth").attr('hidden', false);
      $("#sensor_serial").attr('hidden', true);
    } else {
      $("#sensor_tty").val(data.address.tty);
      $("#sensor_baud option").filter(function() {return this.value == data.address.baud;}).prop('selected', true);
      $("#sensor_serial_id").val(data.address.serialID || null);
      $("#sensor_eth").attr('hidden', true);
      $("#sensor_serial").attr('hidden', false);
    }
    $("#sensorbox").css("display", "block");
  });
}

function RangeSliders(name, val) {
  $("#reading_binning_label").html(binning[$("#reading_binning").val()]);
  $("#reading_history_label").html(history[$("#reading_history").val()]);
}

function DrawReadingHistory(reading) {

  var bin_i = $("#reading_binning").val();
  var hist_i = $("#reading_history").val();

  $.getJSON(`/sensors/get_data?reading=${reading}&history=${history[hist_i]}&binning=${binning[bin_i]}`, data => {

  });
}

function UpdateReading() {
  var data = {
    reading: $("#detail_reading_name").html(),
    readout_interval: $("#readout_interval").val(),
    description: $("#reading_desc").val(),
    status: $("#reading_status").is(":checked") ? "online" : 'offline',
    runmode: $("#runmode").val(),
    alarms: [], // TODO
  };
  $.ajax({
    type: 'POST',
    url: '/sensors/update_reading',
    data: {data: data},
    success: (data) => {if (typeof data.err != 'undefined') alert(data.err);},
    error: (jqXHR, textStatus, errorCode) => alert(`Error: ${textStatus}, ${errorCode}`)
  });
  $("#readingbox").css("display", "none");
}

function UpdateSensor() {
  var data = {sensor: $("#detail_sensor_name").html()};
  if ($("#sensor_ip").val())
    data['ip'] = $("#sensor_ip").val();
  if ($("#sensor_port").val())
    data['port'] = $("#sensor_port").val();
  if ($("#sensor_tty").val())
    data['tty'] = $("#sensor_tty").val();
  if ($("#sensor_baud").val())
    data['baud'] = $("#sensor_baud").val();
  if ($("#sensor_serial_id").val())
    data['serial_id'] = $("#sensor_serial_id").val();
  if (Object.keys(data).length > 1) {
    $.ajax({
      type:'POST',
      url: '/sensors/update_sensor_address',
      data: {data: data},
      success: (data) => {if (typeof data.err != 'undefined') alert(data.err);},
      error: (jqXHR, textStatus, errorCode) => alert(`Error: ${textStatus}, ${errorCode}`)
    });
  }
  $("#sensorbox").css('display', 'none');
}

