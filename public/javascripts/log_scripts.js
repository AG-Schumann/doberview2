
var table = null;

function GetLogs() {
  if (table != null) delete table;
  table = new Tabulator('#log_table', {
    ajaxURL: '/logs/get_logs',
    ajaxParams: {limit: $("#get_num").val(), severity: $("#min_severity").val(), name: $("#get_name").val()},
    columns: [
      {title: 'Time', field: 'logged', sorter: 'date'},
      {title: 'Severity', field: 'level', sorter: 'number', formatter: "traffic", formatterParams: {min: 20, max: 50, color: ['green', 'yellow', 'orange', 'red']}},
      {title: 'Name', field: 'name', sorter: 'string'},
      {title: 'Function', field: 'funcname', sorter: 'string'},
      {title: 'Message', field: 'msg'},
    ],
    layout: 'fitDataStretch',
    pagination: true,
    paginationSize: 30,
  });
}
