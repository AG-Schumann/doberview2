const binning = ['1s', '10s', '1m', '10m', '1h'];
const history = ['10m', '1h', '6h', '12h', '24h', '48h', '72h', '1w', '2w', '4w'];

function ReadingDropdown(reading) {
  $("#alarm_low").change(() => {var low = $("#alarm_low").val(); var high = $("#alarm_high").val(); if (low && high) {$("#alarm_mid").val((high+low)/2); $("#alarm_range").val((high-low)/2);}});
  $("#alarm_high").change(() => {var low = $("#alarm_low").val(); var high = $("#alarm_high").val(); if (low && high) {$("#alarm_mid").val((high+low)/2); $("#alarm_range").val((high-low)/2);}});
  $("#alarm_mid").change(() => {var mid = $("#alarm_mid").val(); var range = $("#alarm_range").val(); if (mid && range) {$("#alarm_low").val(mid-range); $("#alarm_high").val(mid+range);}});
  $("#alarm_range").change(() => {var mid = $("#alarm_mid").val(); var range = $("#alarm_range").val(); if (mid && range) {$("#alarm_low").val(mid-range); $("#alarm_high").val(mid+range);}});
  $.getJSON(`/sensors/reading_detail?reading=${reading}`, (data) => {
    $("#sensorbox").css("display", "none");
    if (Object.keys(data).length == 0)
      return;
    $("#detail_reading_name").html(data.name);
    $("#reading_desc").val(data.description).attr('size', data.description.length + 3);
    $("#reading_status").prop('checked', data.status === 'online');
    $("#readout_interval").val(data.readout_interval);

    if (typeof data.alarm_thresholds != 'undefined' && data.alarm_thresholds.length == 2) {
      $("#alarm_low").val(data.alarm_thresholds[0]);
      $("#alarm_high").val(data.alarm_thresholds[1]);
      $("#alarm_mid").val((data.alarm_thresholds[1]+data.alarm_thresholds[0])/2);
      $("#alarm_range").val((data.alarm_thresholds[1]-data.alarm_thresholds[0])/2);
      $("#alarm_recurrence").val(data.alarm_recurrence);
    } else {
      $("#alarm_low").val(null);
      $("#alarm_high").val(null);
      $("#alarm_mid").val(null);
      $("#alarm_range").val(null);
      $("#alarm_recurrence").val(null);
    }

    $("#pipeline_list").empty();
    if (typeof data.pipelines != 'undefined' && data.pipelines.length > 0)
      data.pipelines.forEach(name => $("#pipeline_list").append(`<li><a href="/pipeline?pipeline_id=${name}"><button class="small-button">${name}</button></a></li>`));
    else
      $("#pipeline_list").append(`<li><button class="btn btn-info" onclick=MakeAlarm("${data.name}")>Make new alarm</button></li>`);
    $("#reading_sensor_name").text(data.sensor).attr('onclick', `SensorDropdown("${data.sensor}")`);
    $("#readingbox").css("display", "block");

  });
  DrawReadingHistory(reading);
}

function MakeAlarm(name) {
  var template = {
    name: `alarm_${name}`,
    node_config: {},
    pipeline: [
      {
        name: 'source',
        type: 'SensorRespondingAlarm',
        input_var: name
      },
      {
        name: 'alarm',
        type: 'SimpleAlarmNode',
        input_var: name,
        upstream: ['source']
      }
    ]
  };
  $.post('/pipeline/add_pipeline', {doc: template}, (data, status) => {
    if (typeof data.err != 'undefined')
      alert(data.err);
  });
}

function SensorDropdown(sensor) {
  $.getJSON(`/sensors/sensor_detail?sensor=${sensor}`, (data) => {
    console.log(data);
    $("#readingbox").css("display", "none");
    if (Object.keys(data).length == 0)
      return;
    $("#detail_sensor_name").html(data.name);
    if (typeof data.address != 'undefined') {
      if (typeof data.address.ip != 'undefined') {
        $("#sensor_ip").val(data.address.ip);
        $("#sensor_port").val(data.address.port);
        $("#sensor_eth").attr('hidden', false);
        $("#sensor_serial").attr('hidden', true);
      } else if (typeof data.address.tty != 'undefined') {
        $("#sensor_tty").val(data.address.tty);
        $("#sensor_baud option").filter(function() {return this.value == data.address.baud;}).prop('selected', true);
        $("#sensor_serial_id").val(data.address.serialID || null);
        $("#sensor_eth").attr('hidden', true);
        $("#sensor_serial").attr('hidden', false);
      }
    } else {
      $("#sensor_eth").attr('hidden', true);
      $("#sensor_serial").attr('hidden', true);
    }
    $("#sensor_readings").empty();
    Object.keys(data.readings).forEach(rd => $("#sensor_readings").append(`<li><button class="small-button" onclick="ReadingDropdown('${rd}')">${rd}</button></li>`));
    if (typeof data.commands != 'undefined')
      $("#sensor_command_list").html(data.commands.reduce((tot, cmd) => tot + `<li>${cmd}</li>`,"") || "<li>None</li>");
    else
      $("#sensor_command_list").html("<li>None</li>");
    $("#sensorbox").css("display", "block");
  });
}

function RangeSliders() {
  $("#reading_binning_label").html(binning[$("#reading_binning").val()]);
  $("#reading_history_label").html(history[$("#reading_history").val()]);
}

function DrawReadingHistory(reading) {

  reading = reading || $("#detail_reading_name").html();
  var bin_i = $("#reading_binning").val();
  var hist_i = $("#reading_history").val();

  $.getJSON(`/sensors/get_data?reading=${reading}&history=${history[hist_i]}&binning=${binning[bin_i]}`, data => {
    Highcharts.chart('reading_chart', {
      chart: {
        zoomtype: 'xy',
        height: 'auto',
      },
      title: {text: null},
      credits: {enabled: false},
      series: [{type: 'line', data: data.filter(row => (row[0] && row[1])), animation: {duration: 250}}],
      xAxis: {type: 'datetime'},
      yAxis: {title: {text: null}},
      legend: {enabled: false},
    });
    return;
  });
}

function UpdateReading() {
  var data = {
    reading: $("#detail_reading_name").html(),
    readout_interval: $("#readout_interval").val(),
    description: $("#reading_desc").val(),
    status: $("#reading_status").is(":checked") ? "online" : 'offline',
  };
  if ($("#alarm_low").val() && $("#alarm_high").val()) {
    data.alarm = [$("#alarm_low").val(), $("#alarm_high").val()];
    data.alarm_recurrence = $("#alarm_recurrence").val();
  }
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
  ['ip', 'port', 'tty', 'baud', 'serial_id'].forEach(key => {
    if ($(`#sensor_${key}`).val())
      data[key] = $(`#sensor_${key}`).val();
    $(`#sensor_${key}`).val(null);
  });
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

