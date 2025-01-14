var hosts = [];

function SetHosts() {
  $.getJSON("/hosts/params", data => {
    hosts = data.hosts;
  });
}

function UpdatePage() {
  hosts.forEach(h => {
    $.getJSON(`/hosts/get_snapshot?host=${h}`, data => {
      if (Object.keys(data).length === 0)
        return;
      $(`#load_${h}`).html(`${data.load1} / ${data.load5} / ${data.load15}`);
      if (typeof data.cpu_1_temp != 'undefined')
        $(`#temp_${h}`).html(`${data.cpu_0_temp} / ${data.cpu_1_temp}`);
      else
        $(`#temp_${h}`).html(`${data.cpu_0_temp}`);
      $(`#cpu_${h}`).html(`${data.cpu0} / ${data.cpu1}`);
      $(`#mem_${h}`).html(`${data.mem_pct}% RAM | ${data.swap_pct}% swap`);
      $(`#io_${h}`).html(`Network: ${data.network_recv}/${data.network_sent} | Disk: ${data.disk_read}/${data.disk_write}`);
    }); // getJSON
  }); // hosts.forEach
}
