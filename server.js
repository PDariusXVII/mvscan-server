require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");
const path = require("path");

const Livro = require("./models/Livro");
const auth = require("./middleware/auth");

const app = express();

// --- CONFIGURAÇÃO CLOUDINARY ---
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// --- MIDDLEWARE ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/public", express.static(path.join(__dirname, "public")));

// --- MULTER EM MEMÓRIA ---
const storage = multer.memoryStorage();
const upload = multer({ storage });

// --- FUNÇÃO AUXILIAR PARA UPLOAD CLOUDINARY ---
async function uploadToCloudinary(buffer, folder, resource_type = "image") {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
}

// --- ROTAS ---

// Listar livros
app.get("/livros", async (req, res) => {
  try {
    const livros = await Livro.find().sort({ createdAt: -1 });
    res.json(livros);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao listar livros" });
  }
});

// Upload de livro
app.post("/upload", auth, upload.fields([
  { name: "cover", maxCount: 1 },
  { name: "epub", maxCount: 1 }
]), async (req, res) => {
  try {
    const { bookName, authorName } = req.body;
    if (!bookName || !authorName) return res.status(400).send("Preencha todos os campos");
    if (!req.files?.cover?.[0] || !req.files?.epub?.[0]) return res.status(400).send("Nenhum arquivo enviado");

    // Upload capa
    const coverResult = await uploadToCloudinary(req.files.cover[0].buffer, "mvscan/capas");

    // Upload epub
    const epubResult = await uploadToCloudinary(req.files.epub[0].buffer, "mvscan/epubs", "raw");

    const novoLivro = await Livro.create({
      bookName,
      authorName,
      coverUrl: coverResult.secure_url,
      coverId: coverResult.public_id,
      epubUrl: epubResult.secure_url,
      epubId: epubResult.public_id
    });

    res.json(novoLivro);
  } catch (err) {
    console.error(err);
    res.status(500).send("Erro ao enviar livro");
  }
});

// Editar livro
app.put("/edit/:id", auth, async (req, res) => {
  try {
    const { bookName, authorName } = req.body;
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).send("ID inválido");

    await Livro.findByIdAndUpdate(req.params.id, { bookName, authorName });
    res.json({ message: "Livro atualizado com sucesso" });
  } catch (err) {
    console.error(err);
    res.status(500).send("Erro ao editar livro");
  }
});

// Deletar livro
app.delete("/delete/:id", auth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).send("ID inválido");

    const livro = await Livro.findById(req.params.id);
    if (!livro) return res.status(404).send("Livro não encontrado");

    // Deletar arquivos do Cloudinary
    await cloudinary.uploader.destroy(livro.coverId);
    await cloudinary.uploader.destroy(livro.epubId, { resource_type: "raw" });

    // Deletar do MongoDB
    await Livro.findByIdAndDelete(req.params.id);

    res.json({ message: "Livro removido com sucesso" });
  } catch (err) {
    console.error(err);
    res.status(500).send("Erro ao deletar livro");
  }
});

// Painel web
app.get("/", auth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// --- CONEXÃO COM MONGODB ---
const PORT = process.env.PORT || 3000;
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB conectado com sucesso!");
    app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));
  })
  .catch(err => console.error("❌ Erro ao conectar no MongoDB:", err));
