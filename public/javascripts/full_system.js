
function GetGroupedReadings() {
  var group_by = $("#reading_grouping").val();
  $.getJSON(`/sensors/readings_grouped?group_by=${group_by}`, (data) => {
    $("#reading_table").empty();
    data.forEach(group => {
      var click = group_by == 'sensor' ? `onclick='SensorDropdown("${group._id}")'` : "";
      var head = `<tr ${click}><th colspan=3><strong>${group._id}</strong></th></tr>`;
      $("#reading_table").append(head + group['readings'].reduce((tot, rd) => tot + `<tr onclick="ReadingDropdown('${rd.name}')"><td>${rd.desc} (${rd.name})</td><td id="${rd.name}_status">Unknown</td><td id="${rd.name}_value">-</td></tr>`));
    }); // data.forEach
  }); // getJSON
}

function UpdateLoop() {
  readings.forEach(r => {
    $.getJSON(`/sensors/reading_detail?reading=${r}`, (data) => {
      if (data.status === 'online')
        $(`#${r}_status`).html(`Online (${data.runmode})`);
      else
        $(`#${r}_status`).html(`Offline`);
    });
 /*   $.getJSON(`/sensors/get_last_point?reading=${r}`, (data) => {
      $(`{r}_value`).html(`${data.value} (${data.time_ago}s ago)`);
    }); */
  });
}
