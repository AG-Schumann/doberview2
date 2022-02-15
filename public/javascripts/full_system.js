var readings = [];
const role = ['Primary', 'Secondary', 'Alarm duty'];

function PopulateReadings() {
  $.getJSON("/sensors/reading_list", (data) => {
    readings = data;
    //setInterval(UpdateLoop, 5000);
    $("#reading_history").attr('max', history.length);
    $("#reading_binning").attr('max', binning.length);
    UpdateOnce();
  });
}

function GetHosts() {
  $.getJSON(`/hosts/get_hosts`, (data) => {
    $("#host_table").empty();
    $("#host_table").append('<tbody>');
    data.forEach(host => {
      var delta_t = '<td></td><td class="text-secondary">OFFLINE</td>';
      if(host.status === 'online') {
        var seconds = (new Date() - new Date(host.heartbeat)) / 1000;
        if(seconds < 300) {
          var ago_str = seconds.toFixed() + ' seconds ago';
        } else if(seconds < 3600) {
          var ago_str = (seconds / 60).toFixed() + ' minutes ago';
        } else {
          var ago_str = (seconds / 3600).toFixed() + ' hours ago';
        }
        delta_t = '<td class="text-end"><i class="fas fa-heartbeat"></i></td><td>' + ago_str + '</td>'
      }
      var click = `data-bs-toggle="modal" data-bs-target="#hostbox" onclick='HostDropdown("${host.hostname}")'`;
      if(seconds > host.heartbeat_timer) {
        $("#host_table").append(`<tr class="table-danger" ${click}><td>${host.hostname}</td>${delta_t}</tr>`);
      } else {
        $("#host_table").append(`<tr ${click}><td>${host.hostname}</td>${delta_t}</tr>`);
      }
    });
    $("#host_table").append('</tbody>');
  });
}

function PopulateShifters(shift_div){
  var shifter_template = '<div class="row" style="margin-top:10px;"><div style="background-color:#e5e5e5;color:#555;margin-left:5px;margin-right:5px;width:100%;"><strong style="padding-left:10px">{{shift_type}}</strong></div><div class="col-12">{{shifter_name}}</div><div class="col-12"><i class="fa fa-envelope"></i>&nbsp;{{shifter_email}}</div><div class="col-12"><i class="fa fa-phone"></i>&nbsp;{{shifter_phone}}</div></div>';
  var blank_shifts = {"shifter_name": "Nobody",
    "shifter_email": "d.trump@whitehouse.gov",
    "shifter_phone": "867-5309",
  };

  $.getJSON("/shifts/get_current_shifters", function(data){
    var html = data.shifterdocs.reduce((total, entry) => {
      return total + Mustache.render(shifter_template, entry.shifter != 'none' ? entry : blank_shifts);
    }, "");
    if(html != "")
      $('#'+shift_div).html(html);
  });
}

function GetGroupedReadings(group_by) {
  $.getJSON(`/sensors/readings_grouped?group_by=${group_by}`, (data) => {
    $("#reading_table").empty();
    data.forEach(group => {
      if(group_by === 'sensor') {
        GetMonitoringHost(`${group._id}`);
        var click = `data-bs-toggle="modal" data-bs-target="#sensorbox" onclick='SensorDropdown("${group._id}")'`;
        var headline = `<div class="d-flex justify-content-between"><div>${group._id}</div><div id="${group._id}_monitoring_host"></div></div>`;
      } else {
        var click = "";
        var headline = group._id;
      }
      var head = `<thead><tr ${click}><th colspan=2><strong> ${headline} </strong></th></tr></thead><tbody>`;
      $("#reading_table").append(head + group['readings'].reduce((tot, rd) => tot + `\`<tr data-bs-toggle="modal" data-bs-target="#readingbox" onclick="ReadingDropdown('${rd.name}')"><td>${rd.desc} (${rd.name})</td><td class="text-end" id="${rd.name}_status">Loading!</td></tr>`, "") + '</tbody>');
    });
  });
}

function UpdateOnce() {
  readings.forEach(r => {
    $.getJSON(`/sensors/reading_detail?reading=${r}`, (data) => {
      if (data.status === 'online') {
        //$(`#${r}_status`).html(`Online (${data.runmode})`);
        $.getJSON(`/sensors/get_last_point?reading=${r}`, (val) => {
          if (val.value === undefined) {
            $(`#${r}_status`).html(`<div class="text-danger">ERROR</div>`);
          }
          else {
            $(`#${r}_status`).html(`${val.value.toPrecision(4)} (${val.time_ago}s ago)`);
          }
        });
      }
      else {
        $(`#${r}_status`).html(`<div class="text-secondary">OFFLINE</div>`);
      }
    });
  });
}
