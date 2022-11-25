# doberview2
A NodeJS-based web frontend for Doberman v5

## Setup

`npm install` probably to start, it's been a while since I did this.

You'll also need to set a few environment variables:
- `DOBERVIEW_HOST`: the hostname of the machine that hosts the website
- `DOBERVIEW_PORT`: the port number that the website should listen on
- `DOBERVIEW_EXPERIMENT`: the name of the experiment this instance works for. Should match things in Doberman.
- `DOBERVIEW_AUTH_DB`: the database in MongoDB to authorize against. Uses `admin` if unspecified.
- `DOBERVIEW_MONGO_URI`: the URI to connect to mongo. Should look like `mongodb://{username}:{password}@{host}:{port}`. Do not add `/{auth_db}`.
