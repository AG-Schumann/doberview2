var experiments = {'XeBRA': 'xebra', 'PANCAKE': 'pancake'};

function SetExperiment(name) {
    $.post("/set_experiment", name, () => {
    }).then(() => {
        window.location = '../devices';
    });
}