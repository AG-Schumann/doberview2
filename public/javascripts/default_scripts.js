const binning = ['1s', '6s', '36s', '1m', '2m', '4m', '6m', '14m', '24m', '48m'];
const history = ['10m', '1h', '6h', '12h', '24h', '48h', '72h', '1w', '2w', '4w'];
var control_map = {};

function SensorDropdown(sensor) {
  $("#alarm_low").change(() => {var low = parseInt($("#alarm_low").val()); var high = parseInt($("#alarm_high").val()); if (low && high) {$("#alarm_mid").val((high+low)/2); $("#alarm_range").val((high-low)/2);}});
  $("#alarm_high").change(() => {var low = parseInt($("#alarm_low").val()); var high = parseInt($("#alarm_high").val()); if (low && high) {$("#alarm_mid").val((high+low)/2); $("#alarm_range").val((high-low)/2);}});
  $("#alarm_mid").change(() => {var mid = parseInt($("#alarm_mid").val()); var range = parseInt($("#alarm_range").val()); if (mid && range) {$("#alarm_low").val(mid-range); $("#alarm_high").val(mid+range);}});
  $("#alarm_range").change(() => {var mid = parseInt($("#alarm_mid").val()); var range = parseInt($("#alarm_range").val()); if (mid && range) {$("#alarm_low").val(mid-range); $("#alarm_high").val(mid+range);}});
  $.getJSON(`/devices/sensor_detail?sensor=${sensor}`, (data) => {
    $("#devicebox").modal('hide');
    if (Object.keys(data).length == 0)
      return;
    $("#detail_sensor_name").html(data.name);
    $("#sensor_desc").val(data.description).attr('size', data.description.length + 3);
    $("#sensor_status").bootstrapToggle(data.status === 'online' ? 'on' : 'off');
    $("#readout_interval").val(data.readout_interval);
    $("#sensor_units").html(data.units);
    $("#readout_command").html(data.readout_command);

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
      $("#plot_alarms").bootstrapToggle('off')
    }

    $("#pipeline_list").empty();
    if (typeof data.pipelines != 'undefined' && data.pipelines.length > 0) {
      data.pipelines.forEach(name => {
        $.getJSON(`/pipeline/status?name=${name}`, doc => {
          if (doc == null) return;
          var cls;
          if (doc.status == 'inactive') {
            cls = 'btn-danger';
          } else if (doc.status == 'silent') {
            cls = 'btn-warning';
          } else {
            cls = 'btn-success';
          }
          $("#pipeline_list").append(`<li><a href="/pipeline?pipeline_id=${name}"><button class="btn ${cls} btn-sm">${name}</button></a></li>`);
          if (name == `alarm_${name}`) {
            $("#plot_alarms").bootstrapToggle(doc.status=='inactive' ? 'off' : 'on')
          }
        }); // get json
      }); // for each
    } else
      $("#pipeline_list").append(`<li><button class="btn btn-primary btn-sm" onclick=MakeAlarm("${data.name}")>Make new alarm</button></li>`);
    $("#sensor_device_name").text(data.device).attr('onclick', `DeviceDropdown("${data.device}")`);
    if (typeof data.control_quantity != 'undefined') {
      control_map[data.name] = [data.device, data.control_quantity];
      $("#sensor_control").css('display', 'inline');
      if (data.topic == 'state') {
        // this is a valve
        $("#sensor_valve").prop('hidden', false);
        $("#sensor_setpoint").prop('hidden', true);
        $.getJSON(`/devices/get_last_point?sensor=${data.name}`, doc => {
          $("#sensor_valve_btn").text(doc.value == 0 ? "Open" : "Close");
          $("#current_valve_state").html(doc.value);
        });
      } else {
        // this is a setpoint
        $("#sensor_valve").prop('hidden', true);
        $("#sensor_setpoint").prop('hidden', false);
        $.getJSON(`/devices/get_last_point?sensor=${data.name}`, doc => {
          $("#sensor_setpoint_control").val(doc.value);
        });
      }
    } else {
      $("#sensor_control").css('display', 'none');
    }
    $('#sensorbox').modal('show');
  });
  DrawSensorHistory(sensor);
}

