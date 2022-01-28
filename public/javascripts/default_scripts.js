const binning = ['1s', '10s', '1m', '10m', '1h'];
const history = ['10m', '1h', '6h', '12h', '24h', '48h', '72h', '1w', '2w', '4w'];

function SensorDropdown(sensor) {
  $("#alarm_low").change(() => {var low = parseInt($("#alarm_low").val()); var high = parseInt($("#alarm_high").val()); if (low && high) {$("#alarm_mid").val((high+low)/2); $("#alarm_range").val((high-low)/2);}});
  $("#alarm_high").change(() => {var low = parseInt($("#alarm_low").val()); var high = parseInt($("#alarm_high").val()); if (low && high) {$("#alarm_mid").val((high+low)/2); $("#alarm_range").val((high-low)/2);}});
  $("#alarm_mid").change(() => {var mid = parseInt($("#alarm_mid").val()); var range = parseInt($("#alarm_range").val()); if (mid && range) {$("#alarm_low").val(mid-range); $("#alarm_high").val(mid+range);}});
  $("#alarm_range").change(() => {var mid = parseInt($("#alarm_mid").val()); var range = parseInt($("#alarm_range").val()); if (mid && range) {$("#alarm_low").val(mid-range); $("#alarm_high").val(mid+range);}});
  $.getJSON(`/devices/sensor_detail?sensor=${sensor}`, (data) => {
    $("#devicebox").css("display", "none");
    if (Object.keys(data).length == 0)
      return;
    $("#detail_sensor_name").html(data.name);
    $("#sensor_desc").val(data.description).attr('size', data.description.length + 3);
    $("#sensor_status").prop('checked', data.status === 'online');
    $("#readout_interval").val(data.readout_interval);
    $("#sensor_units").html(data.units);

    if (typeof data.alarm_thresholds != 'undefined' && data.alarm_thresholds.length == 2) {
      $("#alarm_low").val(data.alarm_thresholds[0]);
      $("#alarm_high").val(data.alarm_thresholds[1]);
      $("#alarm_mid").val((data.alarm_thresholds[1]+data.alarm_thresholds[0])/2);
      $("#alarm_range").val((data.alarm_thresholds[1]-data.alarm_thresholds[0])/2);
      $("#alarm_recurrence").val(data.alarm_recurrence);
      $("#alarm_baselevel").val(data.alarm_level);
    } else {
      $("#alarm_low").val(null);
      $("#alarm_high").val(null);
      $("#alarm_mid").val(null);
      $("#alarm_range").val(null);
      $("#alarm_recurrence").val(null);
      $("#alarm_baselevel").val(null);
    }

    $("#pipeline_list").empty();
    if (typeof data.pipelines != 'undefined' && data.pipelines.length > 0)
      data.pipelines.forEach(name => $("#pipeline_list").append(`<li><a href="/pipeline?pipeline_id=${name}"><button class="small-button">${name}</button></a></li>`));
    else
      $("#pipeline_list").append(`<li><button class="btn btn-info" onclick=MakeAlarm("${data.name}")>Make new alarm</button></li>`);
    $("#sensor_device_name").text(data.device).attr('onclick', `DeviceDropdown("${data.device}")`);
    $("#sensorbox").css("display", "block");

  });
  DrawSensorHistory(sensor);
}

