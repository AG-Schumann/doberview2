const binning = ['1s', '10s', '1m', '10m', '1h'];
const history = ['10m', '1h', '6h', '12h', '24h', '48h', '72h', '1w', '2w', '4w'];
var readings = [];

function PopulateReadings() {
  $.getJSON("/sensors/reading_list", (data) => {
    readings = data;
    setInterval(UpdateLoop, 5000);
  });
}

function ReadingDropdown(reading) {
  $.getJSON(`/sensors/reading_detail?reading=${reading}`, (data) => {
    if (Object.keys(data).length == 0)
      return;
    $("#detail_reading_name").html(data.name);
    $("#reading_desc").val(data.description);
    $("#reading_active").prop('checked', data.status === 'online');
    $("#readout_interval").val(data.readout_interval);

    $("#runmode option").filter(function() {return this.value == data.runmode;}).prop('selected', true);
    // TODO alarms

  });
  DrawReadingHistory(reading);
  $("#detailbox").css("display", "block");
}

function SensorDropdown(sensor) {
  $.getJSON(`/sensors/sensor_detail?sensor=${sensor}`, (data) => {
    if (Object.keys(data).length == 0)
      return;
    $("#sensor_ip").val(data.address.ip || null);
    $("#sensor_port").val(data.address.port || null);
    $("#sensor_tty").val(data.address.tty || null);
    $("#sensor_baud option").filter(function() {return this.value == data.address.baud;}).prop('selected', true);
    $("#sensor_serial_id").val(data.address.serialID || null);
  });
}

function RangeSliders() {
  $("#reading_binning").html(binning[$("#reading_binning").val()]);
  $("#reading_history").html(binning[$("#reading_history").val()]);
}

function DrawReadingHistory(reading) {

  var bin_i = $("#reading_granularity").val();
  var hist_i = $("#reading_history").val();

  $.getJSON(`/sensors/get_data?reading=${reading}&history=${history[hist_i]}&binning=${binning[bin_i]}`, data => {

  });
}

function UpdateReading() {
  var data = {
    reading: $("#detail_reading_name").html();
    readout_interval: $("#readout_interval").val(),
    description: $("#reading_desc").val(),
    status: $("#reading_status").is(":checked") ? "online" : 'offline',
    runmode: $("#runmode").val();
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
      type='POST',
      url: '/sensors/update_sensor_address',
      data: {data: data},
      success: (data) => {if (typeof data.err != 'undefined') alert(data.err);},
      error: (jqXHR, textStatus, errorCode) => alert(`Error: ${textStatus}, ${errorCode}`)
    });
  }
  $("#sensorbox").css('display', 'none');
}

function UpdateLoop() {
  readings.forEach(r => {
    $.getJSON(`/sensors/reading_detail?reading=${r}`, (data) => {
      if (data.status === 'online')
        $(`#{r}_status`).html(`Online (${data.runmode})`);
      else
        $(`#{r}_status`).html(`Offline`);
    });
    $.getJSON(`/sensors/get_last_point?reading=${r}`, (data) => {
      $(`{r}_value`).html(`${data.value} (${data.time_ago}s ago)`);
    });
  });
}
