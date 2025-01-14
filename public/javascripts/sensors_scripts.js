// Settings:
const SIG_FIGS = 3;
const LOG_THRESHOLD = 3;
//console.log('Change the number formatting by with the SIG_FIGS and LOG_THRESHOLD variables')
console.log(`The following configuration settings can be changed by setting the corresponding variable.
  e.g. SIG_FIGS = 4;
  SIG_FIGS (default ${SIG_FIGS}): significant figures to display
  LOG_THRESHOLD (default ${LOG_THRESHOLD}): use scientific notation when absolute exponent is larger than this number
`);

const binning = ['1s', '6s', '10s', '36s', '1m', '2m', '4m', '6m', '14m', '24m', '48m'];
const history = ['10m', '1h', '3h', '6h', '12h', '24h', '48h', '72h', '1w', '2w', '4w'];
const control_map = {};
let detail_chart = null;


function PopulateSensorsNavbar() {
  var content = '<li class="nav-item"> <button class="btn btn-primary" onclick="PopulateNewSensor()">' +
      '<span>Add sensor &nbsp<i class="fas fa-solid fa-plus"></i><i class="fas fa-solid fa-thermometer"></i></span>' +
      '</button></li>' +
      '<li class="nav-item"><div class="d-flex"><div class="navbar-text">&nbsp; Group by: &nbsp;</div>' +
      '<div class="btn-group" id="sensor_grouping" role="group" onchange="UpdateSensorTableOnce(regoup=true)"> ' +
      '<input class="btn-check" id="groupSubsystem" type="radio" name="btnradio" value="subsystem" checked=""> ' +
      '<label class="btn btn-outline-primary" for="groupSubsystem">Subsystem</label> ' +
      '<input class="btn-check" id="groupSensor" type="radio" name="btnradio" value="device"> ' +
      '<label class="btn btn-outline-primary" for="groupSensor">Device</label>' +
      '<input class="btn-check" id="groupTopic" type="radio" name="btnradio" value="topic"> ' +
      '<label class="btn btn-outline-primary" for="groupTopic">Topic</label></div></div></li>' +
      '<li class="nav-item">' +
      '<div class="nav-item dropdown"><a class="nav-link dropdown-toggle" data-bs-toggle="dropdown" href="#" role="button">Jump to</a> ' +
      '<ul class="dropdown-menu" id="jump_to_list" style="max-height:80vh; overflow-y:scroll;"></ul></div></li>' +
      '<li class="nav-item">' +
      '<div class="input-group pe-3" style="min-width:205px"><span class="input-group-text"><i class="fas fa-solid fa-magnifying-glass"></i>' +
      '</span> <input class="form-control" id="searchSensorInput" type="text" onkeyup="FilterSensors()" placeholder="Search sensor"/> ' +
      '<button class="btn bg-transparent" type="button" style="margin-left: -40px; z-index: 100;" onclick="$(`#searchSensorInput`).val(``); FilterSensors();">' +
      '<i class="fa fa-times"></i></button></div></li>';
  $('#navbar_content').prepend(content);
}

function UpdateSensorTableOnce(regroup = false) {
  console.log('UpdateSensorTableOnce');
  if (regroup) $('#sensor_table').html('<thead><tr><th colspan=2>Loading...</th></tr></thead>');
  const group_by = $('#sensor_grouping input:radio:checked').val();
  $.when(
      $.getJSON('/sensors/get_last_points'),
      $.getJSON(`/sensors/grouped?group_by=${group_by}`)
  ).done((data, sensors_grouped) => {
    if (regroup) {
      $("#sensor_table").empty();
      $("#jump_to_list").empty();
    }
    sensors_grouped[0].forEach(group => {
      if (regroup) {
        const click = group_by === 'device' ? `onclick='DeviceDropdown("${group._id}")'` : "";
        $("#sensor_table").append(`
            <thead id=${group._id}><tr ${click}><th colspan=2> ${group._id}</th></tr></thead>
            <tbody id="${group._id}_tbody"></tbody>
        `);
        $("#jump_to_list").append(`<li><a class="dropdown-item py-2" href="#${group._id}">${group._id}</a></li>`);
      }
      group['sensors'].forEach(doc => {
        // Add table row if sensor new
        let name = doc.name;
        let status = $(`#${name}_status`);
        if (!status.length)
          $(`#${group._id}_tbody`).append(`
            <tr>
              <td id="${name}_desc" onclick="SensorDropdown('${name}')">Loading!</td>
              <td id="${name}_status">Loading!</td>
            </tr>
          `);
        $(`#${name}_desc`).html(`${doc.desc} (${name})`);
        let new_status = 'No recent data';
        const last_point = data[0][name];
        if (last_point && (last_point.value)) {
          const display_value = (doc.valuemap === undefined) ? SigFigs(last_point.value) : doc.valuemap[parseInt(last_point.value)];
          new_status = `${display_value} ${doc.units} (${FormatTimeSince(last_point.time_ago)} ago)`;
        }
        if (doc.status === 'offline') {
          if (new_status.slice(-1) === ')')
            new_status = new_status.slice(0, -1) + ', ';
          else
            new_status += ' (';
          new_status += 'offline)';
        }
        $(`#${name}_status`).html(new_status);
      });
    });
  });
}

