// Settings:
var SIG_FIGS = 3;
var LOG_THRESHOLD = 3;
//console.log('Change the number formatting by with the SIG_FIGS and LOG_THRESHOLD variables')
console.log(`The following configuration settings can be changed by setting the corresponding variable.
  e.g. SIG_FIGS = 4;
  SIG_FIGS (default ${SIG_FIGS}): significant figures to display
  LOG_THRESHOLD (default ${LOG_THRESHOLD}): use scientific notation when absolute exponent is larger than this number
`);

function PopulateNavbar() {
  var content = '<li class="nav-item"> <button class="btn btn-primary" onclick="PopulateNewSensor()">' +
      '<span>Add sensor &nbsp<i class="fas fa-solid fa-plus"></i><i class="fas fa-solid fa-thermometer"></i></span>' +
      '</button></li>' +
      '<li class="nav-item"><div class="d-flex"><div class="navbar-text">&nbsp; Group by: &nbsp;</div>' +
      '<div class="btn-group" id="sensor_grouping" role="group" onchange="UpdateOnce(regoup=true)"> ' +
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

function SigFigs(val) {
  if (typeof(val) == "number" || val.includes('.') ) {
    // value is float
    val = parseFloat(val);
    return Math.abs(Math.log10(Math.abs(val))) < LOG_THRESHOLD ? val.toFixed(SIG_FIGS) : val.toExponential(SIG_FIGS);
  }
  return val;
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

function UpdateOnce(regroup=false) {
  if (regroup) $('#sensor_table').html('<thead><tr><th colspan=2>Loading...</th></tr></thead>');
  var group_by = $('#sensor_grouping input:radio:checked').val();
  $.when(
    $.getJSON('/devices/get_last_points'),
    $.getJSON(`/devices/sensors_grouped?group_by=${group_by}`)
  ).done((data, sensors_grouped) => {
    if (regroup) {
      $("#sensor_table").empty();
      $("#jump_to_list").empty();
    }
    sensors_grouped[0].forEach(group => {
      if (regroup) {
        var click = group_by == 'device' ? `onclick='DeviceDropdown("${group._id}")'` : "";
        $("#sensor_table").append(`<thead id=${group._id}><tr ${click}><th colspan=2> ${group._id}</th></tr></thead><tbody id="${group._id}_tbody"></tbody>`);
        $("#jump_to_list").append(`<li><a class="dropdown-item py-2" href="#${group._id}">${group._id}</a></li>`);
      }
       group['sensors'].forEach(doc => {
         // Add table row if sensor new
         if (!$(`#${doc.name}_status`).length)
           $(`#${group._id}_tbody`).append(`<tr><td id="${doc.name}_desc" onclick="SensorDropdown('${doc.name}')">Loading!</td><td id="${doc.name}_status">Loading!</td></tr>`);
         $(`#${doc.name}_desc`).html(`${doc.desc} (${doc.name})`);
         var new_status = 'No recent data';
         var last_point = data[0][doc.name];
         if (last_point && (last_point.value)) {
           var displayval = (doc.valuemap == undefined) ? SigFigs(last_point.value) : doc.valuemap[parseInt(last_point.value)];
           new_status = `${displayval} ${doc.units} (${FormatTimeSince(last_point.time_ago)} ago)`;
         }
         if (doc.status == 'offline') {
           if (new_status.slice(-1) == ')')
             new_status = new_status.slice(0, -1) + ', ';
           else
             new_status += ' (';
           new_status += 'offline)';
         }
         $(`#${doc.name}_status`).html(new_status);
       });
    });
  });
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