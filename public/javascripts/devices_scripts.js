function DeviceDropdown(device) {
    $("#device_ctrl_btn").prop("onclick", null).off("click");
    $("#device_manage_btn").prop("onclick", null).off("click");
    $.getJSON(`/devices/distinct_hostnames`, (hosts) => {
        const dataList = $("#hostname_options");
        dataList.empty();
        hosts.forEach(host => {
            const option = $("<option>").val(host);
            dataList.append(option);
        });
    });
    $.getJSON(`/devices/detail?device=${device}`, (data) => {
        $(".modal").modal('hide');
        if (Object.keys(data).length === 0)
            return;
        // Populate device details
        $("#detail_device_name").html(data.name);
        $("#device_host").val(data.host);

        if (typeof data.address != 'undefined') {
            if (typeof data.address.ip != 'undefined') {
                $("#device_ip").val(data.address.ip);
                $("#device_port").val(data.address.port);
                $("#device_tty").val(null);
                $("#device_serial_id").val(null);
                $(".device_eth").attr('hidden', false);
                $(".device_serial").attr('hidden', true);
            } else if (typeof data.address.tty != 'undefined') {
                $("#device_tty").val(data.address.tty);
                $("#device_baud").val(data.address.baud);
                $("#device_serial_id").val(data.address.serialID || null);
                $("#device_ip").val(null);
                $("#device_port").val(null);
                $(".device_eth").attr('hidden', true);
                $(".device_serial").attr('hidden', false);
            }
        } else {
            $(".device_eth").attr('hidden', true);
            $(".device_serial").attr('hidden', true);
        }
        $("#device_sensors").empty();
        var sensor_list = data.sensors;
        if (data.multi)
            sensor_list = data.multi;
        sensor_list.forEach(rd => $("#device_sensors").append(`<li style="margin-bottom:10px;"><button class="btn btn-primary btn-sm" onclick="SensorDropdown('${rd}')">${rd}</button></li>`));
        $("#device_sensors").append('<li style="margin-bottom:10px;"><button class="btn btn-success btn-sm" onclick="PopulateNewSensor()">Add new!</button></li>');
        if (typeof data.commands != 'undefined')
            $("#device_commands_list").html(data.commands.reduce((tot, cmd) => tot + `<li>${cmd.pattern}</li>`,"") || "<li>None</li>");
        else
            $("#device_commands_list").html("<li>None</li>");
        $("#device_command_to").val(data.name);
        $("#devicebox").modal('show');

        startControlButtonUpdate(device);
    });
}

let controlButtonInterval;

function startControlButtonUpdate(device) {
    if (controlButtonInterval) clearInterval(controlButtonInterval);
    // Initial call to set up the buttons
    updateControlButtons(device);
    // Set interval to refresh the buttons every 5 seconds
    controlButtonInterval = setInterval(() => updateControlButtons(device), 1000);
}

function updateControlButtons(device) {
    $.getJSON(`/hypervisor/device_status?device=${device}`, (doc) => {
        let control_btn = $("#device_ctrl_btn");
        let manage_btn = $("#device_manage_btn");

        // Set text based on device status
        control_btn.text(doc.active ? "Stop" : "Start");
        manage_btn.text(doc.managed ? "Unmanage" : "Manage");

        // Update control button action
        control_btn.off("click").click(() => {
            ControlDevice(doc.active ? "stop" : `start ${device}`);
        });

        // Update manage button action
        manage_btn.off("click").click(() => {
            ManageDevice(doc.managed ? "unmanage" : "manage");
        });
    });
}

// Stop updating buttons when the modal is closed
$('#devicebox').on('hidden.bs.modal', () => {
    if (controlButtonInterval) clearInterval(controlButtonInterval);
});

function UpdateDevice() {
    var data = {device: $("#detail_device_name").html()};
    data['host'] = $(`#device_host`).val();
    ['ip', 'port', 'tty', 'baud', 'serial_id'].forEach(key => {
        if ($(`#device_${key}`).val())
            data[key] = $(`#device_${key}`).val();
    });
    var msg = 'Updated device ' + $("#detail_device_name").html();
    if (Object.keys(data).length > 1) {
        $.ajax({
            type:'POST',
            url: '/devices/update',
            data: {data: data},
            success: (data) => {if (typeof data.err != 'undefined') alert(data.err); else Notify(msg, data.notify_status);},
            error: (jqXHR, textStatus, errorCode) => alert(`Error: ${textStatus}, ${errorCode}`)
        });
    }
}

function ControlDevice(action) {
    var device = $("#detail_device_name").html();
    if (device && action) {
        SendToHypervisor(action == 'stop' ? device : 'hypervisor', action, `${action} sent to ${device}`);
    }
}

function ManageDevice(action) {
    var device = $("#detail_device_name").html();
    if (device && action) {
        SendToHypervisor('hypervisor', `${action} ${device}`, 'Management change confirmed');
    }
}

