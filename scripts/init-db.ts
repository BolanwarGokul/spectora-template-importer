import { database } from "../src/lib/db";
database()
  .then((db) => {
    console.log("Database initialized.");
    db.close();
  })
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  });
