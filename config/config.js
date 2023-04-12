var config = {};


// This file contains all the experiment-specific configurations.
config.mongo_uri = process.env.DOBERVIEW_MONGO_URI;
config.experiment_name = process.env.DOBERVIEW_EXPERIMENT;
config.host = process.env.DOBERVIEW_HOST;
config.port = process.env.DOBERVIEW_PORT;
config.github_oauth_client_id = process.env.GITHUB_OAUTH_CLIENT_ID;
config.github_oauth_client_secret = process.env.GITHUB_OAUTH_CLIENT_SECRET;
config.github_callback_url = process.env.GITHUB_CALLBACK_URI;
config.grafana_sysmon_url = process.env.GRAFANA_SYSMON_URL;
config.grafana_url = process.env.GRAFANA_URL;
config.hosts = process.env.HOSTS || [];
config.main_svg = process.env.MAIN_SVG; // path to main svg
module.exports = config;