const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../config/database');
const router = express.Router();

// Page de connexion
router.get('/login', (req, res) => {
  res.render('admin/login');
});

// Authentification
router.post('/auth', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const [rows] = await db.execute(
      'SELECT * FROM admin WHERE email = ?',
      [email]
    );
    
    if (rows.length === 0) {
      return res.render('admin/login', { error: 'Email ou mot de passe incorrect' });
    }
    
    const admin = rows[0];
    const isValid = await bcrypt.compare(password, admin.mot_de_passe);
    
    if (!isValid) {
      return res.render('admin/login', { error: 'Email ou mot de passe incorrect' });
    }
    
    req.session.admin = admin;
    
    // Mettre à jour la dernière connexion
    await db.execute(
      'UPDATE admin SET derniere_connexion = NOW() WHERE id = ?',
      [admin.id]
    );
    
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Erreur d\'authentification:', error);
    res.render('admin/login', { error: 'Erreur serveur' });
  }
});

// Dashboard principal
router.get('/dashboard', async (req, res) => {
  try {
    // Statistiques rapides
    const [products] = await db.execute('SELECT COUNT(*) as total FROM produits WHERE statut = "actif"');
    const [orders] = await db.execute('SELECT COUNT(*) as total FROM commandes WHERE statut != "annulee"');
    const [customers] = await db.execute('SELECT COUNT(*) as total FROM utilisateurs WHERE statut = "actif"');
    const [reviews] = await db.execute('SELECT COUNT(*) as total FROM avis_clients WHERE statut = "en_attente"');
    
    // Commandes récentes
    const [recentOrders] = await db.execute(`
      SELECT c.*, u.prenom, u.nom 
      FROM commandes c 
      LEFT JOIN utilisateurs u ON c.utilisateur_id = u.id 
      ORDER BY c.created_at DESC 
      LIMIT 5
    `);
    
    // Produits en rupture
    const [lowStock] = await db.execute(`
      SELECT p.nom, v.taille, v.couleur, v.stock_actuel, v.stock_minimum
      FROM variants v
      JOIN produits p ON v.produit_id = p.id
      WHERE v.stock_actuel <= v.stock_minimum
      ORDER BY v.stock_actuel ASC
      LIMIT 10
    `);
    
    res.render('admin/dashboard/index', {
      stats: {
        products: products[0].total,
        orders: orders[0].total,
        customers: customers[0].total,
        pendingReviews: reviews[0].total
      },
      recentOrders,
      lowStock
    });
  } catch (error) {
    console.error('Erreur dashboard:', error);
    res.render('dashboard', { error: 'Erreur lors du chargement du dashboard' });
  }
});

// Déconnexion
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});


// Redirection racine vers dashboard
router.get('/', (req, res) => {
  res.redirect('/dashboard');
});

module.exports = router;
