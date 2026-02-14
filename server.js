// ================= CONFIGURAÇÕES =================
require('dotenv').config();

// Verificar ENV
const requiredEnv = ['MONGO_URI', 'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
const missingEnv = requiredEnv.filter(env => !process.env[env]);
if (missingEnv.length > 0) {
  console.error('❌ ENV faltando:', missingEnv);
  process.exit(1);
}

require('./config/cloudinary');
require('./config/database');

const express = require('express');
const Livro = require('./models/Livro');

const app = express();

// ⭐ CORS - DEVE VIR PRIMEIRO!
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ================= ROTAS =================

// ⭐ POST /livros - Criar livro
app.post('/livros', async (req, res) => {
  console.log('📥 BODY:', req.body);
  
  try {
    const { bookName, authorName, coverUrl, coverId, epubUrl, epubId } = req.body;
    
    if (!bookName || !authorName || !coverUrl || !epubUrl) {
      return res.status(400).json({ 
        error: "Dados incompletos",
        received: { bookName, authorName, hasCover: !!coverUrl, hasEpub: !!epubUrl }
      });
    }

    const novoLivro = await Livro.create({
      bookName: bookName.trim(),
      authorName: authorName.trim(),
      coverUrl,
      coverId: coverId || '',
      epubUrl,
      epubId: epubId || ''
    });

    console.log('✅ Livro salvo:', novoLivro._id);
    res.status(201).json(novoLivro);

  } catch (error) {
    console.error('❌ ERRO:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /livros
app.get('/livros', async (req, res) => {
  try {
    const livros = await Livro.find().sort({ createdAt: -1 });
    res.json(livros);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /delete/:id
app.delete('/delete/:id', async (req, res) => {
  try {
    const livro = await Livro.findById(req.params.id);
    if (!livro) return res.status(404).json({ error: 'Livro não encontrado' });
    
    try {
      const cloudinary = require('./config/cloudinary');
      if (livro.coverId) await cloudinary.uploader.destroy(livro.coverId);
      if (livro.epubId) await cloudinary.uploader.destroy(livro.epubId, { resource_type: "raw" });
    } catch (e) {
      console.log('⚠️ Cloudinary:', e.message);
    }
    
    await Livro.findByIdAndDelete(req.params.id);
    res.json({ message: 'Livro removido' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /edit/:id
app.put('/edit/:id', async (req, res) => {
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

// ================= ARQUIVOS ESTÁTICOS =================
app.use(express.static('public'));

// ================= INICIAR =================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor na porta ${PORT}`);
});
