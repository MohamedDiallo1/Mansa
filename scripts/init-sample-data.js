const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function initSampleData() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    console.log('🔄 Initialisation des données de test...');

    // 1. Créer un admin par défaut
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await connection.execute(`
      INSERT IGNORE INTO admin (email, mot_de_passe, nom) 
      VALUES ('admin@mansa.com', ?, 'Administrateur Mansa')
    `, [hashedPassword]);
    console.log('✅ Compte admin créé (email: admin@mansa.com, mot de passe: admin123)');

    // 2. Créer quelques utilisateurs de test
    const userPassword = await bcrypt.hash('user123', 10);
    await connection.execute(`
      INSERT IGNORE INTO utilisateurs (email, mot_de_passe, prenom, nom, telephone, ville, pays) 
      VALUES 
        ('client1@test.com', ?, 'Jean', 'Dupont', '0123456789', 'Paris', 'France'),
        ('client2@test.com', ?, 'Marie', 'Martin', '0123456790', 'Lyon', 'France'),
        ('client3@test.com', ?, 'Pierre', 'Bernard', '0123456791', 'Marseille', 'France')
    `, [userPassword, userPassword, userPassword]);
    console.log('✅ Utilisateurs de test créés');

    // 3. Créer quelques produits de test
    await connection.execute(`
      INSERT IGNORE INTO produits (nom, description_courte, description_longue, matiere, type, prix_achat, prix_vente, statut, visible_catalogue) 
      VALUES 
        ('Ensemble Bogolan Classique', 'Ensemble traditionnel en bogolan authentique', 'Magnifique ensemble 2 pièces confectionné avec du bogolan traditionnel malien. Parfait pour les occasions spéciales.', 'bogolan', '2-pieces', 45.00, 129.00, 'actif', TRUE),
        ('Ensemble Wax Royal', 'Ensemble élégant en wax premium', 'Ensemble sophistiqué en wax de haute qualité, idéal pour les événements formels et les célébrations.', 'wax', '2-pieces', 38.00, 109.00, 'actif', TRUE),
        ('Ensemble Bogolan Premium', 'Ensemble haut de gamme avec finitions soignées', 'Ensemble 3 pièces en bogolan premium avec des finitions artisanales exceptionnelles.', 'bogolan', '3-pieces', 65.00, 189.00, 'actif', TRUE)
    `);
    console.log('✅ Produits de test créés');

    // 4. Créer des variants pour les produits
    const [products] = await connection.execute('SELECT id FROM produits LIMIT 3');
    
    for (const product of products) {
      const tailles = ['M', 'L', 'XL', 'XXL'];
      const couleurs = ['noir', 'blanc', 'rouge', 'bleu'];
      
      for (const taille of tailles) {
        for (const couleur of couleurs) {
          const sku = `ENS${product.id.toString().padStart(3, '0')}-${taille}-${couleur.toUpperCase()}`;
          await connection.execute(`
            INSERT IGNORE INTO variants (produit_id, sku, taille, couleur, stock_actuel, stock_minimum, disponible) 
            VALUES (?, ?, ?, ?, ?, 5, TRUE)
          `, [product.id, sku, taille, couleur, Math.floor(Math.random() * 20) + 5]);
        }
      }
    }
    console.log('✅ Variants des produits créés');

    // 5. Créer quelques commandes de test
    const [users] = await connection.execute('SELECT id, prenom, nom FROM utilisateurs LIMIT 3');
    
    for (let i = 0; i < 5; i++) {
      const user = users[Math.floor(Math.random() * users.length)];
      const numeroCommande = `CMD-2025-${Date.now().toString().slice(-6)}${i}`;
      const total = Math.floor(Math.random() * 200) + 50;
      const statuts = ['en_attente', 'confirmee', 'preparee', 'expediee', 'livree'];
      const statut = statuts[Math.floor(Math.random() * statuts.length)];
      
      await connection.execute(`
        INSERT INTO commandes (numero_commande, utilisateur_id, statut, statut_paiement, sous_total, total, mode_paiement) 
        VALUES (?, ?, ?, 'paye', ?, ?, 'carte')
      `, [numeroCommande, user.id, statut, total, total]);
    }
    console.log('✅ Commandes de test créées');

    // 6. Créer quelques avis clients
    const [orders] = await connection.execute('SELECT id, utilisateur_id FROM commandes WHERE statut = "livree" LIMIT 3');
    const [productsForReviews] = await connection.execute('SELECT id FROM produits LIMIT 3');
    
    const avisTexts = [
      { titre: 'Très satisfait', commentaire: 'Produit de très bonne qualité, conforme à mes attentes. Livraison rapide.' },
      { titre: 'Excellent achat', commentaire: 'Magnifique ensemble, les finitions sont parfaites. Je recommande vivement.' },
      { titre: 'Bonne qualité', commentaire: 'Bon rapport qualité/prix, tissu agréable à porter.' }
    ];
    
    for (let i = 0; i < Math.min(orders.length, productsForReviews.length); i++) {
      const avis = avisTexts[i];
      const note = Math.floor(Math.random() * 2) + 4; // Notes entre 4 et 5
      
      await connection.execute(`
        INSERT IGNORE INTO avis_clients (produit_id, utilisateur_id, commande_id, note, titre, commentaire, statut) 
        VALUES (?, ?, ?, ?, ?, ?, 'approuve')
      `, [
        productsForReviews[i].id, 
        orders[i].utilisateur_id, 
        orders[i].id, 
        note, 
        avis.titre, 
        avis.commentaire
      ]);
    }
    console.log('✅ Avis clients créés');

    console.log('\n🎉 Données de test initialisées avec succès !');
    console.log('\n📋 Récapitulatif :');
    console.log('   - Admin : admin@mansa.com / admin123');
    console.log('   - Clients de test : client1@test.com, client2@test.com, client3@test.com / user123');
    console.log('   - Produits avec variants et stock');
    console.log('   - Commandes d\'exemple');
    console.log('   - Avis clients');
    console.log('\n🚀 Vous pouvez maintenant tester l\'interface admin !');

  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation :', error);
  } finally {
    await connection.end();
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  initSampleData();
}

module.exports = initSampleData;
