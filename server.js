require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");

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

// 🔥 CONEXÃO COM MONGODB + START DO SERVIDOR
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB conectado com sucesso!");

    app.listen(PORT, () => {
      console.log("🚀 Servidor rodando na porta " + PORT);
    });
  })
  .catch((err) => {
    console.error("❌ Erro ao conectar no MongoDB:");
    console.error(err);
  });
