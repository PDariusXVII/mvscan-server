const mongoose = require("mongoose");

const livroSchema = new mongoose.Schema({
  bookName: { type: String, required: true },
  authorName: { type: String, required: true },
  cover: { type: String, required: true },
  epub: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model("Livro", livroSchema);
