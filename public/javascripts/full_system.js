const sensors = [];
const units = {};

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
      '<div class="btn-group" id="sensor_grouping" role="group"> ' +
      '<input class="btn-check" id="groupSubsystem" type="radio" name="btnradio" value="subsystem" onclick="GetGroupedSensors()" checked=""> ' +
      '<label class="btn btn-outline-primary" for="groupSubsystem">Subsystem</label> ' +
      '<input class="btn-check" id="groupSensor" type="radio" name="btnradio" value="device" onclick="GetGroupedSensors()"> ' +
      '<label class="btn btn-outline-primary" for="groupSensor">Device</label>' +
      '<input class="btn-check" id="groupTopic" type="radio" name="btnradio" value="topic" onclick="GetGroupedSensors()"> ' +
      '<label class="btn btn-outline-primary" for="groupTopic">Topic</label></div></div></li>' +
      '<li class="nav-item">' +
      '<div class="nav-item dropdown"><a class="nav-link dropdown-toggle" data-bs-toggle="dropdown" href="#" role="button">Jump to</a> ' +
      '<ul class="dropdown-menu" id="jump_to_list"></ul></div></li>' +
      '<li class="nav-item">' +
      '<div class="input-group pe-3" style="min-width:205px"><span class="input-group-text"><i class="fas fa-solid fa-magnifying-glass"></i>' +
      '</span> <input class="form-control" id="searchSensorInput" type="text" onkeyup="FilterSensors()" placeholder="Search sensor"/> ' +
      '<button class="btn bg-transparent" type="button" style="margin-left: -40px; z-index: 100;" onclick="$(`#searchSensorInput`).val(``); FilterSensors();">' +
      '<i class="fa fa-times"></i></button></div></li>';
  $('#navbar_content').prepend(content);
}

function GetGroupedSensors() {
  var group_by = $('#sensor_grouping input:radio:checked').val();
  $.getJSON(`/devices/sensors_grouped?group_by=${group_by}`, (data) => {
    $("#sensor_table").empty();
    $("#jump_to_list").empty();
    data.forEach(group => {
      var click = group_by == 'device' ? `onclick='DeviceDropdown("${group._id}")'` : "";
      var head = `<thead id=${group._id}><tr ${click}><th colspan=2> ${group._id}</th></tr></thead><tbody id="${group._id}_tbody">`;
      group['sensors'].forEach(doc => units[doc.name] = doc.units);
      $("#jump_to_list").append(`<li><a class="dropdown-item py-2" href="#${group._id}">${group._id}</a></li>`)
      $("#sensor_table").append(head + group['sensors'].reduce((tot, rd) => tot + `<tr><td id="${rd.name}_desc" onclick="SensorDropdown('${rd.name}')">Loading!</td><td id="${rd.name}_status">Loading!</td></tr>`, "") + '</tbody>');
    }); // data.forEach
  }); // getJSON
  UpdateOnce();
}

function SigFigs(val) {
  if (typeof(val) == "number" || val.includes('.') ) {
    // value is float
    val = parseFloat(val);
    return Math.abs(Math.log10(Math.abs(val))) < LOG_THRESHOLD ? val.toFixed(SIG_FIGS) : val.toExponential(SIG_FIGS);
  }
  return val;
}

function UpdateOnce() {
  var group_by = $('#sensor_grouping input:radio:checked').val();
  $.when(
    $.getJSON('/devices/get_last_points'),
    $.getJSON(`/devices/sensors_grouped?group_by=${group_by}`)
  ).done((data, sensors_grouped) => {
    sensors_grouped[0].forEach(group => {
       group['sensors'].forEach(doc => {
         // Add any possible new sensor
         if (!$(`#${doc.name}_status`).length)
           $(`#${group._id}`).append(`<tr><td id="${doc.name}_desc" onclick="SensorDropdown('${doc.name}')">Loading!</td><td id="${doc.name}_status">Loading!</td></tr>`);
         units[doc.name] = doc.units;
         $(`#${doc.name}_desc`).html(`${doc.desc} (${doc.name})`);
         var last_point = data[0][doc.name];
         if (last_point && (last_point.value))
           var new_status = `${SigFigs(last_point.value)} ${units[last_point.sensor]} (${last_point.time_ago}s ago)`;
         else
           var new_status = 'No recent data';
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

  var filter = $("#searchSensorInput").val().toUpperCase();
  var tr = $("#sensor_table").find("tr");
  for (var i = 0; i < tr.length; i++) {
    var sensor_name = tr[i].getElementsByTagName("td")[0];
    if (sensor_name) {
      var txtValue = sensor_name.textContent || sensor_name.innerText;
      if (txtValue.toUpperCase().indexOf(filter) > -1)
        tr[i].style.display = "";
      else
        tr[i].style.display = "none";
    }
  }
}
