const binning = ['1s', '6s', '10s', '36s', '1m', '2m', '4m', '6m', '14m', '24m', '48m'];
const history = ['10m', '1h', '3h', '6h', '12h', '24h', '48h', '72h', '1w', '2w', '4w'];
var SIG_FIGS=3;
var LOG_THRESHOLD=3;
var control_map = {};
let detail_chart = null;

function Notify(msg, type='success') {
  var elem = $("#notify_" + type)
  elem.children().html(msg);
  var toast = new bootstrap.Toast(elem);
  toast.show();
}

function SensorDropdown(sensor) {
  $("#alarm_low, #alarm_high").change(() => {let low = parseInt($("#alarm_low").val());
    let high = parseInt($("#alarm_high").val());
    $("#alarm_mid").val((high+low)/2); $("#alarm_range").val((high-low)/2);});
  $("#alarm_mid, #alarm_range").change(() => {let mid = parseInt($("#alarm_mid").val());
    let range = parseInt($("#alarm_range").val());
    $("#alarm_low").val(mid-range); $("#alarm_high").val(mid+range);});
  $.getJSON(`/devices/sensor_detail?sensor=${sensor}`, (sensor_detail) => {
    if (Object.keys(sensor_detail).length === 0)
      return;
    let is_int = sensor_detail.is_int===1;
    let roi = $("#readout_interval");
    if(typeof sensor_detail.multi_sensor == "string") {
      roi.attr('disabled', 'disabled');
      $("#readout_command").html('see ' + sensor_detail.multi_sensor);
      $("#sensor_status").bootstrapToggle('readonly');
    } else {
      roi.removeAttr('disabled');
      $("#readout_command").html(sensor_detail.readout_command);
      $("#sensor_status").bootstrapToggle('enable');
    }
    $("#detail_sensor_name").html(sensor_detail.name);
    $("#sensor_desc").val(sensor_detail.description).attr('size', sensor_detail.description.length + 3);
    $("#sensor_status").bootstrapToggle(sensor_detail.status === 'online' ? 'on' : 'off');
    roi.val(sensor_detail.readout_interval);
    $("#sensor_units").val(sensor_detail.units);
    if (typeof sensor_detail.value_xform != 'undefined')
      $("#value_xform").val(sensor_detail.value_xform.join(','));
    else
      $("#value_xform").val("");
    let alarm_vals = sensor_detail.alarm_values;
    $("#int_alarm_body").empty();
    if (is_int) {
      $("#int_alarm_body").show();
      $("#float_alarm_body").hide();
      $("#int_alarm_body").append('<tr><th>Value</th><th>Message</th><th></th>');
      for (let k in alarm_vals) {

        $("#int_alarm_body").append(`<tr><td><input class="form-control-sm" type="number" value="${k}"></td><td><input class="form-control-sm" type="text" value="${alarm_vals[k]}"></td><td><button type="button" class="btn btn-sm btn-primary" onclick="DeleteAlarmLevel(this)">Delete</button></td></tr>`);
      }
      $("#int_alarm_body").append(`<tr><td></td><td></td><td><button type="button" class="btn btn-sm btn-primary" onclick="AddAlarmLevel()">Add</button></td></tr>`);
    } else {
      if (typeof sensor_detail.alarm_thresholds != 'undefined' && sensor_detail.alarm_thresholds.length == 2) {
        $("#int_alarm_body").hide();
        $("#float_alarm_body").show();
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
    $("#make_alarm_button").attr( "onclick", `javascript: MakeAlarm("${sensor_detail.name}", is_int=${is_int});`);
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
          let error_status =  `<span class="badge p-2 bg-${status_color} rounded-circle" data-bs-toggle="tooltip" `+
              `data-bs-placement="right" title="process time: &nbsp; ${doc.rate.toPrecision(3)} ms  \n`+
              `last cycle: &nbsp; ${((now-doc.heartbeat)/1000 || 0).toPrecision(1)} s \n`+
              `last error: &nbsp; ${doc.cycles - doc.error} cycles ago"><span class="visually-hidden">X</span></span></td>`;
          let stop_btn = `<button class="btn btn-danger action_button" onclick="SendToHypervisor('pl_${flavor}', 'pipelinectl_stop ${pl_name}')"> <i class="fas fa-solid fa-stop"></i></button>`;
          let start_btn = `<button class="btn btn-success action_button" onclick="SendToHypervisor('pl_${flavor}', 'pipelinectl_start ${pl_name}')"><i class="fas fa-solid fa-play"></i></button>`;
          let restart_btn = `<button class="btn btn-primary action_button" onclick="SendToHypervisor('pl_${flavor}', 'pipelinectl_restart ${pl_name}')"><i class="fas fa-solid fa-rotate"></i></button>`;
          let silence_btn = `<button class="btn btn-secondary action_button" onclick="SilenceDropdown('${pl_name}')"><i class="fas fa-solid fa-bell-slash"></i></button>`;
          let activate_btn = `<button class="btn btn-success action_button" onclick="SendToHypervisor('pl_${flavor}', 'pipelinectl_active ${pl_name}')"><i class="fas fa-solid fa-play"></i></button>`;
          if ((doc.status === 'active') && ((doc.silent_until == -1) || (doc.silent_until > Date.now()/1000))) {
            $("#pipelines_silenced").append(`<tr><td>${error_status}</td><td>${pl_name}</td><td>`+activate_btn+`</td><td>`+silence_btn+`</td><td>`+stop_btn+`</td><td>`+restart_btn+`</td></tr>`);
          } else if (doc.status === 'active') {
            $("#pipelines_active").append(`<tr><td>${error_status}</td><td>${pl_name}</td><td>`+silence_btn+`</td><td>`+stop_btn+`</td><td>`+restart_btn+`</td></tr>`);
          } else {
            $("#pipelines_inactive").append(`<tr><td>${error_status}</td><td>${pl_name}</td><td>`+start_btn+`</td></tr>`);
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
        let valuemap = sensor_detail.valuemap;
        if (typeof sensor_detail.valuemap !== 'undefined') {
          $("#sensor_states").prop('hidden', false);
          $("#sensor_valve").prop('hidden', true);
          $("#sensor_setpoint").prop('hidden', true);
          $("#sensor_states").empty();
          Object.entries(valuemap).forEach(([state, label]) => {
            $("#sensor_states").append(`<td><button class="btn btn-primary" id="sensor_valve_btn" onclick="ChangeSetpoint(${state})">${label}</button></td>`);
        });
        } else {
          // this is a valve
          $("#sensor_valve").prop('hidden', false);
          $("#sensor_setpoint").prop('hidden', true);
          $("#sensor_states").prop('hidden', true);
          $.getJSON(`/devices/get_last_point?sensor=${sensor_detail.name}`, doc => {
            $("#sensor_valve_btn").text(doc.value == 0 ? "Open" : "Close");
            $("#current_valve_state").html(doc.value);
          });
          control_map[sensor_detail.name].push((sensor_detail.is_normally_open !== undefined));
        }
      } else {
        // this is a setpoint
        $("#sensor_valve").prop('hidden', true);
        $("#sensor_setpoint").prop('hidden', false);
        $("#sensor_states").prop('hidden', true);
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

function AddAlarmLevel(no) {
  $("#int_alarm_body > tr").eq($('#int_alarm_body tr').length-2)
      .after('<tr></tr><td><input class="form-control-sm" type="number"></td>' +
          '<td><input class="form-control-sm" type="text"></td>' +
          '<td><button type="button" class="btn btn-sm btn-primary" onclick="DeleteAlarmLevel(this)">Delete</button></td>' +
          '</tr>');
}

function DeleteAlarmLevel(btn) {
  btn.closest('tr').remove();
}
function MakeAlarm(name, is_int=false) {
  if (typeof name == 'undefined')
    name = $("#detail_sensor_name").html();
  let desc = $("#sensor_desc").val();
  let template = {};
  if (is_int) {
    template = {
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
          type: 'IntegerAlarmNode',
          input_var: name,
          upstream: ['source']
        }
      ]
    };
  } else {
    template = {
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
  }
  $.ajax({
    type: 'POST',
    url: '/pipeline/add_pipeline',
    data: template,
    success: (data) => {if (typeof data.err != 'undefined') alert(data.err); else {Notify(data.notify_msg, data.notify_status);}},
    error: (jqXHR, textStatus, errorCode) => alert(`Error: ${textStatus}, ${errorCode}`),
    complete:  function() {SensorDropdown(name);}
  });
}

function DeviceDropdown(device) {
  $("#device_ctrl_btn").prop("onclick", null).off("click");
  $("#device_manage_btn").prop("onclick", null).off("click");
  $.getJSON(`/devices/device_detail?device=${device}`, (data) => {
    $(".modal").modal('hide');
    if (Object.keys(data).length === 0)
      return;
    $("#detail_device_name").html(data.name);
    $("#device_host").val(data.host).attr('disabled', true);
    $.getJSON(`/hypervisor/device_status?device=${device}`, (doc) => {
      let control_btn = $("#device_ctrl_btn");
      let manage_btn = $("#device_manage_btn");
      if (doc.active === true) {
        control_btn.text("Stop");
        manage_btn.prop('disabled', false);
      } else {
        control_btn.text("Start");
        manage_btn.prop('disabled', true);
      }
      if (doc.managed === true) {
        manage_btn.text("Unmanage");
      } else {
        manage_btn.text("Manage");
      }
      control_btn.click(function() {
        if (doc.active === true) {
          ControlDevice("stop");
        } else {
          ControlDevice(`start ${device}`);
        }
      })
      manage_btn.click(function() {
        if (doc.managed === true) {
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
        $("#device_baud option").filter(function() {return this.value === data.address.baud;}).prop('selected', true);
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
    let t_min = 0, t_max = 0;
    if (data.length !== 0) {
      t_min = data[0][0];
      t_max = Date.now();
    }

    let alarm_low = parseFloat($("#alarm_low").val()), alarm_high = parseFloat($("#alarm_high").val());
    let series = [{name: $("#detail_sensor_name").html(), type: 'line', data: data.filter(row => ((row[0] != null) && (row[1] != null))), animation: {duration: 250}, color: '#0d6efd'}];
    if ($("#plot_alarms").prop('checked')) {
      series.push({name: "lower threshold", type: 'area', data: [[t_min, alarm_low],[t_max, alarm_low]], animation: {duration: 0}, color: '#ff1111', threshold: -Infinity});
      series.push({name: "upper threshold", type: 'area', data: [[t_min, alarm_high],[t_max, alarm_high]], animation: {duration: 0}, color: '#ff1111', threshold: Infinity});
    }

    var lowerbound = null;
    var upperbound = null;

    if ($("#plot_zoom").prop('checked')) {
      var datasorted = display_data.concat();
      datasorted.sort(function(a,b){
        return a[1] - b[1];
      });

      var ymin = datasorted[Math.round(datasorted.length*0.05)][1];
      var ymax = datasorted[Math.round(datasorted.length*0.95)][1];
      var upperbound = ymax + (ymax-ymin)/3;
      var lowerbound = ymin - (ymax-ymin)/3;
    }

    detail_chart = Highcharts.chart('sensor_chart', {
      chart: {
        zoomType: 'x',
        height: '300px',
      },
      title: {text: null},
      credits: {enabled: false},
      series: series,
      xAxis: {type: 'datetime',
              crosshair: true,
              min: t_min,
              max: Date.now(),
              events: {
                afterSetExtremes(e) {
                  const { chart } = e.target;
                  binning = string(int(((e.max-e.min)/1000)/600)) + 's'
                  $.getJSON(`/devices/get_data_from_to?sensor=${sensor}&start=${Math.round(e.min)-1}&stop=${Math.round(e.max)+1}&binning=${binning}`, data => {
                    chart.series[0].setData(data.filter(row => ((row[0] != null) && (row[1] != null))));
                  }
                }
              },
      },
      yAxis: {title: {text: null},
              crosshair: true,
              type: $("#plot_log").is(":checked") ? "logarithmic" : "linear",
              min: lowerbound,
              max: upperbound
      },
      time: {useUTC: false},
      legend: {enabled: false},
      tooltip: {
        //valueDecimals: 3,
        valueSuffix: unit
      },
    });
    $("#last_value").html(SigFigs(series[0].data.at(-1)[1]));

  });
}

function UpdateAlarms() {
  if (!($("#alarm_recurrence").val() && $("#alarm_baselevel").val())) {
    Notify('Please enter sensible values', 'error');
    return;
  }
  let msg = 'Updated alarm for ' + $("#detail_sensor_name").html();
  if ($("#int_alarm_body").find('tr').length) {
    let int_alarm_dict = {};
    $('#int_alarm_body tr').each(function() {
      let k = parseInt($(this).find('td:first-child input').val());
      let v = $(this).find('td:nth-child(2) input').val();
      if (!(typeof k=='undefined') && !(typeof v=='undefined')) {
        int_alarm_dict[k] = v;
      }
    })
    $.ajax({
      type: 'POST',
      url: '/devices/update_alarm',
      data: {
        sensor: $("#detail_sensor_name").html(),
        alarm_values: JSON.stringify(int_alarm_dict),
        recurrence: $("#alarm_recurrence").val(),
        level: $("#alarm_baselevel").val(),
      },
      success: (data) => {
        if (typeof data.err != 'undefined') alert(data.err); else Notify(msg, data.notify_status);},
      error: (jqXHR, textStatus, errorCode) => alert(`Error: ${textStatus}, ${errorCode}`)
    });
  } else {
    if (!($("#alarm_low").val() && $("#alarm_high").val())) {
      Notify('Please enter sensible values', 'error');
      return;
    }
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
        if (typeof data.err != 'undefined') alert(data.err); else Notify(msg, data.notify_status);
      },
      error: (jqXHR, textStatus, errorCode) => alert(`Error: ${textStatus}, ${errorCode}`)
    });
  }
}

function UpdateSensor() {
  let data = {
    sensor: $("#detail_sensor_name").html(),
    readout_interval: $("#readout_interval").val(),
    description: $("#sensor_desc").val(),
    status: $("#sensor_status").is(":checked") ? "online" : 'offline',
    units: $("#sensor_units").val(),
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
      success: (data) => {if (typeof data.err != 'undefined') alert(data.err); else Notify(msg, data.notify_status);},
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

function DeviceCommand(to, cmd) {
  let receiver = to || $("#detail_device_name").html();
  let command = cmd || $("#device_command").val();
  if (receiver && command) {
    SendToHypervisor(receiver, command, 'Command sent');
  }
  $("#device_command").val("");
}

function ToggleValve() {
  let sensor = $("#detail_sensor_name").html();
  let device = control_map[sensor][0];
  let target = control_map[sensor][1];
  let normallyClosed = control_map[sensor][2];
  let state = $("#current_valve_state").html() == normallyClosed ? 1 : 0;
  if (sensor && target && device && confirm(`Confirm valve toggle`)) {
    SendToHypervisor(device, `set ${target} ${state}`, `set ${target} ${state}`);
  }
}

function ChangeSetpoint(value) {
  var sensor = $("#detail_sensor_name").html();
  var device = control_map[sensor][0];
  var target = control_map[sensor][1];
  if (value == undefined) value = $("#sensor_setpoint_control").val();
  if (sensor && target && device && confirm(`Confirm setpoint change to ${value}`)) {
    SendToHypervisor(device, `set ${target} ${value}`, `set ${target} ${value}`);
  }
}

function SilenceDropdown(name) {
  $('#silence_me').html(name);
  $('#silence_dropdown').modal('show');
}

function SilencePipeline(duration) {
  var name = $("#silence_me").html();
  $.ajax({
    type: 'POST',
    url: "/pipeline/pipeline_silence",
    data: {name: name, duration: duration},
    success: (data) => {
      if (typeof data != 'undefined' && typeof data.err != 'undefined')
        alert(data.err);
      else
        $("#silence_dropdown").modal('hide');
        PopulatePipelines();
        Notify(data.notify_msg, data.notify_status);
    },
    error: (jqXHR, textStatus, errorCode) => alert(`Error: ${textStatus}, ${errorCode}`),
  });
}
