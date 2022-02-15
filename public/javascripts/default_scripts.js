const binning = {'10m': '1s', '1h': '6s', '1d': '2m', '1w': '15m'};
const default_interval = '10m'


function ReadingDropdown(reading) {
  $.getJSON(`/sensors/reading_detail?reading=${reading}`, (data) => {
    $("#sensorbox").css("display", "none");
    if (Object.keys(data).length == 0)
      return;
    $("#detail_reading_name").html(data.name);
    $("#reading_desc").val(data.description).attr('size', data.description.length + 1);
    $("#reading_status").prop('checked', data.status === 'online');
    $("#readout_interval").val(data.readout_interval);
    $("#runmode option").filter(function() {return this.value == data.runmode;}).prop('selected', true);
    $("#pipeline_list").empty();
    if (typeof data.pipelines != 'undefined')
      data.pipelines.forEach(name => $("#pipeline_list")
          .append(`<li><a href="/pipeline?pipeline_id=${name}"><button class="small-button">${name}</button></a></li>`));
    else
      $("#pipeline_list").append("<li>None</li>");
    $("#reading_sensor_name").text(data.sensor).attr('onclick', `SensorDropdown("${data.sensor}")`);
    $("#readingbox").css("display", "block");
  });
  DrawReadingHistory(reading, default_interval);
}

function SensorDropdown(sensor) {
  $.getJSON(`/sensors/sensor_detail?sensor=${sensor}`, (data) => {
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

function GetMonitoringHost(sensor) {
  $.getJSON(`/sensors/monitoring?sensor=${sensor}`, (data) => {
    if(data == null) {
      $(`#${sensor}_monitoring_host`).text("unmonitored");
    } else {
      $(`#${sensor}_monitoring_host`).text("monitored by " + data.hostname);
    }
  });
}

function GetUnmonitoredSensors() {
  $.getJSON(`/sensors/list`, (all) => {
    $.getJSON(`/sensors/monitored_list`, (monitored) => {
      var unmonitored = all.filter(x => !monitored.includes(x));
      console.log(unmonitored);
      $('#unmonitored_sensors_list').html(unmonitored.reduce((tot, un) => tot + `<li class="list-group-item"><div class="d-flex align-items-center justify-content-between"><span>${un}</span><button class="btn btn-success"> Start </button></div></li>`, ""));
    });
  });
}

function HostDropdown(host) {
  $.getJSON(`/hosts/host_detail?host=${host}`, (data) => {
    $("#detail_host_name").html(host);
    $("#host_default_list").html(data.default.reduce((tot, def) => tot + `<li class="list-group-item"><div class="d-flex align-items-center justify-content-between"><span>${def}</span><button class="btn btn-danger"> Stop </button></div></li>`,""));
  });
  GetUnmonitoredSensors();
}


function DrawReadingHistory(reading, interval) {
  if (reading === 'None') {
    reading = $("#detail_reading_name").html();
  }
  $.getJSON(`/sensors/get_data?reading=${reading}&history=${interval}&binning=${binning[interval]}`, data => {
    Highcharts.chart('reading_chart', {
      chart: {
        zoomtype: 'xy',
        height: 'auto',
      },
      title: {text: null},
      credits: {enabled: false},
      series: [{type: 'line', data: data, animation: {duration: 250}}],
      xAxis: {type: 'datetime'},
      yAxis: {title: {text: null}},
      legend: {enabled: false},
      plotOptions: {
        series: {
          color: "#f0ad4e",
          lineWidth: 5,
        }
      },
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
    runmode: $("#runmode").val()
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

