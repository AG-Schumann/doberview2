var config = {};


// This file contains all the experiment-specific configurations.

// where your website will be running
config.host = process.env.DOBERVIEW_HOST;
config.port = process.env.DOBERVIEW_PORT;

// Connection to MongoDB
config.mongo_uri = process.env.DOBERVIEW_MONGO_URI;
config.experiment_name = process.env.DOBERVIEW_EXPERIMENT;


// You may want to change your InfluxDB URI from the one stored in MongoDB to something else for testing purposes
config.override_influx_uri = false;
config.influx_uri = process.env.INFLUX_URI;

// GitHub Auth
// If you want to restrict people from changing stuff through the website, set use_authentication=true.
// Currently, only an authentication via membership in a GitHub organization is possible. This means all public members
// of the organization defined in github_org can log in to change things
config.use_authentication = false;
config.github_org = process.env.GITHUB_ORG;
config.github_oauth_client_id = process.env.GITHUB_OAUTH_CLIENT_ID;
config.github_oauth_client_secret = process.env.GITHUB_OAUTH_CLIENT_SECRET;
config.github_callback_url = process.env.GITHUB_CALLBACK_URI;

// Systems
// set use_systems if ou want a graphical system overview tab on your website. This will require a path to your main .svg file
// link to tutorial here
config.use_systems = false;
config.main_svg = process.env.MAIN_SVG; // path to main svg

// Hosts
// set use_hosts=true if you want a host overview tab on your website. Current implementation of this is a bit lackluster,
// so I won't go into details
config.use_hosts = false;
config.hosts = process.env.HOSTS || [];
config.grafana_sysmon_url = process.env.GRAFANA_SYSMON_URL;

// Grafana
// set use_grafana=true if you want a Grafana tab on your website. This requires a grafana_url
config.use_grafana = false;
config.grafana_url = process.env.GRAFANA_URL; // URL to grafana dashboard (hint: add &kiosk=tv to the url to enter fullscreen mode)

// Cameras
// If you by any chance have a bunch of cameras that are hosted on a different URL, you can set use_cameras=true
// This will create a  tab that redirects you to the `cameras_link`
config.use_cameras = false;
config.camera_link = process.env.CAMERA_LINK;


module.exports = config;
