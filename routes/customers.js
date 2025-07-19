const express = require('express');
const db = require('../config/database');
const router = express.Router();

// Liste des clients
router.get('/', async (req, res) => {
  try {
    const { search, page = 1 } = req.query;
    const limit = 20;
    const offset = (page - 1) * limit;
    
    let whereClause = '';
    let params = [];
    
    if (search) {
      whereClause = 'WHERE u.nom LIKE ? OR u.prenom LIKE ? OR u.email LIKE ?';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    const [customers] = await db.execute(`
      SELECT u.*, 
             COUNT(c.id) as nb_commandes,
             SUM(c.total) as total_achats,
             MAX(c.created_at) as derniere_commande
      FROM utilisateurs u
      LEFT JOIN commandes c ON u.id = c.utilisateur_id
      ${whereClause}
      GROUP BY u.id
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);
    
    const [totalResult] = await db.execute(`
      SELECT COUNT(*) as total FROM utilisateurs u ${whereClause}
    `, params);
    
    const totalPages = Math.ceil(totalResult[0].total / limit);
    
    res.render('admin/customers/index', { 
      customers, 
      currentPage: parseInt(page), 
      totalPages,
      search: search || ''
    });
  } catch (error) {
    console.error('Erreur liste clients:', error);
    res.render('admin/customers/index', { error: 'Erreur lors du chargement des clients' });
  }
});

// Détails d'un client
router.get('/:id', async (req, res) => {
  try {
    const [customer] = await db.execute('SELECT * FROM utilisateurs WHERE id = ?', [req.params.id]);
    
    if (customer.length === 0) {
      return res.redirect('/customers');
    }
    
    const [orders] = await db.execute(`
      SELECT * FROM commandes WHERE utilisateur_id = ? ORDER BY created_at DESC
    `, [req.params.id]);
    
    const [reviews] = await db.execute(`
      SELECT a.*, p.nom as produit_nom
      FROM avis_clients a
      LEFT JOIN produits p ON a.produit_id = p.id
      WHERE a.utilisateur_id = ?
      ORDER BY a.created_at DESC
    `, [req.params.id]);
    
    res.render('admin/customers/detail', { 
      customer: customer[0], 
      orders,
      reviews
    });
  } catch (error) {
    console.error('Erreur détail client:', error);
    res.redirect('/customers');
  }
});

// Mettre à jour le statut d'un client
router.post('/:id/status', async (req, res) => {
  try {
    const { statut } = req.body;
    
    await db.execute('UPDATE utilisateurs SET statut = ? WHERE id = ?', [statut, req.params.id]);
    
    res.redirect(`/customers/${req.params.id}`);
  } catch (error) {
    console.error('Erreur mise à jour statut client:', error);
    res.redirect(`/customers/${req.params.id}`);
  }
});

module.exports = router;
