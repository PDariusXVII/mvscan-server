require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");
const multer = require("multer"); // para upload de arquivos

const livrosRoute = require("./routes/livros");
const auth = require("./middleware/auth"); // middleware de autenticação

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🔹 API para o app (não protegida)
app.use("/livros", livrosRoute);

// 🔹 Configuração do multer (upload de livros)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // salva na pasta uploads
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname); // evita conflitos
  }
});
const upload = multer({ storage });

// 🔹 Rota de upload de livros – protegida
app.post("/upload", auth, upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).send("Nenhum arquivo enviado");
  res.send("Arquivo enviado com sucesso!");
});

// 🔹 Página index (upload de livros) – protegida
app.get("/", auth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// 🔹 Servir arquivos estáticos (CSS, JS, imagens)
app.use("/public", express.static(path.join(__dirname, "public")));

// 🔹 Servir arquivos enviados (livros) – pode ser acessado pelo app
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

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
<<<<<<< HEAD
  });
=======
  });
>>>>>>> 7782011f08e8a019686340380b48af341e655937
