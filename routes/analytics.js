const express = require('express');
const db = require('../config/database');
const router = express.Router();

// Page analytics générale
router.get('/dashboard', async (req, res) => {
  try {
    // Calcul des bénéfices par produit
    const [benefices] = await db.execute(`
      SELECT 
        p.id,
        p.nom,
        p.prix_achat,
        p.prix_vente,
        p.prix_promo,
        (CASE 
          WHEN p.prix_promo > 0 THEN p.prix_promo - p.prix_achat
          ELSE p.prix_vente - p.prix_achat
        END) as benefice_unitaire,
        (CASE 
          WHEN p.prix_promo > 0 THEN ROUND(((p.prix_promo - p.prix_achat) / p.prix_achat) * 100, 2)
          ELSE ROUND(((p.prix_vente - p.prix_achat) / p.prix_achat) * 100, 2)
        END) as marge_pourcentage,
        SUM(ci.quantite) as total_vendu,
        SUM(ci.prix_total) as chiffre_affaires,
        SUM(ci.quantite * p.prix_achat) as cout_total,
        SUM(ci.prix_total) - SUM(ci.quantite * p.prix_achat) as benefice_total
      FROM produits p
      LEFT JOIN variants v ON p.id = v.produit_id
      LEFT JOIN commande_items ci ON v.id = ci.variant_id
      LEFT JOIN commandes c ON ci.commande_id = c.id
      WHERE c.statut IN ('confirmee', 'preparee', 'expediee', 'livree')
      GROUP BY p.id, p.nom, p.prix_achat, p.prix_vente, p.prix_promo
      ORDER BY benefice_total DESC
    `);

    // Statistiques générales
    const [stats] = await db.execute(`
      SELECT 
        COUNT(DISTINCT p.id) as total_produits,
        COUNT(DISTINCT c.id) as total_commandes,
        SUM(c.total) as chiffre_affaires_total,
        AVG(c.total) as panier_moyen
      FROM produits p
      LEFT JOIN variants v ON p.id = v.produit_id
      LEFT JOIN commande_items ci ON v.id = ci.variant_id
      LEFT JOIN commandes c ON ci.commande_id = c.id
      WHERE c.statut IN ('confirmee', 'preparee', 'expediee', 'livree')
    `);

    // Évolution des ventes par mois
    const [ventesParMois] = await db.execute(`
      SELECT 
        DATE_FORMAT(c.created_at, '%Y-%m') as mois,
        COUNT(c.id) as nombre_commandes,
        SUM(c.total) as chiffre_affaires,
        SUM(ci.quantite * p.prix_achat) as cout_total,
        SUM(c.total) - SUM(ci.quantite * p.prix_achat) as benefice_total
      FROM commandes c
      JOIN commande_items ci ON c.id = ci.commande_id
      JOIN variants v ON ci.variant_id = v.id
      JOIN produits p ON v.produit_id = p.id
      WHERE c.statut IN ('confirmee', 'preparee', 'expediee', 'livree')
      GROUP BY DATE_FORMAT(c.created_at, '%Y-%m')
      ORDER BY mois DESC
      LIMIT 12
    `);

    // Top produits par bénéfice
    const [topProduits] = await db.execute(`
      SELECT 
        p.nom,
        SUM(ci.quantite) as quantite_vendue,
        SUM(ci.prix_total) as chiffre_affaires,
        SUM(ci.quantite * p.prix_achat) as cout_total,
        SUM(ci.prix_total) - SUM(ci.quantite * p.prix_achat) as benefice_total
      FROM produits p
      JOIN variants v ON p.id = v.produit_id
      JOIN commande_items ci ON v.id = ci.variant_id
      JOIN commandes c ON ci.commande_id = c.id
      WHERE c.statut IN ('confirmee', 'preparee', 'expediee', 'livree')
      GROUP BY p.id, p.nom
      ORDER BY benefice_total DESC
      LIMIT 10
    `);

    res.render('admin/analytics/dashboard', {
      benefices,
      stats: stats[0],
      ventesParMois,
      topProduits
    });
  } catch (error) {
    console.error('Erreur analytics:', error);
    res.status(500).send('Erreur serveur');
  }
});

