function GetGroupedReadings(group_by) {
  $.getJSON(`/sensors/readings_grouped?group_by=${group_by}`, (data) => {
    $("#reading_table").empty();
    data.forEach(group => {
      var click = group_by == 'sensor' ? `data-bs-toggle="modal" data-bs-target="#sensorbox" onclick='SensorDropdown("${group._id}")'` : "";
      var head = `<thead><tr ${click}><th colspan=3>${group._id}</th></tr></thead><tbody>`;
      $("#reading_table").append(head + group['readings'].reduce((tot, rd) => tot + `<tr data-bs-toggle="modal" data-bs-target="#readingbox" onclick="ReadingDropdown('${rd.name}')"><td>${rd.desc} (${rd.name})</td><td id="${rd.name}_status">Unknown</td><td id="${rd.name}_value">-</td></tr>`));
      $("#reading_table").append('</tbody>');
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
