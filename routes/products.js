const express = require('express');
const db = require('../config/database');
const upload = require('../config/multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Liste des produits
router.get('/', async (req, res) => {
  try {
    const [products] = await db.execute(`
      SELECT p.*, 
             COUNT(v.id) as nb_variants,
             SUM(v.stock_actuel) as stock_total
      FROM produits p
      LEFT JOIN variants v ON p.id = v.produit_id
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `);
    
    res.render('admin/products/index', { products });
  } catch (error) {
    console.error('Erreur liste produits:', error);
    res.render('admin/products/index', { error: 'Erreur lors du chargement des produits' });
  }
});

// Formulaire d'ajout de produit
router.get('/add', (req, res) => {
  res.render('admin/products/add');
});

// Ajouter un produit
router.post('/add', upload.array('images', 5), async (req, res) => {
  try {
    const {
      nom, description_courte, description_longue,
      matiere, type, categorie,
      prix_achat, prix_vente, prix_promo
    } = req.body;
    
    // Générer un slug unique
    let baseSlug = nom.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    let slug = baseSlug;
    let counter = 1;
    
    // Vérifier si le slug existe déjà et l'incrémenter si nécessaire
    while (true) {
      const [existing] = await db.execute('SELECT id FROM produits WHERE slug = ?', [slug]);
      if (existing.length === 0) break;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    
    // Traiter les images uploadées
    let images = { principale: null, galerie: [] };
    if (req.files && req.files.length > 0) {
      images.principale = req.files[0].filename;
      images.galerie = req.files.slice(1).map(file => file.filename);
    }
    
    const [result] = await db.execute(`
      INSERT INTO produits (nom, slug, description_courte, description_longue, 
                           matiere, type, categorie, prix_achat, prix_vente, prix_promo, images)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [nom, slug, description_courte, description_longue, matiere, type, categorie, prix_achat, prix_vente, prix_promo, JSON.stringify(images)]);
    
    res.redirect(`/products/${result.insertId}/variants`);
  } catch (error) {
    console.error('Erreur ajout produit:', error);
    res.render('admin/products/add', { error: 'Erreur lors de l\'ajout du produit' });
  }
});

// Gestion des variants d'un produit
router.get('/:id/variants', async (req, res) => {
  try {
    const [product] = await db.execute('SELECT * FROM produits WHERE id = ?', [req.params.id]);
    const [variants] = await db.execute('SELECT * FROM variants WHERE produit_id = ?', [req.params.id]);
    
    if (product.length === 0) {
      return res.redirect('/products');
    }
    
    res.render('admin/products/variants', { product: product[0], variants });
  } catch (error) {
    console.error('Erreur variants:', error);
    res.redirect('/products');
  }
});

// Ajouter un variant
router.post('/:id/variants', async (req, res) => {
  try {
    const { taille, couleur, couleur_hex, stock_actuel, cout_unitaire, emplacement_stock } = req.body;
    const produit_id = req.params.id;
    
    // Générer le SKU
    const [product] = await db.execute('SELECT nom FROM produits WHERE id = ?', [produit_id]);
    const sku = `${product[0].nom.substring(0, 3).toUpperCase()}${produit_id}-${taille}-${couleur.toUpperCase()}`;
    
    await db.execute(`
      INSERT INTO variants (produit_id, sku, taille, couleur, couleur_hex, stock_actuel, cout_unitaire, emplacement_stock)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [produit_id, sku, taille, couleur, couleur_hex, stock_actuel, cout_unitaire, emplacement_stock]);
    
    res.redirect(`/products/${produit_id}/variants`);
  } catch (error) {
    console.error('Erreur ajout variant:', error);
    res.redirect(`/products/${req.params.id}/variants`);
  }
});

// Édition d'un produit
router.get('/:id/edit', async (req, res) => {
  try {
    const [product] = await db.execute('SELECT * FROM produits WHERE id = ?', [req.params.id]);
    
    if (product.length === 0) {
      return res.redirect('/products');
    }
    
    res.render('admin/products/edit', { product: product[0] });
  } catch (error) {
    console.error('Erreur édition produit:', error);
    res.redirect('/products');
  }
});

// Mettre à jour un produit
router.post('/:id/edit', upload.array('images', 5), async (req, res) => {
  try {
    const {
      nom, description_courte, description_longue,
      matiere, type, categorie,
      prix_achat, prix_vente, prix_promo, statut,
      keep_images
    } = req.body;
    
    // Récupérer les images actuelles
    const [currentProduct] = await db.execute('SELECT images FROM produits WHERE id = ?', [req.params.id]);
    let currentImages = { principale: null, galerie: [] };
    
    if (currentProduct[0].images) {
      try {
        currentImages = JSON.parse(currentProduct[0].images);
      } catch (e) {
        console.log('Erreur parsing images actuelles:', e);
      }
    }
    
    // Traiter les nouvelles images si uploadées
    let images = currentImages;
    if (req.files && req.files.length > 0) {
      // Supprimer les anciennes images si demandé
      if (!keep_images) {
        if (currentImages.principale) {
          try {
            fs.unlinkSync(path.join('public/uploads/products/', currentImages.principale));
          } catch (e) { console.log('Erreur suppression image principale:', e); }
        }
        if (currentImages.galerie) {
          currentImages.galerie.forEach(img => {
            try {
              fs.unlinkSync(path.join('public/uploads/products/', img));
            } catch (e) { console.log('Erreur suppression image galerie:', e); }
          });
        }
      }
      
      images = { 
        principale: req.files[0] ? req.files[0].filename : currentImages.principale,
        galerie: req.files.slice(1).map(file => file.filename)
      };
    }
    
    await db.execute(`
      UPDATE produits 
      SET nom = ?, description_courte = ?, description_longue = ?, 
          matiere = ?, type = ?, categorie = ?, 
          prix_achat = ?, prix_vente = ?, prix_promo = ?, statut = ?, images = ?
      WHERE id = ?
    `, [nom, description_courte, description_longue, matiere, type, categorie, prix_achat, prix_vente, prix_promo, statut, JSON.stringify(images), req.params.id]);
    
    res.redirect('/products');
  } catch (error) {
    console.error('Erreur mise à jour produit:', error);
    res.redirect(`/products/${req.params.id}/edit`);
  }
});

// Gestion des stocks
router.get('/stock', async (req, res) => {
  try {
    const [variants] = await db.execute(`
      SELECT v.*, p.nom as produit_nom
      FROM variants v
      JOIN produits p ON v.produit_id = p.id
      WHERE p.statut = 'actif'
      ORDER BY v.stock_actuel ASC
    `);
    
    res.render('admin/products/stock', { variants });
  } catch (error) {
    console.error('Erreur stock:', error);
    res.render('admin/products/stock', { error: 'Erreur lors du chargement des stocks' });
  }
});

// Ajuster le stock
router.post('/stock/:id/adjust', async (req, res) => {
  try {
    const { nouveau_stock, motif } = req.body;
    const variant_id = req.params.id;
    
    // Récupérer le stock actuel
    const [variant] = await db.execute('SELECT stock_actuel FROM variants WHERE id = ?', [variant_id]);
    const stock_avant = variant[0].stock_actuel;
    
    // Mettre à jour le stock
    await db.execute('UPDATE variants SET stock_actuel = ? WHERE id = ?', [nouveau_stock, variant_id]);
    
    // Enregistrer le mouvement
    await db.execute(`
      INSERT INTO mouvements_stock (variant_id, type, quantite, stock_avant, stock_apres, motif)
      VALUES (?, 'ajustement', ?, ?, ?, ?)
    `, [variant_id, nouveau_stock - stock_avant, stock_avant, nouveau_stock, motif]);
    
    res.redirect('/products/stock');
  } catch (error) {
    console.error('Erreur ajustement stock:', error);
    res.redirect('/products/stock');
  }
});

module.exports = router;
