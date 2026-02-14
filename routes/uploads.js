const express = require("express");
const router = express.Router();
const multer = require("multer");
const streamifier = require("streamifier");
const basicAuth = require("express-basic-auth");
const Livro = require("../models/Livro");
const cloudinary = require("../config/cloudinary");

// ========== MULTER MEMÓRIA ==========
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// ========== AUTH ==========
const auth = basicAuth({
  users: { [process.env.ADMIN_USERNAME]: process.env.ADMIN_PASSWORD },
  challenge: true,
  realm: "MV Scan"
});

// ========== FUNÇÃO DE UPLOAD ==========
const uploadToCloudinary = (buffer, folder, resourceType = "image", publicId) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        public_id: publicId || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      },
      (err, result) => err ? reject(err) : resolve(result)
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

// ========== ENDPOINT: CRIAR LIVRO ==========
router.post("/", auth, upload.fields([
  { name: "cover", maxCount: 1 },
  { name: "epub", maxCount: 1 }
]), async (req, res) => {
  try {
    const { bookName, authorName } = req.body;

    if (!bookName || !authorName) {
      return res.status(400).json({ erro: "bookName e authorName são obrigatórios" });
    }
    if (!req.files || !req.files.cover || !req.files.epub) {
      return res.status(400).json({ erro: "Envie capa e arquivo EPUB" });
    }

    // Upload capa (imagem)
    const capa = await uploadToCloudinary(req.files.cover[0].buffer, "mvscan/capas", "image", `cover-${Date.now()}`);

    // Upload EPUB (arquivo raw)
    const epub = await uploadToCloudinary(req.files.epub[0].buffer, "mvscan/epubs", "raw", `epub-${Date.now()}`);

    // Salvar no MongoDB
    const novo = await Livro.create({
      bookName,
      authorName,
      coverUrl: capa.secure_url,
      coverId: capa.public_id,
      epubUrl: epub.secure_url,
      epubId: epub.public_id
    });

    res.status(201).json(novo);
  } catch (err) {
    console.error("Erro no upload:", err);
    res.status(500).json({ erro: err.message });
  }
});

// ========== ENDPOINT: DELETAR LIVRO ==========
router.delete("/:id", auth, async (req, res) => {
  try {
    const livro = await Livro.findById(req.params.id);
    if (!livro) return res.status(404).json({ message: "Livro não encontrado" });

    // Deletar do Cloudinary
    await cloudinary.uploader.destroy(livro.coverId);
    await cloudinary.uploader.destroy(livro.epubId, { resource_type: "raw" });

    // Deletar do MongoDB
    await Livro.findByIdAndDelete(req.params.id);

    res.json({ message: "Livro removido" });
  } catch (err) {
    console.error("Erro ao deletar livro:", err);
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
