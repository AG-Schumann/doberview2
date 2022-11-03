
var table = null;

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
      {title: 'Time (local)', field: 'date', sorter: 'string'},
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

function now_minus_hours(h) {
  var now = new Date();
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