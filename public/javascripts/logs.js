
var table = null;

function PopulateNavbar() {
    let content = '<li class="nav-item"><div class="d-flex">' +
        '<div className="navbar-text"> UTC Datetime: &nbsp;</div>' +
        '<div class="fw-bold" id="clock">Loading</div></div></li>'
  $('#navbar_content').prepend(content);
}

function GetLogs() {
  if($("#query_mode").prop('checked')) {

    var ajax_params = {from: $("#from_selector_input").val(), to: $("#to_selector_input").val(), severity: $("#min_severity").val(), name: $("#get_name").val()};

  } else {
    var ajax_params = {limit: $("#get_num_input").val(), severity: $("#min_severity").val(), name: $("#get_name").val()};
  }
  if (table != null) delete table;
  table = new Tabulator('#log_table', {
    ajaxURL: '/logs/get_logs',
    ajaxParams: ajax_params,
    columns: [
      {title: 'Time', field: 'logged', sorter: 'string'},
      {title: 'Severity', field: 'level', sorter: 'number', formatter: "traffic", formatterParams: {min: 30, max: 50, color: ['yellow', 'orange', 'red']}},
      {title: 'Name', field: 'name', sorter: 'string'},
      {title: 'Function', field: 'funcname', sorter: 'string'},
      {title: 'Message', field: 'msg'},
    ],
    layout: 'fitDataStretch',
    pagination: true,
    paginationSize: 100,
  });
}
function now_utc() {
  var localTime = new Date();
  var utcTime = new Date();
  utcTime.setMinutes(utcTime.getMinutes() + localTime.getTimezoneOffset());
  return utcTime;
}
function now_minus_hours(h) {
  var now = now_utc();
  var time_delta = h * 3600 * 1000;
  return new Date(now - time_delta);
}

function ToggleQueryMode() {
  if($("#query_mode").prop('checked')) {
    $("#from_selector").show();
    $("#to_selector").show();
    $("#get_num").hide();
  } else {
    $("#from_selector").hide();
    $("#to_selector").hide();
    $("#get_num").show();
  }
}

function UpdateClock() {
  var now = new Date().toISOString();
  now = now.replace('T', ' ');
  now = now.slice(0,19);
  document.getElementById("clock").innerHTML = now;
}