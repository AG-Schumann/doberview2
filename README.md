# doberview2
A NodeJS-based web frontend for Doberman v6

## Setup
  * `git clone` this repository on your server.
  * `cd doberview2` and run `npm install` inside the repository to install required packages .

## Configuration
  * Copy the file `doberview2/config/config.js.example` to `doberview2/config/config.js`. 
  * Either fill in the required configuration values or set the given environment variables.
Given you have a running doberman system, you need these four configs/envars:
    * `config.host` / `DOBERVIEW_HOST` the IP or hostname where you want to host the site
    * `config.port`  / `DOBERVIEW_PORT` the port where to host the site
    * `config.mongo_uri` / `DOBERVIEW_MONGO_URI` the URI of doberman's MongoDB configuration database.
    * `config.experiment_name` / `process.env.DOBERVIEW_EXPERIMENT` the name of your experiment a.k.a. the name of the database storing the configurations.
  * All other config options are optional. Details can be found in `config_example.js`.
  * For instructions on creating graphical system overviews, refer to the [Creating and editing SVGs](https://github.com/AG-Schumann/doberview2/wiki/Creating-and-editing-SVGs) wiki page.

## Start
  * run `npm start` or `node app.js` to start  the website on your configured port.