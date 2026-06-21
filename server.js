require("dotenv").config();

const app = require("./src/app");
const connectDatabase = require("./src/config/database");

const PORT = process.env.PORT || 5000;

/*
Database Connection
*/

connectDatabase();

/*
Start Server
*/

app.listen(PORT, () => {
  console.log(` Server running on port ${PORT}`);
});