function MakeAlarm(name) {
  var template = {
    name: `alarm_${name}`,
    node_config: {},
    status: 'inactive',
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
    $("#sensorbox").modal('hide');
    if (Object.keys(data).length == 0)
      return;
    $("#detail_device_name").html(data.name);
    $("#device_host").val(data.host).attr('disabled', true);
    $.getJSON(`/hypervisor/device_status?device=${device}`, (doc) => {
      if (doc.active == true) {
        $("#device_ctrl_btn").text("Stop").click(() => ControlDevice("stop"));
        if (doc.managed == true) {
          $("#device_manage_btn").text("Unmanage").click(() => ManageDevice('unmanage'));
        } else {
          $("#device_manage_btn").text("Manage").click(() => ManageDevice('manage'));
        }
      } else {
        $("#device_ctrl_btn").text("Start").click(() => ControlDevice(`start ${device}`));
      }
    });

    if (typeof data.address != 'undefined') {
      if (typeof data.address.ip != 'undefined') {
        $("#device_ip").val(data.address.ip);
        $("#device_port").val(data.address.port);
        $(".device_eth").attr('hidden', false);
        $(".device_serial").attr('hidden', true);
        $("#device_host").attr('disabled', false);
      } else if (typeof data.address.tty != 'undefined') {
        $("#device_tty").val(data.address.tty);
        $("#device_baud option").filter(function() {return this.value == data.address.baud;}).prop('selected', true);
        $("#device_serial_id").val(data.address.serialID || null);
        $(".device_eth").attr('hidden', true);
        $(".device_serial").attr('hidden', false);
      }
    } else {
      $(".device_eth").attr('hidden', true);
      $(".device_serial").attr('hidden', true);
    }
    $("#device_sensors").empty();
    (data.sensors).forEach(rd => $("#device_sensors").append(`<li style="margin-bottom:10px;"><button class="btn btn-primary btn-sm" onclick="SensorDropdown('${rd}')">${rd}</button></li>`));
    $("#device_listener").html(`${data.dispatch_port}`);
    if (typeof data.commands != 'undefined')
      $("#device_commands_list").html(data.commands.reduce((tot, cmd) => tot + `<li>${cmd.pattern}</li>`,"") || "<li>None</li>");
    else
      $("#device_commands_list").html("<li>None</li>");
    $("#device_command_to").val(data.name);
    $("#devicebox").modal('show');
  });
}

