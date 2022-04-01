
var table = null;
function PopulateNavbar() {
  var content = '<li><div class="d-flex"><div class="navbar-text"> Minimum severity: &nbsp;</div>' +
      '<select id="min_severity"><option value="30" selected="selected">Warning</option>' +
      '<option value="40">Error</option><option value="50">Critial</option></select></div></li>' +
      '<li><div class="d-flex"><div class="navbar-text">Get this many: &nbsp;</div>' +
      '<input id="get_num" type="number" min="30" max="3000" value="200"/></div></li>' +
      '<li><div class="d-flex"><div class="navbar-text">Name: &nbsp;</div>' +
      '<input id="get_name" type="text"></li>' +
      '<li><button class="btn btn-primary" onclick="GetLogs()">Fetch</button></li>';
  $('#navbar_content').prepend(content);
}

function GetLogs() {
  if (table != null) delete table;
  table = new Tabulator('#log_table', {
    ajaxURL: '/logs/get_logs',
    ajaxParams: {limit: $("#get_num").val(), severity: $("#min_severity").val(), name: $("#get_name").val()},
    columns: [
      {title: 'Time', field: 'logged', sorter: 'string'},
      {title: 'Severity', field: 'level', sorter: 'number', formatter: "traffic", formatterParams: {min: 30, max: 50, color: ['yellow', 'orange', 'red']}},
      {title: 'Name', field: 'name', sorter: 'string'},
      {title: 'Function', field: 'funcname', sorter: 'string'},
      {title: 'Message', field: 'msg'},
    ],
    layout: 'fitDataStretch',
    pagination: true,
    paginationSize: 30,
  });
}
