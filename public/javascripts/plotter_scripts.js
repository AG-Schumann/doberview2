function SelectSensorsDropdown() {
    $("#sensor_select").modal('show');
    $json
}

function now_minus_hours(h) {
    let now = new Date();
    let time_delta = h * 3600 * 1000;
    return new Date(now - time_delta);
}