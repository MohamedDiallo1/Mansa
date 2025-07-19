const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const mysql = require('mysql2');
const db = require('../config/database');

// Middleware pour vérifier l'authentification utilisateur
const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/connexion');
  }
  next();
};

// Route d'accueil
router.get('/', async (req, res) => {
  try {
    // Récupérer les produits phares avec leurs variants
    const [produits] = await db.execute(`
      SELECT p.*, 
             COUNT(v.id) as nb_variants,
             SUM(v.stock_actuel) as stock_total,
             MIN(v.stock_actuel) as stock_min
      FROM produits p
      LEFT JOIN variants v ON p.id = v.produit_id
      WHERE p.statut = 'actif' AND p.visible_catalogue = 1 AND p.produit_phare = 1
      GROUP BY p.id
      ORDER BY p.created_at DESC 
      LIMIT 8
    `);
    
    res.render('user/accueil', { 
      title: 'Mansa - Prêt-à-porter masculin',
      produits,
      user: req.session.user 
    });
  } catch (error) {
    console.error('Erreur accueil:', error);
    res.status(500).send('Erreur serveur');
  }
});

// Route catalogue/boutique
router.get('/boutique', async (req, res) => {
  try {
    const { matiere, type, couleur, taille, prix_min, prix_max, page = 1 } = req.query;
    
    // Base query similar to admin
    let query = `
      SELECT p.*, 
             COUNT(v.id) as nb_variants,
             SUM(v.stock_actuel) as stock_total
      FROM produits p
      LEFT JOIN variants v ON p.id = v.produit_id
      WHERE p.statut = 'actif' AND p.visible_catalogue = 1
    `;
    let queryParams = [];
    
    // Filtres
    if (matiere) {
      query += ` AND p.matiere = ?`;
      queryParams.push(matiere);
    }
    if (type) {
      query += ` AND p.type = ?`;
      queryParams.push(type);
    }
    if (couleur) {
      query += ` AND v.couleur = ?`;
      queryParams.push(couleur);
    }
    if (taille) {
      query += ` AND v.taille = ?`;
      queryParams.push(taille);
    }
    if (prix_min) {
      query += ` AND p.prix_vente >= ?`;
      queryParams.push(prix_min);
    }
    if (prix_max) {
      query += ` AND p.prix_vente <= ?`;
      queryParams.push(prix_max);
    }
    
    query += ` GROUP BY p.id ORDER BY p.created_at DESC`;
    
    const [produits] = await db.execute(query, queryParams);
    
    // Récupérer les filtres disponibles
    const [matieres] = await db.execute(`SELECT DISTINCT matiere FROM produits WHERE statut = 'actif'`);
    const [types] = await db.execute(`SELECT DISTINCT type FROM produits WHERE statut = 'actif'`);
    const [couleurs] = await db.execute(`SELECT DISTINCT couleur FROM variants WHERE disponible = 1`);
    const [tailles] = await db.execute(`SELECT DISTINCT taille FROM variants WHERE disponible = 1`);
    
    res.render('user/boutique', {
      title: 'Boutique - Mansa',
      produits,
      matieres,
      types,
      couleurs,
      tailles,
      filters: { matiere, type, couleur, taille, prix_min, prix_max },
      user: req.session.user
    });
  } catch (error) {
    console.error('Erreur boutique:', error);
    res.status(500).send('Erreur serveur');
  }
});

