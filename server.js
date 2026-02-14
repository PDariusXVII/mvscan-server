// ================= CONFIGURAÇÕES =================
require('dotenv').config();
require('./config/cloudinary');
require('./config/database');

const express = require('express');
const Livro = require('./models/Livro');

const app = express();

// Middleware essencial
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS (se necessário para debug)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// ================= ROTAS =================

// ⭐ POST /livros - Criar livro (upload direto Cloudinary)
app.post('/livros', async (req, res) => {
  try {
    const { bookName, authorName, coverUrl, coverId, epubUrl, epubId } = req.body;
    
    console.log('📥 POST /livros recebido:', {
      bookName,
      authorName,
      coverUrl: coverUrl ? '✓ presente' : '✗ ausente',
      epubUrl: epubUrl ? '✓ presente' : '✗ ausente'
    });

    // Validação
    if (!bookName || !authorName || !coverUrl || !epubUrl) {
      console.log('❌ Validação falhou:', { bookName, authorName, hasCover: !!coverUrl, hasEpub: !!epubUrl });
      return res.status(400).json({ 
        error: "Dados incompletos",
        required: ['bookName', 'authorName', 'coverUrl', 'epubUrl'],
        received: { bookName, authorName, hasCoverUrl: !!coverUrl, hasEpubUrl: !!epubUrl }
      });
    }

    // Criar no MongoDB
    const novoLivro = await Livro.create({
      bookName,
      authorName,
      coverUrl,
      coverId: coverId || '',
      epubUrl,
      epubId: epubId || ''
    });

    console.log('✅ Livro criado:', novoLivro._id);
    res.status(201).json(novoLivro);

  } catch (error) {
    console.error('❌ Erro ao criar livro:', error);
    res.status(500).json({ 
      error: error.message,
      type: error.name,
      code: error.code 
    });
  }
});

// GET /livros - Listar todos
app.get('/livros', async (req, res) => {
  try {
    const livros = await Livro.find().sort({ createdAt: -1 });
    console.log(`📤 GET /livros - ${livros.length} livros encontrados`);
    res.json(livros);
  } catch (error) {
    console.error('❌ Erro ao listar:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /delete/:id - Remover livro
app.delete('/delete/:id', async (req, res) => {
  try {
    const livro = await Livro.findById(req.params.id);
    if (!livro) {
      return res.status(404).json({ error: 'Livro não encontrado' });
    }
    
    // Deletar do Cloudinary
    try {
      const cloudinary = require('./config/cloudinary');
      if (livro.coverId) {
        await cloudinary.uploader.destroy(livro.coverId);
        console.log('🗑️ Capa deletada do Cloudinary');
      }
      if (livro.epubId) {
        await cloudinary.uploader.destroy(livro.epubId, { resource_type: "raw" });
        console.log('🗑️ EPUB deletado do Cloudinary');
      }
    } catch (cloudErr) {
      console.log('⚠️ Erro ao deletar do Cloudinary:', cloudErr.message);
    }
    
    await Livro.findByIdAndDelete(req.params.id);
    console.log('✅ Livro deletado:', req.params.id);
    res.json({ message: 'Livro removido com sucesso' });
    
  } catch (error) {
    console.error('❌ Erro ao deletar:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /edit/:id - Editar livro
app.put('/edit/:id', async (req, res) => {
  try {
    const { bookName, authorName } = req.body;
    
    if (!bookName || !authorName) {
      return res.status(400).json({ error: 'Nome e autor são obrigatórios' });
    }

    const livro = await Livro.findByIdAndUpdate(
      req.params.id,
      { bookName, authorName },
      { new: true }
    );
    
    if (!livro) {
      return res.status(404).json({ error: 'Livro não encontrado' });
    }
    
    console.log('✅ Livro editado:', livro._id);
    res.json(livro);
    
  } catch (error) {
    console.error('❌ Erro ao editar:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== ROTAS DE DEBUG ==========

// GET /api/debug/livros - Debug completo
app.get('/api/debug/livros', async (req, res) => {
  try {
    const livros = await Livro.find({});
    res.json({
      total: livros.length,
      database: 'conectada',
      timestamp: new Date().toISOString(),
      livros: livros.map(l => ({
        id: l._id,
        bookName: l.bookName,
        authorName: l.authorName,
        temCoverUrl: !!l.coverUrl,
        temEpubUrl: !!l.epubUrl,
        coverUrl: l.coverUrl?.substring(0, 60) + '...',
        epubUrl: l.epubUrl?.substring(0, 60) + '...',
        criadoEm: l.createdAt
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message, database: 'erro' });
  }
});

// DELETE /api/debug/delete-all - Limpar tudo
app.delete('/api/debug/delete-all', async (req, res) => {
  try {
    const result = await Livro.deleteMany({});
    res.json({ 
      message: 'Todos os livros deletados',
      deletedCount: result.deletedCount 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/health - Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'conectada' : 'desconectada'
  });
});

// ================= ARQUIVOS ESTÁTICOS =================
app.use(express.static('public'));

// ================= TRATAMENTO DE ERROS =================
app.use((err, req, res, next) => {
  console.error('💥 Erro não tratado:', err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

// ================= INICIAR SERVIDOR =================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📁 MongoDB: ${process.env.MONGO_URI ? 'URI configurada' : '⚠️ URI não encontrada'}`);
  console.log(`☁️  Cloudinary: ${process.env.CLOUDINARY_CLOUD_NAME || '⚠️ não configurado'}`);
});
