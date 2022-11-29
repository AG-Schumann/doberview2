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
  $.getJSON(`/devices/sensor_detail?sensor=${sensor}`, (sensor_detail) => {
    if (Object.keys(sensor_detail).length == 0)
      return;
    if(typeof sensor_detail.multi_sensor == "string") {
      $("#readout_interval").attr('disabled', 'disabled');
      $("#readout_command").html('see ' + sensor_detail.multi_sensor);
    } else {
      $("#readout_interval").removeAttr('disabled');
      $("#readout_command").html(sensor_detail.readout_command);
    }
    $("#detail_sensor_name").html(sensor_detail.name);
    $("#sensor_desc").val(sensor_detail.description).attr('size', sensor_detail.description.length + 3);
    $("#sensor_status").bootstrapToggle(sensor_detail.status === 'online' ? 'on' : 'off');
    $("#readout_interval").val(sensor_detail.readout_interval);
    $("#sensor_units").html(sensor_detail.units);
    if (typeof sensor_detail.value_xform != 'undefined')
      $("#value_xform").val(sensor_detail.value_xform.join(','));
    else
      $("#value_xform").val("");
    let alarm_vals = sensor_detail.alarm_values;
    if (typeof alarm_vals != 'undefined') {
      $("#int_alarm").show();
      $("#float_alarm").hide();
      for (let k in alarm_vals) {
        $("#int_alarm").append(`<tr><td><input class="form-control-sm" type="number" value="${k}"></td><td><input class="form-control-sm" type="text" value="${alarm_vals[k]}"></td><td><button type="button" class="btn btn-sm btn-primary" onclick="DeleteAlarmLevel(this)">Delete</button></td></tr>`);
      }
      $("#int_alarm").append(`<tr><td></td><td></td><td><button type="button" class="btn btn-sm btn-primary" onclick="AddAlarmLevel()">Add</button></td></tr>`);
    } else {
      if (typeof sensor_detail.alarm_thresholds != 'undefined' && sensor_detail.alarm_thresholds.length == 2) {
        $("#int_alarm").hide();
        $("#float_alarm").show();
        $("#alarm_low").val(sensor_detail.alarm_thresholds[0]);
        $("#alarm_high").val(sensor_detail.alarm_thresholds[1]);
        $("#alarm_mid").val((sensor_detail.alarm_thresholds[1] + sensor_detail.alarm_thresholds[0]) / 2);
        $("#alarm_range").val((sensor_detail.alarm_thresholds[1] - sensor_detail.alarm_thresholds[0]) / 2);

      } else {
        $("#alarm_low").val(null);
        $("#alarm_high").val(null);
        $("#alarm_mid").val(null);
        $("#alarm_range").val(null);

      }
    }
    var recurrence = (typeof sensor_detail.alarm_recurrence === 'undefined') ? null : sensor_detail.alarm_recurrence;
    var base_level = (typeof sensor_detail.alarm_level === 'undefined') ? null : sensor_detail.alarm_level;
    $("#alarm_recurrence").val(recurrence);
    $("#alarm_baselevel").val(base_level);
    $("#pipelines_active").empty();
    $("#pipelines_silenced").empty();
    $("#pipelines_inactive").empty();
    $("#make_alarm_button").show();
    if (typeof sensor_detail.pipelines != 'undefined' && sensor_detail.pipelines.length > 0) {
      sensor_detail.pipelines.forEach(pl_name => {
        if (pl_name === 'alarm_' + sensor_detail.name)
          $("#make_alarm_button").hide();
        $.getJSON(`/pipeline/get_pipeline?name=${pl_name}`, doc => {
          if (doc == null) return;
          let now = new Date();
          let flavor = `${pl_name}`.split('_')[0];
          let last_error = doc.cycle - doc.error; // last error X cycles ago
          let status_color = ((last_error < 5) ? 'danger' : 'success');
          if(doc.cycle === 0) status_color = 'secondary' // status indicator grey when pipeline never ran
          let error_status =  `<span class="badge p-2 bg-${status_color} rounded-circle" data-bs-toggle="tooltip"`+
              `data-bs-placement="right" title="process time: &nbsp; ${doc.rate.toPrecision(3)} ms  \n`+
              `last cycle: &nbsp; ${((now-doc.heartbeat)/1000 || 0).toPrecision(1)} s \n`+
              `last error: &nbsp; ${doc.cycles - doc.error} cycles ago"><span class="visually-hidden">X</span></span></td>`;
          let goto_btn = `<button class="btn btn-primary action_button" onclick="location.href='pipeline?pipeline_id=${pl_name}'"> Go to</button>`;
          if (doc.status === 'active') {
            let stop_btn = `<button class="btn btn-danger action_button" onclick="SendToHypervisor('pl_${flavor}', 'pipelinectl_stop ${pl_name}')"><i class="fas fa-solid fa-stop"></i>Stop</button>`;
            $("#pipelines_active").append(`<tr><td>${error_status}</td><td>${pl_name}</td><td>`+stop_btn+`</td><td>`+goto_btn+`</td></tr>`);
          } else if (doc.status === 'silent') {
            $("#pipelines_silenced").append(`<tr><td>${error_status}</td><td>${pl_name}</td><td>`+goto_btn+`</td></tr>`);
          } else {
            let start_btn = `<button class="btn btn-success action_button" onclick="SendToHypervisor('pl_${flavor}', 'pipelinectl_start ${pl_name}')"><i class="fas fa-solid fa-play"></i>Start</button>`;
            $("#pipelines_inactive").append(`<tr><td>${error_status}</td><td>${pl_name}</td><td>`+start_btn+`</td><td>`+goto_btn+`</td></tr>`);
          }
          $('[data-bs-toggle="tooltip"]').tooltip();
        }); // get json
      }); // for each
    }
    $("#sensor_device_name").text(sensor_detail.device).attr('onclick', `DeviceDropdown("${sensor_detail.device}")`);
    if (typeof sensor_detail.control_quantity != 'undefined') {
      control_map[sensor_detail.name] = [sensor_detail.device, sensor_detail.control_quantity];
      $("#sensor_control").css('display', 'inline');
      if (sensor_detail.topic === 'status') {
        // this is a valve
        $("#sensor_valve").prop('hidden', false);
        $("#sensor_setpoint").prop('hidden', true);
        $.getJSON(`/devices/get_last_point?sensor=${sensor_detail.name}`, doc => {
          $("#sensor_valve_btn").text(doc.value == 0 ? "Open" : "Close");
          $("#current_valve_state").html(doc.value);
        });
        control_map[sensor_detail.name].push((sensor_detail.is_normally_open != undefined));
      } else {
        // this is a setpoint
        $("#sensor_valve").prop('hidden', true);
        $("#sensor_setpoint").prop('hidden', false);
        $.getJSON(`/devices/get_last_point?sensor=${sensor_detail.name}`, doc => {
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

function AddAlarmLevel() {
  $("#int_alarm > tr").eq($('#int_alarm tr').length-2)
      .after('<tr></tr><td><input class="form-control-sm" type="number"></td>' +
          '<td><input class="form-control-sm" type="text"></td>' +
          '<td><button type="button" class="btn btn-sm btn-primary" onclick="DeleteAlarmLevel(this)">Delete</button></td>' +
          '</tr>');
}

function DeleteAlarmLevel(btn) {
  btn.closest('tr').remove();
}
function MakeAlarm(name) {
  if (typeof name == 'undefined')
    name = $("#detail_sensor_name").html();
  let desc = $("#sensor_desc").val();
  var template = {
    name: `alarm_${name}`,
    description: desc,
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
  console.log(interval);
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

