require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");
const multer = require("multer");

const auth = require("./middleware/auth"); // middleware de autenticação
const Livro = require("./models/Livro");   // modelo do MongoDB

const app = express();

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- MULTER CONFIGURAÇÃO PARA UPLOAD ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});
const upload = multer({ storage });

// --- API PÚBLICA PARA O APP ANDROID ---
app.get("/livros", async (req, res) => {
  try {
    const livros = await Livro.find().sort({ createdAt: -1 });
    res.json(livros);
  } catch (err) {
    console.error("Erro ao listar livros:", err);
    res.status(500).json({ error: "Erro ao listar livros" });
  }
});

// --- UPLOAD DE LIVROS (PAINEL WEB) ---
app.post(
  "/upload",
  auth,
  upload.fields([
    { name: "cover", maxCount: 1 },
    { name: "epub", maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const { bookName, authorName } = req.body;
      if (!bookName || !authorName) return res.status(400).send("Preencha todos os campos");

      if (!req.files || !req.files.cover || !req.files.epub)
        return res.status(400).send("Nenhum arquivo enviado");

      const cover = req.files.cover[0].filename;
      const epub = req.files.epub[0].filename;

      const novoLivro = new Livro({ bookName, authorName, cover, epub });
      await novoLivro.save();

      res.send("Livro enviado com sucesso!");
    } catch (err) {
      console.error("Erro no upload:", err);
      res.status(500).send("Erro ao enviar. Tente novamente.");
    }
  }
);

// --- EDITAR LIVRO (PAINEL WEB) ---
app.put("/edit/:id", auth, async (req, res) => {
  try {
    const { bookName, authorName } = req.body;
    await Livro.findByIdAndUpdate(req.params.id, { bookName, authorName });
    res.send("Livro atualizado com sucesso!");
  } catch (err) {
    console.error("Erro ao editar livro:", err);
    res.status(500).send("Erro ao editar livro");
  }
});

// --- DELETAR LIVRO (PAINEL WEB) ---
app.delete("/delete/:id", auth, async (req, res) => {
  try {
    await Livro.findByIdAndDelete(req.params.id);
    res.send("Livro removido com sucesso!");
  } catch (err) {
    console.error("Erro ao deletar livro:", err);
    res.status(500).send("Erro ao deletar livro");
  }
});

// --- PAINEL WEB PROTEGIDO ---
app.get("/", auth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// --- ARQUIVOS ESTÁTICOS ---
app.use("/public", express.static(path.join(__dirname, "public"))); // CSS/JS
app.use("/uploads", express.static(path.join(__dirname, "uploads"))); // livros e capas

// --- CONFIGURAÇÃO DO SERVIDOR ---
const PORT = process.env.PORT || 3000;

// --- CONEXÃO COM MONGODB ---
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB conectado com sucesso!");
    app.listen(PORT, () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Erro ao conectar no MongoDB:", err);
  });