function DrawSensorHistory(sensor) {

  sensor = sensor || $("#detail_sensor_name").html();
  var interval = $("#selectinterval :selected").val();
  $.getJSON(`/devices/get_data?sensor=${sensor}&history=${history[interval]}&binning=${binning[interval]}`, data => {
    if (data.length == 0) {
      console.log('No data?');
      return;
    }
    var t_min = data[0][0], t_max = data[data.length-2][0];
    var alarm_low = parseFloat($("#alarm_low").val()), alarm_high = parseFloat($("#alarm_high").val());
    var series = [{type: 'line', data: data.filter(row => (row[0] && row[1])), animation: {duration: 250}, color: '#0d6efd'}];
    if (alarm_low && alarm_high && $("#plot_alarms").is(":checked")) {
      series.push({type: 'area', data: [[t_min, alarm_low],[t_max, alarm_low]], animation: {duration: 0}, color: '#ff1111', threshold: -Infinity});
      series.push({type: 'area', data: [[t_min, alarm_high],[t_max, alarm_high]], animation: {duration: 0}, color: '#ff1111', threshold: Infinity});
    }
    Highcharts.chart('sensor_chart', {
      chart: {
        zoomtype: 'xy',
        height: '300px',
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

function UpdateAlarms() {
  if ($("#alarm_low").val() && $("#alarm_high").val()) {
    $.ajax({
      type: 'POST',
      url: '/devices/update_alarm',
      data: {
        sensor: $("#detail_sensor_name").html(),
        thresholds: [$("#alarm_low").val(), $("#alarm_high").val()],
        recurrence: $("#alarm_recurrence").val(),
        alarm_level: $("#alarm_baselevel").val()
      },
      success: (data) => {alert(data.err || 'Success');},
      error: (jqXHR, textStatus, errorCode) => alert(`Error: ${textStatus}, ${errorCode}`)
    });
  }
  //$("#sensorbox").modal('hide');
}

function UpdateSensor() {
  $.ajax({
    type: 'POST',
    url: '/devices/update_sensor',
    data: {
      sensor: $("#detail_sensor_name").html(),
      readout_interval: $("#readout_interval").val(),
      description: $("#sensor_desc").val(),
      status: $("#sensor_status").is(":checked") ? "online" : 'offline',
    },
    success: (data) => {if (typeof data.err != 'undefined') alert(data.err);},
    error: (jqXHR, textStatus, errorCode) => alert(`Error: ${textStatus}, ${errorCode}`)
  });
  //$("#sensorbox").modal('hide');
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

function SendToHypervisor(target, command, msg_if_success=null) {
  $.ajax({
    type: 'POST',
    url: 'hypervisor/command',
    data: {target: target, command: command},
    success: (data) => alert(data.err || msg_if_success || "Ok"),
    err: (jqXHR, textStatus, errorCode) => alert(`Error: ${textStatus}, ${errorCode}`)
  });
}

function ControlDevice(action) {
  var device = $("#detail_device_name").html();
  if (device && action) {
    SendToHypervisor(action == 'stop' ? device : 'hypervisor', action, `${action} sent`);
  }
}

function ManageDevice(action) {
  var device = $("#detail_device_name").html();
  if (device && action) {
    SendToHypervisor('hypervisor', `${action} ${device}`, 'Management change confirmed');
  }
}

function CommandDropdown() {
  $.getJSON("/devices/device_list", (data) => {
    $("#command_to").empty();
    $("#command_to").append('<option value="hypervisor">hypervisor</option>');
    data.forEach(sensor => $("#command_to").append(`<option value="sensor">${sensor}</option>`));
  });
  $("#accepted_commands_list").empty();

  $('#commandbox').modal('show');
}

function GetAcceptedCommands(device) {
  $.getJSON(`/devices/device_detail?device=${device}`, (data) => {
    if (typeof data.commands != 'undefined')
      $("#accepted_commands_list").html(data.commands.reduce((tot, cmd) => tot + `<li style='font-family:monospace'>${cmd.pattern}</li>`,"") || "<li>None</li>");
    else
      $("#accepted_commands_list").html("<li>None</li>");
    });
}


function DeviceCommand(to, command) {
  var to = to || $("#detail_device_name").html();
  var command = command || $("#device_command").val();
  if (to && command) {
    SendToHypervisor(to, command, 'Command sent');
  }
}

function ToggleValve() {
  var sensor = $("#detail_sensor_name").html();
  var device = control_map[sensor][0];
  var target = control_map[sensor][1];
  var state = $("#current_valve_state").html() == 0;
  if (sensor && target && device && confirm(`Confirm valve toggle`)) {
    SendToHypervisor(device, `set ${target} ${state}`, 'Confirmed');
  }
}

function ChangeSetpoint() {
  var sensor = $("#detail_sensor_name").html();
  var device = control_map[sensor][0];
  var target = control_map[sensor][1];
  var value = $("#sensor_setpoint_control").val();
  if (sensor && target && device && confirm('Confirm setpoint change')) {
    SendToHypervisor(device, `set ${target} ${value}`, 'Confirmed');
  }
}

