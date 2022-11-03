'use strict';
const binning = ['1s', '6s', '10s', '36s', '1m', '2m', '4m', '6m', '14m', '24m', '48m'];
const history = ['10m', '1h', '3h', '6h', '12h', '24h', '48h', '72h', '1w', '2w', '4w'];
var SIG_FIGS=3;
var LOG_THRESHOLD=3;
var control_map = {};

var detail_chart = null;

function Notify(msg, type='success') {
  var elem = $("#notify_" + type)
  elem.children().html(msg);
  var toast = new bootstrap.Toast(elem);
  toast.show();
}

function SigFigsPlot(ctx) {
  var value = typeof ctx.value == 'string' ? parseFloat(ctx.value) : ctx.value;
  return Math.abs(Math.log10(Math.abs(value))) < LOG_THRESHOLD ? value.toFixed(SIG_FIGS) : value.toExponential(SIG_FIGS);
}

function SensorDropdown(sensor) {
  $("#alarm_low").change(() => {var low = parseInt($("#alarm_low").val()); var high = parseInt($("#alarm_high").val()); if (low && high) {$("#alarm_mid").val((high+low)/2); $("#alarm_range").val((high-low)/2);}});
  $("#alarm_high").change(() => {var low = parseInt($("#alarm_low").val()); var high = parseInt($("#alarm_high").val()); if (low && high) {$("#alarm_mid").val((high+low)/2); $("#alarm_range").val((high-low)/2);}});
  $("#alarm_mid").change(() => {var mid = parseInt($("#alarm_mid").val()); var range = parseInt($("#alarm_range").val()); if (mid && range) {$("#alarm_low").val(mid-range); $("#alarm_high").val(mid+range);}});
  $("#alarm_range").change(() => {var mid = parseInt($("#alarm_mid").val()); var range = parseInt($("#alarm_range").val()); if (mid && range) {$("#alarm_low").val(mid-range); $("#alarm_high").val(mid+range);}});
  $.getJSON(`/devices/sensor_detail?sensor=${sensor}`, (data) => {
    if (Object.keys(data).length == 0)
      return;
    if(typeof data.multi_sensor == "string") {
      $("#readout_interval").attr('disabled', 'disabled');
      $("#readout_command").html('see ' + data.multi_sensor);
    } else {
      $("#readout_interval").removeAttr('disabled');
      $("#readout_command").html(data.readout_command);
    }
    $("#detail_sensor_name").html(data.name);
    $("#sensor_desc").val(data.description).attr('size', data.description.length + 3);
    $("#sensor_status").bootstrapToggle(data.status === 'online' ? 'on' : 'off');
    $("#readout_interval").val(data.readout_interval);
    $("#sensor_units").html(data.units);
    if (typeof data.value_xform != 'undefined')
      $("#value_xform").val(data.value_xform.join(','));
    else
      $("#value_xform").val("");

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
    $("#pipeline_list").append(`<li><button class="btn btn-primary btn-sm" onclick=MakeAlarm("${data.name}")>Make new alarm</button></li>`);
      data.pipelines.forEach(name => {
        $.getJSON(`/pipeline/status?name=${name}`, doc => {
          if (doc == null) return;
          var cls;
          if (doc.status == 'inactive') {
            cls = 'btn-secondary';
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
      if (data.topic == 'status') {
        // this is a valve
        $("#sensor_valve").prop('hidden', false);
        $("#sensor_setpoint").prop('hidden', true);
        $.getJSON(`/devices/get_last_point?sensor=${data.name}`, doc => {
          $("#sensor_valve_btn").text(doc.value == 0 ? "Open" : "Close");
          $("#current_valve_state").html(doc.value);
        });
        control_map[data.name].push((data.is_normally_open != undefined));
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
    DrawSensorHistory(sensor);
    $('#sensorbox').modal('show');
  });
}

function MakeAlarm(name) {
  var template = {
    name: `alarm_${name}`,
    node_config: {},
    status: 'inactive',
    pipeline: [
      {
        name: 'source',
        type: 'DeviceRespondingInfluxNode',
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
  $.ajax({
    type: 'POST',
    url: '/pipeline/add_pipeline',
    data: template,
    success: (data) => {if (typeof data.err != 'undefined') alert(data.err); else {Notify(data.notify_msg, data.notify_status);}},
    error: (jqXHR, textStatus, errorCode) => alert(`Error: ${textStatus}, ${errorCode}`),
    complete:  function(data) {SensorDropdown(name);}
  });
}

function DeviceDropdown(device) {
  $("#device_ctrl_btn").prop("onclick", null).off("click");
  $("#device_manage_btn").prop("onclick", null).off("click");
  $.getJSON(`/devices/device_detail?device=${device}`, (data) => {
    $(".modal").modal('hide');
    if (Object.keys(data).length == 0)
      return;
    $("#detail_device_name").html(data.name);
    $("#device_host").val(data.host).attr('disabled', true);
    $.getJSON(`/hypervisor/device_status?device=${device}`, (doc) => {
      if (doc.active == true) {
        $("#device_ctrl_btn").text("Stop");
        $("#device_manage_btn").prop('disabled', false);
      } else {
        $("#device_ctrl_btn").text("Start");
        $("#device_manage_btn").prop('disabled', true);
      }
      if (doc.managed == true) {
        $("#device_manage_btn").text("Unmanage");
      } else {
        $("#device_manage_btn").text("Manage");
      }
      $("#device_ctrl_btn").click(function() {
        if (doc.active == true) {
          ControlDevice("stop");
        } else {
          ControlDevice(`start ${device}`);
        }
      })
      $("#device_manage_btn").click(function() {
        if (doc.managed == true) {
          ManageDevice('unmanage');
        } else {
          ManageDevice('manage');
        }
      })
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
    var sensor_list = data.sensors;
    if (data.multi)
        sensor_list = data.multi;
    sensor_list.forEach(rd => $("#device_sensors").append(`<li style="margin-bottom:10px;"><button class="btn btn-primary btn-sm" onclick="SensorDropdown('${rd}')">${rd}</button></li>`));
    $("#device_sensors").append('<li style="margin-bottom:10px;"><button class="btn btn-primary btn-sm" onclick="PopulateNewSensor()">Add new!</button></li>');
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
  var unit = $("#sensor_units").html();
  var interval = $("#selectinterval :selected").val();
  $.getJSON(`/devices/get_data?sensor=${sensor}&history=${history[interval]}&binning=${binning[interval]}`, data => {
    if (data.length == 0)
      var t_min = 0, t_max = 0;
    else
      var t_min = data[0][0], t_max = data[data.length-2][0];
    var alarm_low = parseFloat($("#alarm_low").val()), alarm_high = parseFloat($("#alarm_high").val());
    var series = [{name: $("#detail_sensor_name").html(), type: 'line', data: data.filter(row => ((row[0] != null) && (row[1] != null))), animation: {duration: 250}, color: '#0d6efd'}];
    if ($("#plot_alarms").prop('checked')) {
      series.push({name: "lower threshold", type: 'area', data: [[t_min, alarm_low],[t_max, alarm_low]], animation: {duration: 0}, color: '#ff1111', threshold: -Infinity});
      series.push({name: "upper threshold", type: 'area', data: [[t_min, alarm_high],[t_max, alarm_high]], animation: {duration: 0}, color: '#ff1111', threshold: Infinity});
    }
    detail_chart = Highcharts.chart('sensor_chart', {
      chart: {
        zoomType: 'xy',
        height: '300px',
      },
      title: {text: null},
      credits: {enabled: false},
      series: series,
      xAxis: {type: 'datetime',
              crosshair: true,
              max: Date.now()},
      yAxis: {title: {text: null},
              crosshair: true,
              //labels: {//format: '{value:.3f}',
              //        formatter: SigFigsPlot},
              type: $("#plot_log").is(":checked") ? "logarithmic" : "linear",
              },
      time: {useUTC: false},
      legend: {enabled: false},
      tooltip: {
        //valueDecimals: 3,
        valueSuffix: unit
      },
    });
    $("#last_value").html(SigFigs(series[0].data.at(-1)[1]));
    return;
  });
}

function UpdateAlarms() {
  if (!($("#alarm_low").val() && $("#alarm_high").val() && $("#alarm_recurrence").val() && $("#alarm_baselevel").val())) {
    Notify('Please enter sensible values', 'error');
    return;
  }
  var msg = 'Updated alarm for ' + $("#detail_sensor_name").html();
  $.ajax({
    type: 'POST',
    url: '/devices/update_alarm',
    data: {
      sensor: $("#detail_sensor_name").html(),
      thresholds: [$("#alarm_low").val(), $("#alarm_high").val()],
      recurrence: $("#alarm_recurrence").val(),
      level: $("#alarm_baselevel").val(),
    },
    success: (data) => {
      if (typeof data.err != 'undefined') alert(data.err); else Notify(data.notify_msg, data.notify_status);},
    error: (jqXHR, textStatus, errorCode) => alert(`Error: ${textStatus}, ${errorCode}`)
  });
}

function UpdateSensor() {
  var data = {
    sensor: $("#detail_sensor_name").html(),
    readout_interval: $("#readout_interval").val(),
    description: $("#sensor_desc").val(),
    status: $("#sensor_status").is(":checked") ? "online" : 'offline',
  };
  if ($("#value_xform").val() != "") {
    var xform;
    try {
      xform = $("#value_xform").val().split(',').map(parseFloat);
    } catch(error) {
      alert(error);
      return;
    }
    if (xform.length < 2) {
      Notify('Invalid value transform', 'error');
      return;
    }
    data.value_xform = $("#value_xform").val();
  }
  var msg = 'Updated general info of ' + data['sensor'];
  $.ajax({
    type: 'POST',
    url: '/devices/update_sensor',
    data: data,
    success: (data) => {
      if (typeof data.err != 'undefined') alert(data.err); else Notify(data.notify_msg, data.notify_status);},
    error: (jqXHR, textStatus, errorCode) => alert(`Error: ${textStatus}, ${errorCode}`)
  });
}

function UpdateDevice() {
  var data = {device: $("#detail_device_name").html()};
  ['ip', 'port', 'tty', 'baud', 'serial_id'].forEach(key => {
    if ($(`#device_${key}`).val())
      data[key] = $(`#device_${key}`).val();
    $(`#device_${key}`).val(null);
  });
  var msg = 'Updated device ' + $("#detail_device_name").html();
  if (Object.keys(data).length > 1) {
    $.ajax({
      type:'POST',
      url: '/devices/update_device_address',
      data: {data: data},
      success: (data) => {if (typeof data.err != 'undefined') alert(data.err); else Notify(data.notify_msg, data.notify_status);},
      error: (jqXHR, textStatus, errorCode) => alert(`Error: ${textStatus}, ${errorCode}`)
    });
  }
}

function PopulateNewSensor() {
  $.getJSON('/devices/params', doc => {
    $("#new_subsystem").empty();
    doc.subsystems.forEach(ss => {var s = ss.split('_'); s[0] = s[0][0].toUpperCase() + s[0].slice(1); $("#new_subsystem").append(`<option value="${ss}">${s.join(' ')}</option>`)});
    $("#new_topic").empty();
    doc.topics.forEach(topic => $("#new_topic").append(`<option value="${topic}">${topic}</option>`));
  });
  $.getJSON('/devices/device_list', devs => {
    $("#new_device").empty();
    devs.forEach(dev => $("#new_device").append(`<option value="${dev}">${dev}</option>`));
  });
  $(".modal").modal('hide');
  $("#newsensor").modal('show');
}

function ValidateNewSensor(echo_ret=true) {
  if ($("#new_description").val().length < 5) {
    Notify('Please enter a useful description', 'error');
    return false;
  }
  if ($("#new_readout_interval").val() < 0.1) {
    Notify('Please enter a sensible readout interval', 'error');
    return false;
  }
  if ($("#new_topic").val() != 'status' && $("#new_units").val() == "") {
    Notify('Please enter sensible units', 'error');
    return false;
  }
  if ($("#new_readout_command").val() == "") {
    Notify('Please enter a valid readout command', 'error');
    return false;
  }
  if ($("#new_value_xform").val() != "") {
    try {
      var a = $("#new_value_xform").val().split(',').map(parseFloat);
    } catch(error) {
      Notify('Invalid value transform', 'error');
      return false;
    }
    if (a.length < 2) {
      Notify('Invalid value transform', 'error');
      return false;
    }
  }
  if ($("#new_topic").val() == 'status' && !$("#new_integer").is(':checked')) {
    if (confirm("Is this an integer quantity?")) {
      $("#new_integer").val(1);
    } else {

    }
  }
  if ($("#new_integer").is(":checked") && $("#new_topic").val() != 'status') {
    Notify($("#new_topic").val() + " doesn't come in integers", 'error');
    return false;
  }
  if (echo_ret)
    Notify('Looks good');
  return true;
}

function SubmitNewSensor() {
  if (ValidateNewSensor(false)) {
    var device = $("#new_device").val();
    var data =  {
        subsystem: $("#new_subsystem").val(),
        topic: $("#new_topic").val(),
        device: device,
        description: $("#new_description").val(),
        readout_interval: $("#new_readout_interval").val(),
        units: $("#new_units").val() || "",
        readout_command: $("#new_readout_command").val(),
        pipelines: [],
        value_xform: $("new_value_xform").val(),
        subscribers: [],
    };
    if ($("#new_integer").is(":checked"))
        data.is_int = 1;
    if ($("#new_control").val())
      data.control_quantity = $("#new_control").val();
    $.ajax({
      url: '/devices/new_sensor',
      type: 'POST',
      data: data,
      success: (data) => {
        if (typeof data.err != 'undefined') {
          alert(data.err);
          return;
        }
        if (confirm(`New sensor name: ${data.name}. Start now?`)) {
          SendToHypervisor(device, 'stop');
          SendToHypervisor('hypervisor', `start ${device}`, null, 10000);
        }
      },
      error: (jqXHR, textStatus, errorCode) => alert(`Error: ${textStatus}, ${errorCode}`)
    });
    ['subsystem', 'topic', 'device', 'description', 'readout_interval', 'units', 'readout_command', 'value_xform'].forEach(v => $(`#new_${v}`).val(""));
  }
}

function SendToHypervisor(target, command, msg_if_success=null, delay=0) {
  var msg = msg_if_success == null ? command + " sent to Hypervisor" : msg_if_success;
  $.ajax({
    type: 'POST',
    url: '/hypervisor/command',
    data: {target: target, command: command, delay: delay},
    success: (data) => {if (typeof data.err != 'undefined') alert(data.err); else Notify(data.notify_msg, data.notify_status);},
    error: (jqXHR, textStatus, errorCode) => alert(`Error: ${textStatus}, ${errorCode}`)
  });
}

function ControlDevice(action) {
  var device = $("#detail_device_name").html();
  if (device && action) {
    SendToHypervisor(action == 'stop' ? device : 'hypervisor', action, `${action} sent to ${device}`);
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
    data.forEach(sensor => $("#command_to").append(`<option value="${sensor}">${sensor}</option>`));
    ['pl_alarm', 'pl_control', 'pl_convert'].forEach(pl => $("#command_to").append(`<option value="${pl}">${pl}</option>`));
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
  $("#device_command").val("");
}

function ToggleValve() {
  var sensor = $("#detail_sensor_name").html();
  var device = control_map[sensor][0];
  var target = control_map[sensor][1];
  var normallyClosed = control_map[sensor][2];
  var state = $("#current_valve_state").html() == normallyClosed ? 1 : 0;
  if (sensor && target && device && confirm(`Confirm valve toggle`)) {
    SendToHypervisor(device, `set ${target} ${state}`, `set ${target} ${state}`);
  }
}

function ChangeSetpoint() {
  var sensor = $("#detail_sensor_name").html();
  var device = control_map[sensor][0];
  var target = control_map[sensor][1];
  var value = $("#sensor_setpoint_control").val();
  if (sensor && target && device && confirm('Confirm setpoint change')) {
    SendToHypervisor(device, `set ${target} ${value}`, `set ${target} ${value}`);
  }
}

