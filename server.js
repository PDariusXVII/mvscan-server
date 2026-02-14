const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const basicAuth = require('express-basic-auth');
const streamifier = require('streamifier');
require('dotenv').config();

const app = express();
app.use(express.json());

// Configuração do Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Conexão MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB conectado'))
  .catch(err => {
    console.error('❌ Erro MongoDB:', err);
    process.exit(1);
  });

// Schema do Livro
const livroSchema = new mongoose.Schema({
  bookName: { type: String, required: true },
  authorName: { type: String, required: true },
  coverUrl: { type: String, required: true },
  epubUrl: { type: String, required: true },
  publicIdCapa: { type: String, required: true },
  publicIdEpub: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const Livro = mongoose.model('Livro', livroSchema);

// Auth middleware
const authMiddleware = basicAuth({
  users: { [process.env.ADMIN_USERNAME]: process.env.ADMIN_PASSWORD },
  challenge: true,
  realm: 'Open9 Library'
});

// Multer config - memória
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// Função auxiliar para upload no Cloudinary
const uploadToCloudinary = (buffer, folder, resourceType = 'image', publicId) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: resourceType,
        public_id: publicId || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

// ========== ENDPOINTS PÚBLICOS ==========

// Listar todos os livros
app.get('/api/livros', async (req, res) => {
  try {
    const livros = await Livro.find().sort({ createdAt: -1 });
    res.json(livros);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== ENDPOINTS PROTEGIDOS ==========

// Upload de livro
app.post('/api/upload', authMiddleware, upload.fields([
  { name: 'cover', maxCount: 1 },
  { name: 'epub', maxCount: 1 }
]), async (req, res) => {
  try {
    const { bookName, authorName } = req.body;
    
    if (!req.files.cover || !req.files.epub) {
      return res.status(400).json({ error: 'Envie capa e arquivo EPUB' });
    }

    console.log('📤 Iniciando upload para Cloudinary...');

    // Upload capa (imagem)
    const coverResult = await uploadToCloudinary(
      req.files.cover[0].buffer,
      'open9library/covers',
      'image',
      `cover-${Date.now()}`
    );

    // Upload EPUB (raw)
    const epubResult = await uploadToCloudinary(
      req.files.epub[0].buffer,
      'open9library/epubs',
      'raw',
      `epub-${Date.now()}`
    );

    console.log('✅ Uploads concluídos');

    const novoLivro = new Livro({
      bookName,
      authorName,
      coverUrl: coverResult.secure_url,
      epubUrl: epubResult.secure_url,
      publicIdCapa: coverResult.public_id,
      publicIdEpub: epubResult.public_id
    });

    await novoLivro.save();
    console.log('💾 Livro salvo no MongoDB');
    
    res.status(201).json(novoLivro);
  } catch (error) {
    console.error('❌ Erro no upload:', error);
    res.status(500).json({ error: error.message });
  }
});

// Editar livro
app.put('/api/edit/:id', authMiddleware, async (req, res) => {
  try {
    const { bookName, authorName } = req.body;
    const livro = await Livro.findByIdAndUpdate(
      req.params.id,
      { bookName, authorName },
      { new: true }
    );
    if (!livro) return res.status(404).json({ error: 'Livro não encontrado' });
    res.json(livro);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Deletar livro
app.delete('/api/delete/:id', authMiddleware, async (req, res) => {
  try {
    const livro = await Livro.findById(req.params.id);
    if (!livro) return res.status(404).json({ error: 'Livro não encontrado' });

    console.log('🗑️ Deletando livro:', livro.bookName);

    // Deletar do Cloudinary
    try {
      await cloudinary.uploader.destroy(livro.publicIdCapa);
      console.log('✅ Capa deletada');
    } catch (err) {
      console.error('⚠️ Erro ao deletar capa:', err.message);
    }

    try {
      await cloudinary.uploader.destroy(livro.publicIdEpub, { resource_type: 'raw' });
      console.log('✅ EPUB deletado');
    } catch (err) {
      console.error('⚠️ Erro ao deletar epub:', err.message);
    }

    // Deletar do MongoDB
    await Livro.findByIdAndDelete(req.params.id);
    console.log('✅ Livro deletado do MongoDB');

    res.json({ message: 'Livro deletado com sucesso' });
  } catch (error) {
    console.error('❌ Erro na deleção:', error);
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
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/debug/delete/:id', async (req, res) => {
  try {
    const livro = await Livro.findByIdAndDelete(req.params.id);
    if (!livro) return res.status(404).json({ error: 'Livro não encontrado' });
    res.json({ message: 'Livro deletado (modo debug)', livro });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/debug/delete-all', async (req, res) => {
  try {
    const result = await Livro.deleteMany({});
    res.json({ message: 'Todos os livros deletados', deletedCount: result.deletedCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Servir arquivos estáticos
app.use(express.static('public'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));