// ================= CONFIGURAÇÕES =================
require('dotenv').config();
require('./config/cloudinary'); // Cloudinary já configurado
require('./config/database');   // Conecta ao MongoDB

const express = require('express');
const Livro = require('./models/Livro');
const uploadRouter = require('./routes/upload'); // router de upload
const basicAuth = require('express-basic-auth');

const app = express();
app.use(express.json());

// ================= ROTAS =================

// Rotas de upload
app.use('/api/upload', uploadRouter);

// Listar todos os livros (público)
app.get('/api/livros', async (req, res) => {
  try {
    const livros = await Livro.find().sort({ createdAt: -1 });
    res.json(livros);
  } catch (error) {
    console.error("Erro ao listar livros:", error);
    res.status(500).json({ error: error.message });
  }
});

// ========== ENDPOINTS DE DEBUG ==========
app.get('/api/debug/livros', async (req, res) => {
  try {
    const livros = await Livro.find({});
    res.json({
      total: livros.length,
      livros: livros.map(l => ({
        id: l._id,
        bookName: l.bookName,
        authorName: l.authorName,
        temCover: !!l.coverUrl,
        temEpub: !!l.epubUrl,
        coverUrl: l.coverUrl,
        epubUrl: l.epubUrl
      }))
    });
  } catch (error) {
    console.error("Erro debug listar livros:", error);
    res.status(500).json({ error: error.message });
  }
});

// Deletar um livro no modo debug (sem Cloudinary)
app.delete('/api/debug/delete/:id', async (req, res) => {
  try {
    const livro = await Livro.findByIdAndDelete(req.params.id);
    if (!livro) return res.status(404).json({ error: 'Livro não encontrado' });
    res.json({ message: 'Livro deletado (modo debug)', livro });
  } catch (error) {
    console.error("Erro debug delete livro:", error);
    res.status(500).json({ error: error.message });
  }
});

// Deletar todos os livros no modo debug
app.delete('/api/debug/delete-all', async (req, res) => {
  try {
    const result = await Livro.deleteMany({});
    res.json({ message: 'Todos os livros deletados', deletedCount: result.deletedCount });
  } catch (error) {
    console.error("Erro debug delete-all:", error);
    res.status(500).json({ error: error.message });
  }
});

// ================= ARQUIVOS ESTÁTICOS =================
app.use(express.static('public'));

// ================= INICIAR SERVIDOR =================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));