function MakeAlarm(name) {
  var template = {
    name: `pl_alarm_${name}`,
    node_config: {},
    pipeline: [
      {
        name: 'source',
        type: 'DeviceRespondingAlarm',
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

function DeviceDropdown(device) {
  $.getJSON(`/devices/device_detail?device=${device}`, (data) => {
    $("#sensorbox").css("display", "none");
    if (Object.keys(data).length == 0)
      return;
    $("#detail_device_name").html(data.name);
    $("#device_host").val(data.host).attr('disabled', true);
    $("#detail_device_status").html(data.status);
    if (data.status == 'online') {
      $("#device_ctrl_btn").text("Stop").click(() => ControlDevice("stop"));
    } else if (data.status == 'offline') {
      $("#device_ctrl_btn").text("Start").click(() => ControlDevice("start"));
    } else {
      $("#device_ctrl_btn").text("?").click(() => {});
    }

    if (typeof data.address != 'undefined') {
      if (typeof data.address.ip != 'undefined') {
        $("#device_ip").val(data.address.ip);
        $("#device_port").val(data.address.port);
        $("#device_eth").attr('hidden', false);
        $("#device_serial").attr('hidden', true);
        $("#device_host").attr('disabled', false);
      } else if (typeof data.address.tty != 'undefined') {
        $("#device_tty").val(data.address.tty);
        $("#device_baud option").filter(function() {return this.value == data.address.baud;}).prop('selected', true);
        $("#device_serial_id").val(data.address.serialID || null);
        $("#device_eth").attr('hidden', true);
        $("#device_serial").attr('hidden', false);
      }
    } else {
      $("#device_eth").attr('hidden', true);
      $("#device_serial").attr('hidden', true);
    }
    $("#device_sensors").empty();
    Object.keys(data.readings).forEach(rd => $("#device_sensors").append(`<li><button class="small-button" onclick="SensorDropdown('${rd}')">${rd}</button></li>`));
    $("#device_listener").html(`${data.dispatch_port}`);
    if (typeof data.commands != 'undefined')
      $("#device_commands_list").html(data.commands.reduce((tot, cmd) => tot + `<li>${cmd.pattern}</li>`,"") || "<li>None</li>");
    else
      $("#device_commands_list").html("<li>None</li>");
    $("#devicebox").css("display", "block");
  });
}

function RangeSliders() {
  $("#sensor_binning_label").html(binning[$("#sensor_binning").val()]);
  $("#sensor_history_label").html(history[$("#sensor_history").val()]);
}

function DrawSensorHistory(sensor) {

  sensor = sensor || $("#detail_sensor_name").html();
  var bin_i = $("#sensor_binning").val();
  var hist_i = $("#sensor_history").val();

  $.getJSON(`/devices/get_data?sensor=${sensor}&history=${history[hist_i]}&binning=${binning[bin_i]}`, data => {
    if (data.length == 0) {
      console.log('No data?');
      return;
    }
    var t_min = data[0][0], t_max = data[data.length-2][0];
    var alarm_low = parseFloat($("#alarm_low").val()), alarm_high = parseFloat($("#alarm_high").val());
    var series = [{type: 'line', data: data.filter(row => (row[0] && row[1])), animation: {duration: 250}, color: '#1111ff'}];
    if (alarm_low && alarm_high && $("#plot_alarms").is(":checked")) {
      series.push({type: 'line', data: [[t_min, alarm_low],[t_max, alarm_low]], animation: {duration: 0}, color: '#ff1111', dashStyle: 'Dash'});
      series.push({type: 'line', data: [[t_min, alarm_high],[t_max, alarm_high]], animation: {duration: 0}, color: '#ff1111', dashStyle: 'Dash'});
    }
    Highcharts.chart('sensor_chart', {
      chart: {
        zoomtype: 'xy',
        height: 'auto',
      },
      title: {text: null},
      credits: {enabled: false},
      series: series,
      xAxis: {type: 'datetime'},
      yAxis: {title: {text: null}},
      legend: {enabled: false},
    });
    return;
  });
}

function UpdateSensor() {
  var data = {
    sensor: $("#detail_sensor_name").html(),
    readout_interval: $("#readout_interval").val(),
    description: $("#sensor_desc").val(),
    status: $("#sensor_status").is(":checked") ? "online" : 'offline',
  };
  if ($("#alarm_low").val() && $("#alarm_high").val()) {
    data.alarm = [$("#alarm_low").val(), $("#alarm_high").val()];
    data.alarm_recurrence = $("#alarm_recurrence").val();
  }
  $.ajax({
    type: 'POST',
    url: '/devices/update_sensor',
    data: {data: data},
    success: (data) => {if (typeof data.err != 'undefined') alert(data.err);},
    error: (jqXHR, textStatus, errorCode) => alert(`Error: ${textStatus}, ${errorCode}`)
  });
  $("#sensorbox").css("display", "none");
}

function UpdateDevice() {
  var data = {device: $("#detail_device_name").html()};
  ['ip', 'port', 'tty', 'baud', 'serial_id'].forEach(key => {
    if ($(`#device_${key}`).val())
      data[key] = $(`#device_${key}`).val();
    $(`#device_${key}`).val(null);
  });
  if (Object.keys(data).length > 1) {
    $.ajax({
      type:'POST',
      url: '/devices/update_device_address',
      data: {data: data},
      success: (data) => {if (typeof data.err != 'undefined') alert(data.err);},
      error: (jqXHR, textStatus, errorCode) => alert(`Error: ${textStatus}, ${errorCode}`)
    });
  }
  $("#devicebox").css('display', 'none');
}

function ControlDevice(action) {
  var device = $("#detail_device_name").html();
  if (device && action) {
    $.ajax({
      type: 'POST',
      url: '/hypervisor/command',
      data: {target: action == 'stop' ? device : 'hypervisor', command: action},
      success: (data) => alert(data.err || `${action} sent`),
      err: (jqXHR, textStatus, errorCode) => alert(`Error: ${textStatus}, ${errorCode}`)
    });
  }
}

function DeviceCommand() {
  var device = $("#detail_device_name").html();
  var command = $("#device_commands").val();
  if (device && command) {
    $.ajax({
      type: 'POST',
      url: '/hypervisor/command',
      data: {target: device, command: command},
      success: (data) => alert(data.err || "Command sent"),
      error: (jqXHR, textStatus, errorCode) => alert(`Error: ${textStatus}, ${errorCode}`)
    });
  }
}

