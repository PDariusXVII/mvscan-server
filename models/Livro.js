const mongoose = require("mongoose");

const LivroSchema = new mongoose.Schema({
  bookName: { type: String, required: true },
  authorName: { type: String, required: true },
  coverUrl: { type: String, required: true },
  epubUrl: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model("Livro", LivroSchema);
