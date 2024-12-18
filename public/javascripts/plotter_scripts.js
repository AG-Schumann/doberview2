let selectedCells = [];
let selectedTemplateName = null;
let selectedLegendPosition = "top-right"; // Default position


function updateSensorButtonText() {
    const button = document.getElementById('sensorButton');
    button.textContent = `${selectedCells.length} Sensors selected`;
}

function SelectSensorsModal() {
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

function updateLegendButtonText() {
    $("#legendButton").text(`${selectedLegendPosition.replace('-', ' ')}`);
}

function setLegendPosition(position) {
    selectedLegendPosition = position;
    updateLegendButtonText();

    // Initialize legend options with default border settings
    let legend_options = { bordercolor: '#444', borderwidth: 1 };

    const legendPositions = {
        "top-left": { y: 0.95, xanchor: "left", yanchor: "top" },
        "top-right": { y: 0.95, xanchor: "right", yanchor: "top" },
        "bottom-left": { y: 0.05, xanchor: "left", yanchor: "bottom" },
        "bottom-right": { y: 0.05, xanchor: "right", yanchor: "bottom" },
        "top-center": { y: 0.95, xanchor: "center", yanchor: "top" },
        "bottom-center": { y: 0.05, xanchor: "center", yanchor: "bottom" },
        "left-center": { y: 0.5, xanchor: "left", yanchor: "middle" },
        "right-center": { y: 0.5, xanchor: "right", yanchor: "middle" }
    };

    // Get the current layout to use xaxis domain for calculating x position
    const plot = document.getElementById('plot');
    const currentLayout = plot.layout;

    // Adjust the x position based on xaxis domain for positions that are horizontally centered
    const domain = currentLayout?.xaxis?.domain || [0, 1];
    const centerX = (domain[0] + domain[1]) / 2;

    // Set the x position based on the legend position and domain
    if (position === "top-center" || position === "bottom-center") {
        legend_options.x = centerX;
    } else if (position === "top-left" || position === "bottom-left" || position === "left-center") {
        legend_options.x = domain[0] + 0.01;  // Small offset to avoid edge clipping
    } else if (position === "top-right" || position === "bottom-right" || position === "right-center" ) {
        legend_options.x = domain[1] - 0.01;
    }
    // Apply the remaining y and anchor settings
    Object.assign(legend_options, legendPositions[position]);

    // Update the plot layout with the new legend options
    Plotly.relayout('plot', { legend: legend_options });

    // Hide modal and set selected styling
    $("#legendPlacementModal").modal('hide');
    $(".triangle, .trapezoid").removeClass("selected");
    $(`#${position.replace('-', '')}`).addClass("selected");
}


function ChangeDates() {
    let start = new Date($("#from_select_input").val());
    let end = new Date($("#to_select_input").val());
    let min_binning = getMinBinning(start, end);
    const slider = document.getElementById('median_filter_input');
    slider.min = min_binning;
    slider.max = min_binning * 30;
    slider.value = min_binning * 3;
    slider.step = min_binning;
    ChangeBinningLabel();
    Plot().then(r => {return;});

}

function ChangeBinningLabel() {
    $("#binning_val").text($("#median_filter_input").prop("value") + 's');
}

function getMinBinning(start, end) {
    let total_seconds = (end.getTime() - start.getTime()) / 1000;
    return  Math.max(1, Math.round(total_seconds / 3000)); // load less than 3000 data points
}

async function Plot() {
    // Hide plot until loaded, show progress bar
    $("#plot").hide();
    let progressPercentage = 0;
    $("#progress-bar-inner").css('width', `${progressPercentage}%`);
    $("#progress-bar-container").show();


    // Get start, end, and binning
    let start = new Date($("#from_select_input").val());
    let tz_offset = start.getTimezoneOffset() * 60000;  // timezone offset in ms
    let end = new Date($("#to_select_input").val());
    let binning =  $("#median_filter_input").prop("value");
    start = start.toISOString();
    end = end.toISOString();
    // Get sensor details for selected sensors
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

        // give user illusion of progress
        progressPercentage += 10;
        $("#progress-bar-inner").css('width', `${progressPercentage}%`);

        // Load data points
        const dataPromises = selectedCells.map(sensor =>
            $.getJSON(`/devices/get_data?start=${start}&end=${end}&binning=${binning}s&sensor=${sensor}`)
                .then(data => {
                    progressPercentage += (90 / selectedCells.length);
                    $("#progress-bar-inner").css('width', `${progressPercentage}%`);
                    return {
                        name: sensor,
                        x: data.map(row => new Date(row[0] - tz_offset).toISOString().slice(0, 19).replace('T', ' ')),
                        y: data.map(row => row[1]),
                    };
                })
        );
        const sensorData = await Promise.all(dataPromises);
        progressPercentage += 90;
        $("#progress-bar-inner").css('width', `${progressPercentage}%`);
        // create all traces
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
        const numberOfAxes = Object.keys(axisGroups).length;

        // general layout
        const layout = {
            height: 800,
            xaxis: {
                type: 'date',
                showticklabels: true,
                tickangle: 45,
                domain: [Math.floor((numberOfAxes - 1) / 2) * 0.06, 1 - Math.max(0, Math.floor((numberOfAxes - 2) / 2)) * 0.06]
            },
            showlegend: true,
            hoverinfo: "x+y",
        };

        // layout for each axis
        Object.keys(axisGroups).forEach((axisLabel, index) => {
            const axisName = index === 0 ? 'yaxis' : `yaxis${index + 1}`;
            axisLabel = axisLabel.endsWith(' ') ? axisLabel.split('/')[0] : axisLabel;
            layout[axisName] = {
                title: axisLabel,
                overlaying: index === 0 ? undefined : 'y',
                side: index % 2 === 0 ? 'left' : 'right',
                position: index % 2 === 0 ? 0.03 * index : 1 - (0.03 * (index - 1)),
            };
        });
        $("#plot").show();
        $("#progress-bar-container").hide();
        Plotly.newPlot('plot', traces, layout, { responsive: true });
        setLegendPosition(selectedLegendPosition);
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

        templates.forEach(template => {
            const listItem = `
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    <span onclick="LoadTemplate('${template}')">${template}</span>
                    <i class="fas fa-trash" onclick="DeleteTemplate('${template}')"></i>
                </li>`;
            templateList.append(listItem);
        });
    });
    $("#loadTemplateModal").modal('show');
}

async function LoadTemplate(name) {
    $('#loadTemplateModal').modal('hide');
    selectedCells = await $.getJSON(`/plotter/get_sensors?name=${name}`);
    updateSensorButtonText();
    await Plot();
}

function DeleteTemplate(name) {
    if (name == '')
        return;
    if (confirm(`Are you sure that you want to delete this template?`)) {
        $.post('/plotter/delete_template', {name: name}, (data, status) => {
            if (typeof data.err != 'undefined')
                alert(data.err);
            else
                Notify(data.notify_msg, data.notify_status);
               LoadTemplateModal();
        });
    }
}

function now_minus_hours(h) {
    let now = new Date();
    let time_delta = h * 3600 * 1000;
    return new Date(now - time_delta);
}