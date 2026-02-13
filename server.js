require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

require("./config/database");

const livrosRoute = require("./routes/livros");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir frontend
app.use(express.static(path.join(__dirname, "public")));

// API
app.use("/livros", livrosRoute);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Servidor rodando na porta " + PORT);
});
