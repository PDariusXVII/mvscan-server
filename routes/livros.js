const express = require("express");
const multer = require("multer");
const cloudinary = require("../config/cloudinary");
const Livro = require("../models/Livro");
const auth = require("../middleware/auth");

const router = express.Router();
const upload = multer({ dest: "tmp/" });

/* LISTAR */
router.get("/", async (req, res) => {
  const livros = await Livro.find().sort({ createdAt: -1 });
  res.json(livros);
});

/* CRIAR */
router.post("/", auth, upload.fields([
  { name: "cover", maxCount: 1 },
  { name: "epub", maxCount: 1 }
]), async (req, res) => {
  try {
    const { bookName, authorName } = req.body;

    const capa = await cloudinary.uploader.upload(
      req.files.cover[0].path,
      { folder: "mvscan/capas" }
    );

    const epub = await cloudinary.uploader.upload(
      req.files.epub[0].path,
      { folder: "mvscan/epubs", resource_type: "raw" }
    );

    const novo = await Livro.create({
      bookName,
      authorName,
      coverUrl: capa.secure_url,
      epubUrl: epub.secure_url,
    });

    res.json(novo);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

/* DELETAR */
router.delete("/:id", auth, async (req, res) => {
  await Livro.findByIdAndDelete(req.params.id);
  res.json({ message: "Livro removido" });
});

/* EDITAR */
router.put("/:id", auth, async (req, res) => {
  const { bookName, authorName } = req.body;

  await Livro.findByIdAndUpdate(req.params.id, {
    bookName,
    authorName
  });

  res.json({ message: "Livro atualizado" });
});

module.exports = router;
