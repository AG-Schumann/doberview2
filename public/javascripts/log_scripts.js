
var table;

function GetLogs() {
  table = new Tabulator('#log_table', {
    ajaxURL: '/logs/get_logs',
    ajaxParams: {},
    columns: [
      {title: 'Time', field: 'logged', sorter: 'date'},
      {title: 'Severity', field: 'level', sorter: 'number', formatter: "traffic", formatterParams: {min: 20, max: 60}},
      {title: 'Name', field: 'name', sorter: 'string'},
      {title: 'Function': field: 'funcname', sorter: 'string'},
    ],
  );
}
