let selectedCells = [];
let selectedTemplateName = null;

function updateSensorButtonText() {
    const button = document.getElementById('sensorButton');
    button.textContent = `${selectedCells.length} Sensors selected`;
}

function SelectSensorsDropdown() {
    $.getJSON(`/devices/sensors_grouped?group_by=topic`, data => {
        const tableHead = $("#sensorTable thead tr");
        const tableBody = $("#sensorTable tbody");

        // Clear previous content in the header and body
        tableHead.empty();
        tableBody.empty();

        // Add a header cell for each topic
        data.forEach(topicGroup => {
            const topicHeader = `<th>${topicGroup._id}</th>`;
            tableHead.append(topicHeader);
        });

        // Find the maximum number of sensors in any topic to determine row count
        const maxSensors = Math.max(...data.map(group => group.sensors.length));

        // Create rows for sensors, one per row across topics
        for (let i = 0; i < maxSensors; i++) {
            const row = $("<tr></tr>");
            data.forEach(topicGroup => {
                const sensor = topicGroup.sensors[i];
                const cell = sensor
                    ? $(`<td>${sensor.desc} (${sensor.name})</td>`)
                    : $("<td></td>"); // Empty cell if no sensor for this row

                // Check if this sensor is already selected
                if (sensor && selectedCells.includes(sensor.name)) {
                    cell.addClass("selected-cell");
                }
                // Add toggle effect for each cell
                cell.click(() => {
                    if (sensor) {
                        cell.toggleClass("selected-cell");


                        // Update selectedCells array based on toggle state
                        if (cell.hasClass("selected-cell")) {
                            selectedCells.push(sensor.name);
                        } else {
                            const index = selectedCells.indexOf(sensor.name);
                            if (index !== -1) {
                                selectedCells.splice(index, 1);
                            }
                        }
                        updateSensorButtonText();
                    }
                });
                row.append(cell);
            });
            tableBody.append(row);
        }
    });
    // Show the modal containing the table
    $("#sensorSelectModal").modal('show');
}

function ChangeDates() {
    let start = new Date($("#from_select_input").val());
    let end = new Date($("#to_select_input").val());
    let min_binning = getMinBinning(start, end);
    const slider = document.getElementById('median_filter_input');
    slider.min = min_binning;
    slider.max = min_binning * 10;
    slider.value = min_binning * 3;
    slider.step = min_binning;
    ChangeBinningLabel();
    Plot(start, end, slider.value).then(r => {return;});

}

function ChangeBinningLabel() {
    $("#binning_val").text($("#median_filter_input").prop("value") + 's');
}

function getMinBinning(start, end) {
    let total_seconds = (end.getTime() - start.getTime()) / 1000;
    return  Math.max(1, Math.round(total_seconds / 3000)); // load less than 3000 data points
}

function updateLegendPosition() {
    const selectedPosition = $("#legend_position_select").val();
    Plot(undefined, undefined, undefined, selectedPosition);
}