// Page rapports détaillés
router.get('/reports', async (req, res) => {
  try {
    const { type = 'ventes', periode = 'mois' } = req.query;
    
    let query = '';
    let params = [];
    
    if (type === 'ventes') {
      query = `
        SELECT 
          c.numero_commande,
          c.created_at,
          c.total,
          c.statut,
          u.prenom,
          u.nom,
          u.email,
          COUNT(ci.id) as nombre_articles,
          SUM(ci.quantite * p.prix_achat) as cout_total,
          c.total - SUM(ci.quantite * p.prix_achat) as benefice
        FROM commandes c
        LEFT JOIN utilisateurs u ON c.utilisateur_id = u.id
        LEFT JOIN commande_items ci ON c.id = ci.commande_id
        LEFT JOIN variants v ON ci.variant_id = v.id
        LEFT JOIN produits p ON v.produit_id = p.id
        WHERE c.statut IN ('confirmee', 'preparee', 'expediee', 'livree')
        GROUP BY c.id
        ORDER BY c.created_at DESC
        LIMIT 100
      `;
    } else if (type === 'stock') {
      query = `
        SELECT 
          ms.id,
          ms.type,
          ms.quantite,
          ms.stock_avant,
          ms.stock_apres,
          ms.motif,
          ms.created_at,
          v.sku,
          p.nom as produit_nom,
          v.taille,
          v.couleur
        FROM mouvements_stock ms
        JOIN variants v ON ms.variant_id = v.id
        JOIN produits p ON v.produit_id = p.id
        ORDER BY ms.created_at DESC
        LIMIT 100
      `;
    }
    
    const [rapports] = await db.execute(query, params);
    
    res.render('admin/analytics/reports', {
      rapports,
      type,
      periode
    });
  } catch (error) {
    console.error('Erreur rapports:', error);
    res.status(500).send('Erreur serveur');
  }
});

// API pour données graphiques
router.get('/api/charts/benefices', async (req, res) => {
  try {
    const [data] = await db.execute(`
      SELECT 
        DATE_FORMAT(c.created_at, '%Y-%m') as mois,
        SUM(c.total) as chiffre_affaires,
        SUM(ci.quantite * p.prix_achat) as cout_total,
        SUM(c.total) - SUM(ci.quantite * p.prix_achat) as benefice_total
      FROM commandes c
      JOIN commande_items ci ON c.id = ci.commande_id
      JOIN variants v ON ci.variant_id = v.id
      JOIN produits p ON v.produit_id = p.id
      WHERE c.statut IN ('confirmee', 'preparee', 'expediee', 'livree')
      GROUP BY DATE_FORMAT(c.created_at, '%Y-%m')
      ORDER BY mois DESC
      LIMIT 12
    `);
    
    res.json({ success: true, data });
  } catch (error) {
    console.error('Erreur API charts:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// API pour statistiques rapides
router.get('/api/quick-stats', async (req, res) => {
  try {
    // Ventes aujourd'hui
    const [ventesAujourdhui] = await db.execute(`
      SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as ca
      FROM commandes 
      WHERE DATE(created_at) = CURDATE() 
      AND statut IN ('confirmee', 'preparee', 'expediee', 'livree')
    `);

    // Nouveaux clients aujourd'hui
    const [nouveauxClients] = await db.execute(`
      SELECT COUNT(*) as count
      FROM utilisateurs 
      WHERE DATE(created_at) = CURDATE()
    `);

    // Taux de conversion (approximatif)
    const [visites] = await db.execute(`
      SELECT COUNT(DISTINCT utilisateur_id) as visitors
      FROM panier 
      WHERE DATE(created_at) = CURDATE()
    `);

    const tauxConversion = ventesAujourdhui[0].count > 0 && visites[0].visitors > 0 
      ? (ventesAujourdhui[0].count / visites[0].visitors) * 100 
      : 0;

    res.json({
      success: true,
      stats: {
        ventesAujourdhui: ventesAujourdhui[0].count,
        caAujourdhui: parseFloat(ventesAujourdhui[0].ca),
        nouveauxClients: nouveauxClients[0].count,
        tauxConversion: tauxConversion
      }
    });
  } catch (error) {
    console.error('Erreur API quick stats:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Export des données
router.get('/export', async (req, res) => {
  try {
    const { type = 'ventes', periode = 'mois' } = req.query;
    
    let query = '';
    if (type === 'ventes') {
      query = `
        SELECT 
          c.numero_commande,
          c.created_at,
          c.total,
          c.statut,
          u.prenom,
          u.nom,
          u.email,
          COUNT(ci.id) as nombre_articles,
          SUM(ci.quantite * p.prix_achat) as cout_total,
          c.total - SUM(ci.quantite * p.prix_achat) as benefice
        FROM commandes c
        LEFT JOIN utilisateurs u ON c.utilisateur_id = u.id
        LEFT JOIN commande_items ci ON c.id = ci.commande_id
        LEFT JOIN variants v ON ci.variant_id = v.id
        LEFT JOIN produits p ON v.produit_id = p.id
        WHERE c.statut IN ('confirmee', 'preparee', 'expediee', 'livree')
        GROUP BY c.id
        ORDER BY c.created_at DESC
      `;
    }
    
    const [data] = await db.execute(query);
    
    // Générer CSV
    let csv = 'N° Commande,Date,Client,Email,Articles,Total,Bénéfice,Statut\n';
    data.forEach(row => {
      csv += `"${row.numero_commande}","${new Date(row.created_at).toLocaleDateString('fr-FR')}","${row.prenom} ${row.nom}","${row.email}","${row.nombre_articles}","${parseFloat(row.total).toFixed(2)}€","${parseFloat(row.benefice || 0).toFixed(2)}€","${row.statut}"\n`;
    });
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="rapport-${type}-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Erreur export:', error);
    res.status(500).send('Erreur lors de l\'export');
  }
});

module.exports = router;
