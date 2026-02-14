/* CRIAR */
router.post("/", auth, upload.fields([
  { name: "cover", maxCount: 1 },
  { name: "epub", maxCount: 1 }
]), async (req, res) => {
  try {
    const { bookName, authorName } = req.body;

    const capa = await cloudinary.uploader.upload(req.files.cover[0].path, {
      folder: "mvscan/capas"
    });

    const epub = await cloudinary.uploader.upload(req.files.epub[0].path, {
      folder: "mvscan/epubs",
      resource_type: "raw"
    });

    const novo = await Livro.create({
      bookName,
      authorName,
      coverUrl: capa.secure_url,
      coverId: capa.public_id,   // salvar public_id
      epubUrl: epub.secure_url,
      epubId: epub.public_id      // salvar public_id
    });

    res.json(novo);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

/* DELETAR */
router.delete("/:id", auth, async (req, res) => {
  try {
    const livro = await Livro.findById(req.params.id);
    if(!livro) return res.status(404).json({ message: "Livro não encontrado" });

    // Remove do Cloudinary
    await cloudinary.uploader.destroy(livro.coverId);
    await cloudinary.uploader.destroy(livro.epubId, { resource_type: "raw" });

    // Remove do MongoDB
    await Livro.findByIdAndDelete(req.params.id);

    res.json({ message: "Livro removido" });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});