// API pour récupérer les variants d'un produit
router.get('/api/produit/:id/variants', async (req, res) => {
  try {
    const [variants] = await db.execute(`
      SELECT v.*, p.nom as produit_nom
      FROM variants v
      JOIN produits p ON v.produit_id = p.id
      WHERE v.produit_id = ? AND v.disponible = 1 AND p.statut = 'actif'
    `, [req.params.id]);
    
    res.json({ success: true, variants });
  } catch (error) {
    console.error('Erreur récupération variants:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Route détail produit
router.get('/produit/:id', async (req, res) => {
  try {
    const [produits] = await db.execute(`
      SELECT * FROM produits WHERE id = ? AND statut = 'actif'
    `, [req.params.id]);
    
    if (produits.length === 0) {
      return res.status(404).send('Produit non trouvé');
    }
    
    const produit = produits[0];
    
    // Récupérer les variants
    const [variants] = await db.execute(`
      SELECT * FROM variants WHERE produit_id = ? AND disponible = 1
    `, [req.params.id]);
    
    // Récupérer les avis
    const [avis] = await db.execute(`
      SELECT a.*, u.prenom, u.nom 
      FROM avis_clients a 
      LEFT JOIN utilisateurs u ON a.utilisateur_id = u.id 
      WHERE a.produit_id = ? AND a.statut = 'approuve'
      ORDER BY a.created_at DESC
    `, [req.params.id]);
    
    // Incrémenter le nombre de vues
    await db.execute(`UPDATE produits SET nombre_vues = nombre_vues + 1 WHERE id = ?`, [req.params.id]);
    
    res.render('user/produit', {
      title: `${produit.nom} - Mansa`,
      produit,
      variants,
      avis,
      user: req.session.user
    });
  } catch (error) {
    console.error('Erreur détail produit:', error);
    res.status(500).send('Erreur serveur');
  }
});

// Route connexion (GET)
router.get('/connexion', (req, res) => {
  if (req.session.user) {
    return res.redirect('/');
  }
  res.render('user/connexion', { 
    title: 'Connexion - Mansa',
    error: null 
  });
});

// Route connexion (POST)
router.post('/connexion', async (req, res) => {
  try {
    const { email, mot_de_passe } = req.body;
    
    const [users] = await db.execute(`
      SELECT * FROM utilisateurs WHERE email = ? AND statut = 'actif'
    `, [email]);
    
    if (users.length === 0) {
      return res.render('user/connexion', {
        title: 'Connexion - Mansa',
        error: 'Email ou mot de passe incorrect'
      });
    }
    
    const user = users[0];
    const validPassword = await bcrypt.compare(mot_de_passe, user.mot_de_passe);
    
    if (!validPassword) {
      return res.render('user/connexion', {
        title: 'Connexion - Mansa',
        error: 'Email ou mot de passe incorrect'
      });
    }
    
    req.session.user = {
      id: user.id,
      email: user.email,
      prenom: user.prenom,
      nom: user.nom
    };
    
    // Mettre à jour la dernière connexion
    await db.execute(`UPDATE utilisateurs SET date_derniere_connexion = NOW() WHERE id = ?`, [user.id]);
    
    // Gérer la redirection
    const redirectTo = req.query.redirect || req.body.redirect || '/';
    res.redirect(redirectTo);
  } catch (error) {
    console.error('Erreur connexion:', error);
    res.render('user/connexion', {
      title: 'Connexion - Mansa',
      error: 'Erreur serveur'
    });
  }
});

// Route inscription (GET)
router.get('/inscription', (req, res) => {
  if (req.session.user) {
    return res.redirect('/');
  }
  res.render('user/inscription', { 
    title: 'Inscription - Mansa',
    error: null 
  });
});

// Route inscription (POST)
router.post('/inscription', async (req, res) => {
  try {
    const { civilite, prenom, nom, email, mot_de_passe, confirmer_mot_de_passe, telephone, newsletter } = req.body;
    
    // Vérification des mots de passe
    if (mot_de_passe !== confirmer_mot_de_passe) {
      return res.render('user/inscription', {
        title: 'Inscription - Mansa',
        error: 'Les mots de passe ne correspondent pas'
      });
    }
    
    // Vérifier si l'email existe déjà
    const [existingUsers] = await db.execute(`SELECT id FROM utilisateurs WHERE email = ?`, [email]);
    if (existingUsers.length > 0) {
      return res.render('user/inscription', {
        title: 'Inscription - Mansa',
        error: 'Cette adresse email est déjà utilisée'
      });
    }
    
    // Hacher le mot de passe
    const hashedPassword = await bcrypt.hash(mot_de_passe, 10);
    
    // Créer l'utilisateur
    const [result] = await db.execute(`
      INSERT INTO utilisateurs (civilite, prenom, nom, email, mot_de_passe, telephone, newsletter, source_inscription)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'site')
    `, [civilite, prenom, nom, email, hashedPassword, telephone, newsletter === 'on']);
    
    // Connecter automatiquement l'utilisateur
    req.session.user = {
      id: result.insertId,
      email,
      prenom,
      nom
    };
    
    res.redirect('/');
  } catch (error) {
    console.error('Erreur inscription:', error);
    res.render('user/inscription', {
      title: 'Inscription - Mansa',
      error: 'Erreur serveur'
    });
  }
});

// Route déconnexion
router.post('/deconnexion', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// Route profil
router.get('/profil', requireAuth, async (req, res) => {
  try {
    const [users] = await db.execute(`SELECT * FROM utilisateurs WHERE id = ?`, [req.session.user.id]);
    const user = users[0];
    
    res.render('user/profil', {
      title: 'Mon Profil - Mansa',
      user,
      success: req.query.success,
      error: req.query.error
    });
  } catch (error) {
    console.error('Erreur profil:', error);
    res.status(500).send('Erreur serveur');
  }
});

// Route mise à jour profil
router.post('/profil', requireAuth, async (req, res) => {
  try {
    const { 
      civilite, prenom, nom, email, telephone, date_naissance,
      adresse_ligne1, adresse_ligne2, ville, code_postal, pays, region,
      newsletter, sms_marketing 
    } = req.body;
    
    await db.execute(`
      UPDATE utilisateurs SET 
        civilite = ?, prenom = ?, nom = ?, email = ?, telephone = ?, date_naissance = ?,
        adresse_ligne1 = ?, adresse_ligne2 = ?, ville = ?, code_postal = ?, pays = ?, region = ?,
        newsletter = ?, sms_marketing = ?
      WHERE id = ?
    `, [
      civilite, prenom, nom, email, telephone, date_naissance,
      adresse_ligne1, adresse_ligne2, ville, code_postal, pays, region,
      newsletter === 'on', sms_marketing === 'on',
      req.session.user.id
    ]);
    
    // Mettre à jour la session
    req.session.user.prenom = prenom;
    req.session.user.nom = nom;
    req.session.user.email = email;
    
    res.redirect('/profil?success=1');
  } catch (error) {
    console.error('Erreur mise à jour profil:', error);
    res.redirect('/profil?error=1');
  }
});

// Route panier
router.get('/panier', (req, res) => {
  res.render('user/panier', {
    title: 'Mon Panier - Mansa',
    user: req.session.user
  });
});

// Route mes commandes
router.get('/mes-commandes', requireAuth, async (req, res) => {
  try {
    const [commandes] = await db.execute(`
      SELECT c.*, 
        (SELECT COUNT(*) FROM commande_items ci WHERE ci.commande_id = c.id) as nombre_articles
      FROM commandes c 
      WHERE c.utilisateur_id = ? 
      ORDER BY c.created_at DESC
    `, [req.session.user.id]);
    
    res.render('user/mes-commandes', {
      title: 'Mes Commandes - Mansa',
      commandes,
      user: req.session.user
    });
  } catch (error) {
    console.error('Erreur mes commandes:', error);
    res.status(500).send('Erreur serveur');
  }
});

// Route détail commande
router.get('/commande/:numero', requireAuth, async (req, res) => {
  try {
    const [commandes] = await db.execute(`
      SELECT * FROM commandes WHERE numero_commande = ? AND utilisateur_id = ?
    `, [req.params.numero, req.session.user.id]);
    
    if (commandes.length === 0) {
      return res.status(404).send('Commande non trouvée');
    }
    
    const commande = commandes[0];
    
    const [items] = await db.execute(`
      SELECT * FROM commande_items WHERE commande_id = ?
    `, [commande.id]);
    
    res.render('user/commande', {
      title: `Commande ${commande.numero_commande} - Mansa`,
      commande,
      items,
      user: req.session.user
    });
  } catch (error) {
    console.error('Erreur détail commande:', error);
    res.status(500).send('Erreur serveur');
  }
});

// Route API pour obtenir les variants d'un produit
router.get('/api/produit/:id/variants', async (req, res) => {
  try {
    const [variants] = await db.execute(`
      SELECT * FROM variants WHERE produit_id = ? AND disponible = 1
    `, [req.params.id]);
    
    res.json({ success: true, variants });
  } catch (error) {
    console.error('Erreur variants:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Route page de commande
router.get('/commande', requireAuth, (req, res) => {
  res.render('user/commande', {
    title: 'Finaliser ma commande - Mansa',
    user: req.session.user
  });
});

// Route confirmation de commande
router.get('/commande/confirmation/:numeroCommande', requireAuth, async (req, res) => {
  try {
    const { numeroCommande } = req.params;
    
    // Récupérer les détails de la commande
    const [commandes] = await db.execute(`
      SELECT * FROM commandes 
      WHERE numero_commande = ? AND utilisateur_id = ?
    `, [numeroCommande, req.session.user.id]);
    
    if (commandes.length === 0) {
      return res.redirect('/mes-commandes');
    }
    
    const commande = commandes[0];
    
    res.render('user/confirmation', {
      title: 'Commande confirmée - Mansa',
      user: req.session.user,
      numeroCommande,
      adresseLivraison: JSON.parse(commande.adresse_livraison || '{}'),
      modePaiement: commande.mode_paiement
    });
  } catch (error) {
    console.error('Erreur page confirmation:', error);
    res.redirect('/mes-commandes');
  }
});

// Route mes commandes
router.get('/mes-commandes', requireAuth, async (req, res) => {
  try {
    const [commandes] = await db.execute(`
      SELECT * FROM commandes 
      WHERE utilisateur_id = ?
      ORDER BY created_at DESC
    `, [req.session.user.id]);
    
    res.render('user/mes-commandes', {
      title: 'Mes commandes - Mansa',
      user: req.session.user,
      commandes
    });
  } catch (error) {
    console.error('Erreur mes commandes:', error);
    res.status(500).send('Erreur serveur');
  }
});

// API pour récupérer les articles d'une commande
router.get('/api/commande/:id/items', requireAuth, async (req, res) => {
  try {
    const [items] = await db.execute(`
      SELECT ci.*, p.images
      FROM commande_items ci
      LEFT JOIN variants v ON ci.variant_id = v.id
      LEFT JOIN produits p ON v.produit_id = p.id
      WHERE ci.commande_id = ?
    `, [req.params.id]);
    
    // Vérifier que la commande appartient à l'utilisateur
    const [commandes] = await db.execute(`
      SELECT * FROM commandes 
      WHERE id = ? AND utilisateur_id = ?
    `, [req.params.id, req.session.user.id]);
    
    if (commandes.length === 0) {
      return res.status(403).json({ success: false, message: 'Accès refusé' });
    }
    
    res.json({ success: true, items });
  } catch (error) {
    console.error('Erreur récupération articles commande:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

module.exports = router;