async function Plot(start, end, binning,) {
    start = start || new Date($("#from_select_input").val());
    end = end || new Date($("#to_select_input").val());
    binning = binning || $("#median_filter_input").prop("value");

    start = start.toISOString();
    end = end.toISOString();

    // Fetch sensor details to check units for axis grouping
    const sensorDetailsPromises = selectedCells.map(sensor =>
        $.getJSON(`/devices/sensor_detail?sensor=${sensor}`)
    );

    try {
        const sensorDetails = await Promise.all(sensorDetailsPromises);
        const axisGroups = {};
        sensorDetails.forEach(detail => {
            const unitKey = `${detail.topic} / ${detail.units}`;
            if (!axisGroups[unitKey]) {
                axisGroups[unitKey] = { sensors: [], axisId: `y${Object.keys(axisGroups).length + 1}`};
            }
            axisGroups[unitKey].sensors.push(detail.name);
        });
        const dataPromises = selectedCells.map(sensor => {
            return $.getJSON(`/devices/get_data?start=${start}&end=${end}&binning=${binning}s&sensor=${sensor}`)
                .then(data => ({
                    name: sensor,
                    x: data.map(row => new Date(row[0]).toISOString()
                        .slice(0, 19).replace('T', ' ')),
                    y: data.map(row => row[1]),
                }));
        });
        const sensorData = await Promise.all(dataPromises);
        const traces = [];
        sensorData.forEach(sensor => {
            const sensorDetail = sensorDetails.find(detail => detail.name === sensor.name);
            const axisGroupKey = `${sensorDetail.topic} / ${sensorDetail.units}`;
            const axisId = axisGroups[axisGroupKey].axisId;
            const legendLabel = sensorDetail.description;

            traces.push({
                x: sensor.x,
                y: sensor.y,
                name: legendLabel,
                yaxis: axisId,
                type: 'scatter',
            });
        });
        // Configure layout with multiple y-axes
        const numberOfAxes = Object.keys(axisGroups).length;
        const layout = {
            height: 800,
            xaxis: {
                type: 'date',
                //range: [start, end],
                showticklabels: true,
                tickangle: 45,
                domain:
                    [Math.floor((numberOfAxes-1)/2)*0.06,
                     1-Math.max(0,Math.floor((numberOfAxes-2)/2))*0.06]
            },
            showlegend: true,
            legend: {
                x: 0,
                y: 1,
                orientation: "v"},
            hoverinfo: "x+y",
        };
        Object.keys(axisGroups).forEach((axisLabel, index) => {
            const axisName =  index === 0 ? 'yaxis' : `yaxis${index+1}`;
            axisLabel = axisLabel.endsWith(' ') ? axisLabel.split('/')[0] : axisLabel;
            layout[axisName] = {
                title: axisLabel,
                overlaying: index === 0 ? undefined : 'y',
                side: index % 2 === 0 ? 'left' : 'right',
                position: index % 2 === 0 ? 0.03 * index : 1 - (0.03 * (index-1)),
            };
        });
        let legendPosition = $("#legend_position_select").val();
        const legendPositions = {
            "top left": { x: 0, y: 1, xanchor: "left", yanchor: "top" },
            "top right": { x: 1, y: 1, xanchor: "right", yanchor: "top" },
            "bottom left": { x: 0, y: 0, xanchor: "left", yanchor: "bottom" },
            "bottom right": { x: 1, y: 0, xanchor: "right", yanchor: "bottom" },
        };
        layout.legend = legendPositions[legendPosition] || legendPositions["top right"];

        Plotly.newPlot('plot', traces, layout,  {responsive: true});

    } catch (err) {
        console.error("Error fetching data: ", err);
    }
}

function SaveTemplate() {
    let data = {
        name: $("#templateName").val(),
        sensors: selectedCells,
    }
    $.ajax({
        type: 'POST',
        url: '/plotter/save_template',
        data: data,
        success: (data) => {
            if (typeof data.err != 'undefined') alert(data.err); else Notify(data.notify_msg, data.notify_status);},
        error: (jqXHR, textStatus, errorCode) => alert(`Error: ${textStatus}, ${errorCode}`)
    });
}

function LoadTemplateModal() {
    $.getJSON('/plotter/get_templates', (templates) => {
        const templateList = $('#templateList');
        templateList.empty(); // Clear any previous entries
        console.log(templates);
        templates.forEach(template => {
            console.log(template);
            const listItem = `<li onclick="LoadTemplate('${template}')"> ${template} </li>`;
            templateList.append(listItem);
        });
    });
    $("#loadTemplateModal").modal('show');
}

async function LoadTemplate(name) {
    $('#loadTemplateModal').modal('hide');
    console.log('loading ' + name);
    selectedCells = await $.getJSON(`/plotter/get_sensors?name=${name}`);
    updateSensorButtonText();
    await Plot();
}

function now_minus_hours(h) {
    let now = new Date();
    let time_delta = h * 3600 * 1000;
    return new Date(now - time_delta);
}