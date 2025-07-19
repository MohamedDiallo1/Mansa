const express = require('express');
const db = require('../config/database');
const router = express.Router();

// Liste des avis
router.get('/', async (req, res) => {
  try {
    const { statut, page = 1 } = req.query;
    const limit = 20;
    const offset = (page - 1) * limit;
    
    let whereClause = '';
    let params = [];
    
    if (statut) {
      whereClause = 'WHERE a.statut = ?';
      params.push(statut);
    }
    
    const [reviews] = await db.execute(`
      SELECT a.*, p.nom as produit_nom, u.prenom, u.nom as client_nom
      FROM avis_clients a
      LEFT JOIN produits p ON a.produit_id = p.id
      LEFT JOIN utilisateurs u ON a.utilisateur_id = u.id
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);
    
    const [totalResult] = await db.execute(`
      SELECT COUNT(*) as total FROM avis_clients a ${whereClause}
    `, params);
    
    const totalPages = Math.ceil(totalResult[0].total / limit);
    
    res.render('admin/reviews/index', { 
      reviews, 
      currentPage: parseInt(page), 
      totalPages,
      selectedStatus: statut || ''
    });
  } catch (error) {
    console.error('Erreur liste avis:', error);
    res.render('admin/reviews/index', { error: 'Erreur lors du chargement des avis' });
  }
});

// Détails d'un avis
router.get('/:id', async (req, res) => {
  try {
    const [review] = await db.execute(`
      SELECT a.*, p.nom as produit_nom, u.prenom, u.nom as client_nom, u.email
      FROM avis_clients a
      LEFT JOIN produits p ON a.produit_id = p.id
      LEFT JOIN utilisateurs u ON a.utilisateur_id = u.id
      WHERE a.id = ?
    `, [req.params.id]);
    
    if (review.length === 0) {
      return res.redirect('/reviews');
    }
    
    res.render('admin/reviews/detail', { review: review[0] });
  } catch (error) {
    console.error('Erreur détail avis:', error);
    res.redirect('/reviews');
  }
});

// Approuver/Rejeter un avis
router.post('/:id/moderate', async (req, res) => {
  try {
    const { statut } = req.body;
    const reviewId = req.params.id;
    
    await db.execute('UPDATE avis_clients SET statut = ? WHERE id = ?', [statut, reviewId]);
    
    // Si approuvé, mettre à jour la note moyenne du produit
    if (statut === 'approuve') {
      const [review] = await db.execute('SELECT produit_id, note FROM avis_clients WHERE id = ?', [reviewId]);
      const produit_id = review[0].produit_id;
      
      const [avgResult] = await db.execute(`
        SELECT AVG(note) as note_moyenne, COUNT(*) as nombre_avis
        FROM avis_clients
        WHERE produit_id = ? AND statut = 'approuve'
      `, [produit_id]);
      
      await db.execute(`
        UPDATE produits 
        SET note_moyenne = ?, nombre_avis = ? 
        WHERE id = ?
      `, [avgResult[0].note_moyenne, avgResult[0].nombre_avis, produit_id]);
    }
    
    res.redirect(`/reviews/${reviewId}`);
  } catch (error) {
    console.error('Erreur modération avis:', error);
    res.redirect(`/reviews/${req.params.id}`);
  }
});

module.exports = router;
