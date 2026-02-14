require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");

const livrosRoute = require("./routes/livros");
const auth = require("./middleware/auth"); // middleware de autenticação

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🔹 API para o app (não protegida)
app.use("/livros", livrosRoute);

// 🔹 Página index (upload de livros) – protegida
app.get("/", auth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// 🔹 Servir arquivos estáticos (CSS, JS, imagens)
// Importante: o app pode acessar arquivos de livros que você upou
app.use("/public", express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;

// 🔥 Conexão com MongoDB + start do servidor
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
