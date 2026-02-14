const mongoose = require("mongoose");

const livroSchema = new mongoose.Schema({
  bookName: { type: String, required: true },
  authorName: { type: String, required: true },
  coverUrl: { type: String, required: true },  // ✅ CORRIGIDO: coverUrl em vez de cover
  coverId: { type: String, required: true },     // ✅ ADICIONADO: public_id do Cloudinary
  epubUrl: { type: String, required: true },      // ✅ CORRIGIDO: epubUrl em vez de epub
  epubId: { type: String, required: true },       // ✅ ADICIONADO: public_id do Cloudinary
}, { timestamps: true });

module.exports = mongoose.model("Livro", livroSchema);