
use strict;


class Database {
  constructor(db) {
    this.db = db; // this is a Monk db, see https://automattic.github.io/monk/
  }
}

exports.Database = Database;
