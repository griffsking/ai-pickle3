const express = require("express");
const path = require("path");

const app = express();

app.use(express.static(__dirname + "/src"));

app.get("/", (req, res) => {
  res.sendFile(path.resolve(__dirname + "/index.html"));
});

app.listen(process.env.port || 8080, () => {
  console.log("Server is listening on port 8080");
  console.log(path.resolve(__dirname + "/index.html"));
});