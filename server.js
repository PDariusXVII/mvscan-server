require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");

const livrosRoute = require("./routes/livros");
const auth = require("./middleware/auth"); // <- import do middleware

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🔹 SERVIR FRONTEND (PÁGINAS WEB PROTEGIDAS)
app.get("/", auth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Se tiver outras páginas web administrativas, use:
// app.get("/admin", auth, (req, res) => { ... });

// 🔹 API (ACESSO DO APP - NÃO PROTEGIDO)
app.use("/livros", livrosRoute);

// 🔹 SERVIR ARQUIVOS ESTÁTICOS (CSS, JS, Imagens) - se quiser proteger:
// app.use("/public", auth, express.static(path.join(__dirname, "public")));
// Ou deixar público para o app:
// app.use(express.static(path.join(__dirname, "public")));

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
