const express = require('express');
const db = require('../config/database');
const router = express.Router();

// Liste des commandes
router.get('/', async (req, res) => {
  try {
    const { statut, page = 1 } = req.query;
    const limit = 20;
    const offset = (page - 1) * limit;
    
    let whereClause = '';
    let params = [];
    
    if (statut) {
      whereClause = 'WHERE c.statut = ?';
      params.push(statut);
    }
    
    const [orders] = await db.execute(`
      SELECT c.*, u.prenom, u.nom, u.email
      FROM commandes c
      LEFT JOIN utilisateurs u ON c.utilisateur_id = u.id
      ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);
    
    const [totalResult] = await db.execute(`
      SELECT COUNT(*) as total FROM commandes c ${whereClause}
    `, params);
    
    const totalPages = Math.ceil(totalResult[0].total / limit);
    
    res.render('admin/orders/index', {
      orders,
      currentPage: parseInt(page),
      totalPages,
      statusFilter: statut || 'all',
      selectedStatus: statut || ''
    });
  } catch (error) {
    console.error('Erreur liste commandes:', error);
    res.render('admin/orders/index', { 
      error: 'Erreur lors du chargement des commandes',
      orders: [],
      currentPage: 1,
      totalPages: 1,
      statusFilter: 'all',
      selectedStatus: ''
    });
  }
});

// Détails d'une commande
router.get('/:id', async (req, res) => {
  try {
    const [order] = await db.execute(`
      SELECT c.*, u.prenom, u.nom, u.email, u.telephone
      FROM commandes c
      LEFT JOIN utilisateurs u ON c.utilisateur_id = u.id
      WHERE c.id = ?
    `, [req.params.id]);
    
    if (order.length === 0) {
      return res.redirect('/orders');
    }
    
    const [items] = await db.execute(`
      SELECT ci.*, p.nom as produit_nom
      FROM commande_items ci
      LEFT JOIN variants v ON ci.variant_id = v.id
      LEFT JOIN produits p ON v.produit_id = p.id
      WHERE ci.commande_id = ?
    `, [req.params.id]);
    
    res.render('admin/orders/detail', { order: order[0], items });
  } catch (error) {
    console.error('Erreur détail commande:', error);
    res.redirect('/orders');
  }
});

// Mettre à jour le statut d'une commande
router.post('/:id/status', async (req, res) => {
  try {
    const { statut, numero_suivi, notes_admin } = req.body;
    const orderId = req.params.id;
    
    let updateQuery = 'UPDATE commandes SET statut = ?';
    let params = [statut];
    
    if (numero_suivi) {
      updateQuery += ', numero_suivi = ?';
      params.push(numero_suivi);
    }
    
    if (statut === 'expediee') {
      updateQuery += ', date_expedition = NOW()';
    }
    
    if (notes_admin) {
      updateQuery += ', notes_admin = ?';
      params.push(notes_admin);
    }
    
    updateQuery += ' WHERE id = ?';
    params.push(orderId);
    
    await db.execute(updateQuery, params);
    
    res.redirect(`/orders/${orderId}`);
  } catch (error) {
    console.error('Erreur mise à jour statut:', error);
    res.redirect(`/orders/${req.params.id}`);
  }
});

// Commandes par statut (dashboard)
router.get('/stats/status', async (req, res) => {
  try {
    const [stats] = await db.execute(`
      SELECT statut, COUNT(*) as count, SUM(total) as total_amount
      FROM commandes
      GROUP BY statut
    `);
    
    res.json(stats);
  } catch (error) {
    console.error('Erreur stats commandes:', error);
    res.json({ error: 'Erreur lors du chargement des statistiques' });
  }
});

// API pour récupérer les commandes avec filtres
router.get('/api/admin/orders', async (req, res) => {
  try {
    const { status, period, search, page = 1, limit = 10 } = req.query;
    
    let whereClause = 'WHERE 1=1';
    let params = [];
    
    // Filtre par statut
    if (status) {
      whereClause += ' AND c.statut = ?';
      params.push(status);
    }
    
    // Filtre par période
    if (period) {
      switch (period) {
        case 'today':
          whereClause += ' AND DATE(c.created_at) = CURDATE()';
          break;
        case 'week':
          whereClause += ' AND WEEK(c.created_at) = WEEK(NOW())';
          break;
        case 'month':
          whereClause += ' AND MONTH(c.created_at) = MONTH(NOW()) AND YEAR(c.created_at) = YEAR(NOW())';
          break;
      }
    }
    
    // Filtre par recherche
    if (search) {
      whereClause += ' AND (c.numero_commande LIKE ? OR u.prenom LIKE ? OR u.nom LIKE ? OR u.email LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }
    
    // Compter le total
    const [countResult] = await db.execute(`
      SELECT COUNT(*) as total
      FROM commandes c
      LEFT JOIN utilisateurs u ON c.utilisateur_id = u.id
      ${whereClause}
    `, params);
    
    // Récupérer les commandes avec pagination
    const offset = (page - 1) * limit;
    const [orders] = await db.execute(`
      SELECT c.*, u.prenom, u.nom, u.email
      FROM commandes c
      LEFT JOIN utilisateurs u ON c.utilisateur_id = u.id
      ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), parseInt(offset)]);
    
    res.json({
      success: true,
      orders,
      total: countResult[0].total,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Erreur API commandes:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// API pour les statistiques des commandes
router.get('/api/admin/orders/stats', async (req, res) => {
  try {
    const [stats] = await db.execute(`
      SELECT 
        statut,
        COUNT(*) as count
      FROM commandes
      GROUP BY statut
    `);
    
    const result = {};
    stats.forEach(stat => {
      result[stat.statut] = stat.count;
    });
    
    res.json({ success: true, stats: result });
  } catch (error) {
    console.error('Erreur statistiques commandes:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// API pour récupérer une commande spécifique
router.get('/api/admin/orders/:id', async (req, res) => {
  try {
    const [orders] = await db.execute(`
      SELECT c.*, u.prenom, u.nom, u.email
      FROM commandes c
      LEFT JOIN utilisateurs u ON c.utilisateur_id = u.id
      WHERE c.id = ?
    `, [req.params.id]);
    
    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: 'Commande non trouvée' });
    }
    
    const [items] = await db.execute(`
      SELECT ci.*
      FROM commande_items ci
      WHERE ci.commande_id = ?
    `, [req.params.id]);
    
    res.json({
      success: true,
      order: orders[0],
      items
    });
  } catch (error) {
    console.error('Erreur récupération commande:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// API pour mettre à jour le statut d'une commande
router.put('/api/admin/orders/:id/status', async (req, res) => {
  try {
    const { statut } = req.body;
    
    await db.execute(`
      UPDATE commandes 
      SET statut = ?, updated_at = NOW()
      WHERE id = ?
    `, [statut, req.params.id]);
    
    // Notifier les clients (à implémenter)
    
    res.json({ success: true, message: 'Statut mis à jour' });
  } catch (error) {
    console.error('Erreur mise à jour statut:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// API pour ajouter un numéro de suivi
router.put('/api/admin/orders/:id/tracking', async (req, res) => {
  try {
    const { numero_suivi } = req.body;
    
    await db.execute(`
      UPDATE commandes 
      SET numero_suivi = ?, updated_at = NOW()
      WHERE id = ?
    `, [numero_suivi, req.params.id]);
    
    res.json({ success: true, message: 'Numéro de suivi ajouté' });
  } catch (error) {
    console.error('Erreur ajout numéro suivi:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

module.exports = router;