function SigFigs(val) {
  if (typeof(val) == "number" || val.includes('.') ) {
    // value is float
    val = parseFloat(val);
    return Math.abs(Math.log10(Math.abs(val))) < LOG_THRESHOLD ? val.toPrecision(SIG_FIGS) : val.toExponential(SIG_FIGS-1);
  }
  return val;
}

function SensorDropdown(sensor) {
  $("#alarm_low, #alarm_high").change(() => {let low = parseInt($("#alarm_low").val());
    let high = parseInt($("#alarm_high").val());
    $("#alarm_mid").val((high+low)/2); $("#alarm_range").val((high-low)/2);});
  $("#alarm_mid, #alarm_range").change(() => {let mid = parseInt($("#alarm_mid").val());
    let range = parseInt($("#alarm_range").val());
    $("#alarm_low").val(mid-range); $("#alarm_high").val(mid+range);});
  $.getJSON(`/sensors/detail?sensor=${sensor}`, (sensor_detail) => {
    if (Object.keys(sensor_detail).length === 0)
      return;
    let is_int = sensor_detail.is_int===1;
    let roi = $("#readout_interval");
    let sensor_status = $("#sensor_status");
    if(typeof sensor_detail.multi_sensor == "string") {
      roi.attr('disabled', 'disabled');
      $("#readout_command").html('see ' + sensor_detail.multi_sensor);
      sensor_status.bootstrapToggle('readonly');
    } else {
      roi.removeAttr('disabled');
      $("#readout_command").html(sensor_detail.readout_command);
      sensor_status.bootstrapToggle('enable');
    }
    $("#detail_sensor_name").html(sensor_detail.name);
    $("#sensor_desc").val(sensor_detail.description).attr('size', sensor_detail.description.length + 3);
    sensor_status.bootstrapToggle(sensor_detail.status === 'online' ? 'on' : 'off');
    roi.val(sensor_detail.readout_interval);
    $("#sensor_units").val(sensor_detail.units);
    if (typeof sensor_detail.value_xform != 'undefined')
      $("#value_xform").val(sensor_detail.value_xform.join(','));
    else
      $("#value_xform").val("");
    let alarm_vals = sensor_detail.alarm_values;
    const int_alarm_body = $("#int_alarm_body");
    const float_alarm_body = $("#float_alarm_body");
    int_alarm_body.empty();
    if (is_int) {
      int_alarm_body.show();
      float_alarm_body.hide();
      int_alarm_body.append('<tr><th>Value</th><th>Message</th><th></th>');
      for (let k in alarm_vals) {

        int_alarm_body.append(`<tr><td><input class="form-control-sm" type="number" value="${k}"></td><td><input class="form-control-sm" type="text" value="${alarm_vals[k]}"></td><td><button type="button" class="btn btn-sm btn-primary" onclick="DeleteAlarmLevel(this)">Delete</button></td></tr>`);
      }
      int_alarm_body.append(`<tr><td></td><td></td><td><button type="button" class="btn btn-sm btn-primary" onclick="AddAlarmLevel()">Add</button></td></tr>`);
    } else {
      if (typeof sensor_detail.alarm_thresholds != 'undefined' && sensor_detail.alarm_thresholds.length === 2) {
        int_alarm_body.hide();
        float_alarm_body.show();
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
    $("#make_alarm_button").show().attr( "onclick", `javascript: MakeAlarm("${sensor_detail.name}", is_int=${is_int});`);
    if (typeof sensor_detail.pipelines != 'undefined' && sensor_detail.pipelines.length > 0) {
      sensor_detail.pipelines.forEach(pl_name => {
        if (pl_name === 'alarm_' + sensor_detail.name)
          $("#make_alarm_button").hide();
        $.getJSON(`/pipelines/get?name=${pl_name}`, doc => {
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
          if ((doc.status === 'active') && ((doc.silent_until === -1) || (doc.silent_until > Date.now()/1000))) {
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
      let states = $("#sensor_states");
      if (sensor_detail.topic === 'status') {
        states.prop('hidden', false);
        $("#sensor_setpoint").prop('hidden', true);
        states.empty();
        let valuemap = sensor_detail.valuemap;
        if (typeof valuemap == 'undefined') {
          states.html('No value map defined!');
          valuemap = {};
        }
        Object.entries(valuemap).forEach(([state, label]) => {
          states.append(`<td><button class="btn btn-primary" id="sensor_valve_btn" onclick="ChangeSetpoint(${state})">${label}</button></td>`);
        });
      } else {
        // this is a setpoint
        $("#sensor_setpoint").prop('hidden', false);
        states.prop('hidden', true);
        $.getJSON(`/sensors/get_last_point?sensor=${sensor_detail.name}`, doc => {
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
  let template;
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
    url: '/pipelines/add',
    data: template,
    success: (data) => {if (typeof data.err != 'undefined') alert(data.err); else {Notify(data.notify_msg, data.notify_status);}},
    error: (jqXHR, textStatus, errorCode) => alert(`Error: ${textStatus}, ${errorCode}`),
  });
}

function FormatTimeSince(seconds) {
  v = parseFloat(seconds);
  if (v < 10)
    // For small numbers of seconds go down to tenths
    return v.toFixed(1) + 's';
  else if (v < 120)
    return v.toFixed(0) + 's';
  else if (v < 2 * 60 * 60)
    return (v / 60).toFixed(0) + 'm';
  else
    return (v / 60 / 60).toFixed(0) + 'h';
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

function DrawSensorHistory(sensor) {
  sensor = sensor || $("#detail_sensor_name").html();
  var unit = $("#sensor_units").html();
  var interval = $("#selectinterval :selected").val();
  $.getJSON(`/sensors/get_data?sensor=${sensor}&history=${history[interval]}&binning=${binning[interval]}`, data => {
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
      var datasorted = data.concat();
      datasorted.sort(function(a,b){
        return a[1] - b[1];
      });

      var ymin = datasorted[Math.round(datasorted.length*0.05)][1];
      var ymax = datasorted[Math.round(datasorted.length*0.95)][1];
      upperbound = ymax + (ymax-ymin)/3;
      lowerbound = ymin - (ymax-ymin)/3;
    }
    const currentTheme = $(':root').attr('data-bs-theme');
    const bkg_color = ((currentTheme === 'light') ? "#ffffff" : "#212529")
    detail_chart = Highcharts.chart('sensor_chart', {
      chart: {
        zoomType: 'xy',
        height: '300px',
        backgroundColor: bkg_color,
      },
      title: {text: null},
      credits: {enabled: false},
      series: series,
      xAxis: {type: 'datetime',
        crosshair: true,
        min: t_min,
        max: Date.now()},
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
  let recurrence = $("#alarm_recurrence").val();
  let base_level = $("#alarm_baselevel").val();
  if (!recurrence && base_level) {
    Notify('Please enter sensible values', 'error');
    return;
  }
  let name = $("#detail_sensor_name").html();
  let msg = `Updated alarm for ${name}`;
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
      url: '/sensors/update_alarm',
      data: {
        sensor: name,
        alarm_values: JSON.stringify(int_alarm_dict),
        recurrence: recurrence,
        level: base_level,
      },
      success: (data) => {
        if (typeof data.err != 'undefined') alert(data.err); else Notify(msg, data.notify_status);},
      error: (jqXHR, textStatus, errorCode) => alert(`Error: ${textStatus}, ${errorCode}`)
    });
  } else {
    let low = parseFloat($("#alarm_low").val());
    let high = parseFloat($("#alarm_high").val());
    if (!(low && high)) {
      Notify('Please enter sensible values', 'error');
      return;
    }
    $.ajax({
      type: 'POST',
      url: '/sensors/update_alarm',
      data: {
        sensor: name,
        thresholds: [low, high],
        recurrence: recurrence,
        level: base_level,
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
  const value_transform = $("#value_xform").val();
  if (value_transform !== "") {
    var xform;
    try {
      xform = value_transform.split(',').map(parseFloat);
    } catch(error) {
      alert(error);
      return;
    }
    if (xform.length < 2) {
      Notify('Invalid value transform', 'error');
      return;
    }
    data.value_xform = value_transform;
  }
  $.ajax({
    type: 'POST',
    url: '/sensors/update',
    data: data,
    success: (data) => {
      if (typeof data.err != 'undefined') alert(data.err); else Notify(data.notify_msg, data.notify_status);},
    error: (jqXHR, textStatus, errorCode) => alert(`Error: ${textStatus}, ${errorCode}`)
  });
}

function PopulateNewSensor() {
  $.getJSON('/sensors/params', doc => {
    $("#new_subsystem").empty();
    doc.subsystems.forEach(ss => {
      const s = ss.split('_');
      s[0] = s[0][0].toUpperCase() + s[0].slice(1);
      $("#new_subsystem").append(`<option value="${ss}">${s.join(' ')}</option>`)});
    const new_topic = $("#new_topic");
    new_topic.empty();
    doc.topics.forEach(topic => new_topic.append(`<option value="${topic}">${topic}</option>`));
  });
  $.getJSON('/devices/list', devs => {
    let new_device = $("#new_device");
    new_device.empty();
    devs.forEach(dev => new_device.append(`<option value="${dev}">${dev}</option>`));
  });
  $(".modal").modal('hide');
  $("#new_sensor").modal('show');
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
  const new_topic = $("#new_topic").val();
  if (new_topic !== 'status' && $("#new_units").val() === "") {
    Notify('Please enter sensible units', 'error');
    return false;
  }
  if ($("#new_readout_command").val() === "") {
    Notify('Please enter a valid readout command', 'error');
    return false;
  }
  const new_transform = $("#new_value_xform").val();
  if (new_transform !== "") {
    try {
      var a = new_transform.split(',').map(parseFloat);
    } catch(error) {
      Notify('Invalid value transform', 'error');
      return false;
    }
    if (a.length < 2) {
      Notify('Invalid value transform', 'error');
      return false;
    }
  }
  let new_integer = $("#new_integer");
  if (new_topic === 'status' && !new_integer.is(':checked')) {
    if (confirm("Is this an integer quantity?")) {
      new_integer.val(1);
    }
  }
  if (new_integer.is(":checked") && new_topic !== 'status') {
    Notify(new_topic + " doesn't come in integers", 'error');
    return false;
  }
  if (echo_ret)
    Notify('Looks good');
  return true;
}

function SubmitNewSensor() {
  if (ValidateNewSensor(false)) {
    const device = $("#new_device").val();
    const data = {
      subsystem: $("#new_subsystem").val(),
      topic: $("#new_topic").val(),
      device: device,
      description: $("#new_description").val(),
      readout_interval: $("#new_readout_interval").val(),
      units: $("#new_units").val() || "",
      readout_command: $("#new_readout_command").val(),
      pipelines: [],
      value_xform: $("#new_value_xform").val(),
      subscribers: [],
    };
    if ($("#new_integer").is(":checked"))
      data.is_int = 1;
    const new_control_val = $("#new_control").val();
    if (new_control_val)
      data.control_quantity = new_control_val;
    $.ajax({
      url: '/sensors/new',
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

function FilterSensors() {
  var filter = $("#searchSensorInput").val().replace(/_/g, '').toUpperCase();
  var tr = $("#sensor_table").find("tr");
  for (var i = 0; i < tr.length; i++) {
    var sensor_name = tr[i].getElementsByTagName("td")[0];
    if (sensor_name) {
      var txtValue = (sensor_name.textContent || sensor_name.innerText).replace(/_/g, '').toUpperCase();
      if (txtValue.indexOf(filter) > -1) {
        tr[i].style.display = "";
      } else {
        tr[i].style.display = "none";
      }
    }
  }
}