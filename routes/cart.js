const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Middleware pour vérifier l'authentification
const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ success: false, message: 'Connexion requise' });
  }
  next();
};

// Obtenir le panier
router.get('/api/panier', requireAuth, async (req, res) => {
  try {
    const [items] = await db.execute(`
      SELECT 
        p.id, p.nom, p.prix_vente, p.images,
        v.id as variant_id, v.sku, v.taille, v.couleur, v.stock_actuel,
        pa.quantite
      FROM panier pa
      JOIN variants v ON pa.variant_id = v.id
      JOIN produits p ON v.produit_id = p.id
      WHERE pa.utilisateur_id = ?
    `, [req.session.user.id]);
    
    const total = items.reduce((sum, item) => {
      const prix = item.prix_vente;
      return sum + (prix * item.quantite);
    }, 0);
    
    res.json({
      success: true,
      items,
      total,
      nombre_articles: items.reduce((sum, item) => sum + item.quantite, 0)
    });
  } catch (error) {
    console.error('Erreur récupération panier:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Ajouter au panier
router.post('/api/panier/ajouter', requireAuth, async (req, res) => {
  try {
    const { variant_id, quantite = 1 } = req.body;
    
    // Vérifier que le variant existe et est disponible
    const [variants] = await db.execute(`
      SELECT v.*, p.nom as produit_nom
      FROM variants v
      JOIN produits p ON v.produit_id = p.id
      WHERE v.id = ? AND v.disponible = 1 AND p.statut = 'actif'
    `, [variant_id]);
    
    if (variants.length === 0) {
      return res.status(400).json({ success: false, message: 'Produit non disponible' });
    }
    
    const variant = variants[0];
    
    // Vérifier le stock
    if (variant.stock_actuel < quantite) {
      return res.status(400).json({ 
        success: false, 
        message: `Stock insuffisant. Quantité disponible: ${variant.stock_actuel}` 
      });
    }
    
    // Vérifier si l'article est déjà dans le panier
    const [existingItems] = await db.execute(`
      SELECT quantite FROM panier WHERE utilisateur_id = ? AND variant_id = ?
    `, [req.session.user.id, variant_id]);
    
    if (existingItems.length > 0) {
      // Mettre à jour la quantité
      const nouvelleQuantite = existingItems[0].quantite + parseInt(quantite);
      
      if (nouvelleQuantite > variant.stock_actuel) {
        return res.status(400).json({ 
          success: false, 
          message: `Stock insuffisant. Quantité disponible: ${variant.stock_actuel}` 
        });
      }
      
      await db.execute(`
        UPDATE panier SET quantite = ? WHERE utilisateur_id = ? AND variant_id = ?
      `, [nouvelleQuantite, req.session.user.id, variant_id]);
    } else {
      // Ajouter nouvel article
      await db.execute(`
        INSERT INTO panier (utilisateur_id, variant_id, quantite) VALUES (?, ?, ?)
      `, [req.session.user.id, variant_id, quantite]);
    }
    
    res.json({ 
      success: true, 
      message: `${variant.produit_nom} ajouté au panier` 
    });
  } catch (error) {
    console.error('Erreur ajout panier:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Modifier quantité dans le panier
router.post('/api/panier/modifier', requireAuth, async (req, res) => {
  try {
    const { variant_id, quantite } = req.body;
    
    if (quantite <= 0) {
      return res.status(400).json({ success: false, message: 'Quantité invalide' });
    }
    
    // Vérifier le stock
    const [variants] = await db.execute(`
      SELECT stock_actuel FROM variants WHERE id = ?
    `, [variant_id]);
    
    if (variants.length === 0) {
      return res.status(400).json({ success: false, message: 'Produit non trouvé' });
    }
    
    if (variants[0].stock_actuel < quantite) {
      return res.status(400).json({ 
        success: false, 
        message: `Stock insuffisant. Quantité disponible: ${variants[0].stock_actuel}` 
      });
    }
    
    await db.execute(`
      UPDATE panier SET quantite = ? WHERE utilisateur_id = ? AND variant_id = ?
    `, [quantite, req.session.user.id, variant_id]);
    
    res.json({ success: true, message: 'Quantité mise à jour' });
  } catch (error) {
    console.error('Erreur modification panier:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Supprimer du panier
router.post('/api/panier/supprimer', requireAuth, async (req, res) => {
  try {
    const { variant_id } = req.body;
    
    await db.execute(`
      DELETE FROM panier WHERE utilisateur_id = ? AND variant_id = ?
    `, [req.session.user.id, variant_id]);
    
    res.json({ success: true, message: 'Article supprimé du panier' });
  } catch (error) {
    console.error('Erreur suppression panier:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Vider le panier
router.post('/api/panier/vider', requireAuth, async (req, res) => {
  try {
    await db.execute(`
      DELETE FROM panier WHERE utilisateur_id = ?
    `, [req.session.user.id]);
    
    res.json({ success: true, message: 'Panier vidé' });
  } catch (error) {
    console.error('Erreur vidage panier:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Obtenir le nombre d'articles dans le panier (pour la navbar)
router.get('/api/panier/count', requireAuth, async (req, res) => {
  try {
    const [result] = await db.execute(`
      SELECT SUM(quantite) as total FROM panier WHERE utilisateur_id = ?
    `, [req.session.user.id]);
    
    const count = result[0].total || 0;
    res.json({ success: true, count });
  } catch (error) {
    console.error('Erreur comptage panier:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Finaliser une commande
router.post('/api/commande/finaliser', requireAuth, async (req, res) => {
  try {
    const { adresse_livraison, mode_paiement, notes_client } = req.body;
    
    // Récupérer les articles du panier
    const [items] = await db.execute(`
      SELECT 
        p.id as produit_id, p.nom, p.prix_vente, p.prix_achat,
        v.id as variant_id, v.sku, v.taille, v.couleur, v.stock_actuel,
        pa.quantite
      FROM panier pa
      JOIN variants v ON pa.variant_id = v.id
      JOIN produits p ON v.produit_id = p.id
      WHERE pa.utilisateur_id = ?
    `, [req.session.user.id]);
    
    if (items.length === 0) {
      return res.status(400).json({ success: false, message: 'Panier vide' });
    }
    
    // Vérifier le stock
    for (const item of items) {
      if (item.stock_actuel < item.quantite) {
        return res.status(400).json({ 
          success: false, 
          message: `Stock insuffisant pour ${item.nom} (${item.taille} - ${item.couleur})` 
        });
      }
    }
    
    // Calculer les totaux
    const sous_total = items.reduce((sum, item) => sum + (item.prix_vente * item.quantite), 0);
    const frais_livraison = sous_total >= 150 ? 0 : 9.90;
    const total = sous_total + frais_livraison;
    
    // Générer numéro de commande
    const numero_commande = `CMD-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    
    // Récupérer info utilisateur
    const [user] = await db.execute('SELECT * FROM utilisateurs WHERE id = ?', [req.session.user.id]);
    
    // Utiliser une connection pour gérer les transactions
    const connection = await db.getConnection();
    
    try {
      await connection.query('START TRANSACTION');
      
      // Créer la commande
      const [orderResult] = await connection.execute(`
        INSERT INTO commandes (
          numero_commande, utilisateur_id, statut, statut_paiement, 
          sous_total, frais_livraison, total, 
          adresse_livraison, mode_paiement, notes_client
        ) VALUES (?, ?, 'en_attente', 'en_attente', ?, ?, ?, ?, ?, ?)
      `, [
        numero_commande, req.session.user.id, sous_total, frais_livraison, total,
        JSON.stringify(adresse_livraison), mode_paiement, notes_client
      ]);
      
      const commande_id = orderResult.insertId;
      
      // Ajouter les articles de commande
      for (const item of items) {
        await connection.execute(`
          INSERT INTO commande_items (
            commande_id, variant_id, nom_produit, sku, taille, couleur,
            quantite, prix_unitaire, prix_total
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          commande_id, item.variant_id, item.nom, item.sku, 
          item.taille, item.couleur, item.quantite, 
          item.prix_vente, item.prix_vente * item.quantite
        ]);
        
        // Mettre à jour le stock
        await connection.execute(
          'UPDATE variants SET stock_actuel = stock_actuel - ? WHERE id = ?',
          [item.quantite, item.variant_id]
        );
        
        // Enregistrer mouvement de stock
        await connection.execute(`
          INSERT INTO mouvements_stock (variant_id, type, quantite, stock_avant, stock_apres, motif, commande_id)
          VALUES (?, 'sortie', ?, ?, ?, 'vente', ?)
        `, [
          item.variant_id, -item.quantite, item.stock_actuel, 
          item.stock_actuel - item.quantite, commande_id
        ]);
      }
      
      // Vider le panier
      await connection.execute('DELETE FROM panier WHERE utilisateur_id = ?', [req.session.user.id]);
      
      await connection.query('COMMIT');
      
      // Envoyer notification en temps réel aux admins
      const io = req.app.get('io');
      if (io) {
        io.to('admins').emit('new-order', {
          id: commande_id,
          numero_commande,
          client: `${user[0].prenom} ${user[0].nom}`,
          total: total.toFixed(2),
          articles: items.length,
          timestamp: new Date()
        });
      }
      
      res.json({
        success: true,
        message: 'Commande créée avec succès',
        numero_commande,
        commande_id
      });
      
    } catch (error) {
      await connection.query('ROLLBACK');
      throw error;
    } finally {
      connection.release();
    }
    
  } catch (error) {
    console.error('Erreur finalisation commande:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la création de la commande' });
  }
});

// Transférer le panier temporaire après connexion
router.post('/api/panier/transferer-temp', requireAuth, async (req, res) => {
  try {
    const { tempCart } = req.body;
    
    if (!tempCart || !Array.isArray(tempCart)) {
      return res.json({ success: true, message: 'Aucun panier temporaire' });
    }
    
    let transferredCount = 0;
    
    for (const item of tempCart) {
      try {
        // Vérifier que le variant existe encore
        const [variants] = await db.execute(`
          SELECT id, stock_actuel FROM variants WHERE id = ?
        `, [item.variant_id]);
        
        if (variants.length === 0 || variants[0].stock_actuel < item.quantite) {
          continue; // Ignorer les articles non disponibles
        }
        
        // Vérifier si l'article est déjà dans le panier
        const [existing] = await db.execute(`
          SELECT quantite FROM panier WHERE utilisateur_id = ? AND variant_id = ?
        `, [req.session.user.id, item.variant_id]);
        
        if (existing.length > 0) {
          // Mettre à jour la quantité
          await db.execute(`
            UPDATE panier SET quantite = quantite + ? WHERE utilisateur_id = ? AND variant_id = ?
          `, [item.quantite, req.session.user.id, item.variant_id]);
        } else {
          // Ajouter au panier
          await db.execute(`
            INSERT INTO panier (utilisateur_id, variant_id, quantite) VALUES (?, ?, ?)
          `, [req.session.user.id, item.variant_id, item.quantite]);
        }
        
        transferredCount++;
      } catch (error) {
        console.error('Erreur transfert article:', error);
        // Continuer avec les autres articles
      }
    }
    
    res.json({ 
      success: true, 
      message: `${transferredCount} article(s) transféré(s) dans votre panier`,
      transferred: transferredCount
    });
    
  } catch (error) {
    console.error('Erreur transfert panier temporaire:', error);
    res.status(500).json({ success: false, message: 'Erreur lors du transfert' });
  }
});

module.exports = router;
