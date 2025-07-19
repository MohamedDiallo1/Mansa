const mysql = require('mysql2/promise');
require('dotenv').config();

async function addSampleData() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mansa_ecommerce'
  });

  try {
    console.log('Ajout des données de test...');

    // Ajouter des produits
    const produits = [
      {
        nom: 'Ensemble Bogolan Traditionnel',
        slug: 'ensemble-bogolan-traditionnel',
        description_courte: 'Ensemble élégant en bogolan authentique, parfait pour les occasions spéciales.',
        description_longue: 'Cet ensemble en bogolan traditionnel allie élégance et authenticité. Confectionné dans un tissu de qualité supérieure, il comprend une veste ajustée et un pantalon assorti. Les motifs bogolan sont traditionnellement tissés à la main, garantissant l\'unicité de chaque pièce.',
        matiere: 'bazin',
        type: '2-pieces',
        categorie: 'ceremonie',
        prix_vente: 299.99,
        images: JSON.stringify({
          principale: 'bogolan-1.jpg',
          galerie: ['bogolan-2.jpg', 'bogolan-3.jpg'],
          details: ['bogolan-detail-1.jpg']
        }),
        statut: 'actif',
        visible_catalogue: true,
        produit_phare: true,
        nouveaute: true
      },
      {
        nom: 'Ensemble Wax Royal',
        slug: 'ensemble-wax-royal',
        description_courte: 'Ensemble 3 pièces en wax aux motifs royaux, idéal pour les événements prestigieux.',
        description_longue: 'Ensemble trois pièces composé d\'une veste, d\'un gilet et d\'un pantalon en wax authentique. Les motifs géométriques colorés reflètent la richesse de l\'art textile africain. Coupe moderne et confortable.',
        matiere: 'wax',
        type: '3-pieces',
        categorie: 'ceremonie',
        prix_vente: 449.99,
        prix_promo: 399.99,
        images: JSON.stringify({
          principale: 'wax-royal-1.jpg',
          galerie: ['wax-royal-2.jpg', 'wax-royal-3.jpg']
        }),
        statut: 'actif',
        visible_catalogue: true,
        produit_phare: true
      },
      {
        nom: 'Ensemble Bazin Moderne',
        slug: 'ensemble-bazin-moderne',
        description_courte: 'Design contemporain en bazin riche, pour un style moderne et raffiné.',
        description_longue: 'Ensemble moderne en bazin riche avec une coupe contemporaine. Parfait pour les occasions business ou les sorties élégantes. Le bazin riche offre un tombé parfait et une durabilité exceptionnelle.',
        matiere: 'bazin',
        type: '2-pieces',
        categorie: 'business',
        prix_vente: 349.99,
        images: JSON.stringify({
          principale: 'bazin-moderne-1.jpg',
          galerie: ['bazin-moderne-2.jpg']
        }),
        statut: 'actif',
        visible_catalogue: true,
        nouveaute: true
      },
      {
        nom: 'Ensemble Wax Casual',
        slug: 'ensemble-wax-casual',
        description_courte: 'Style décontracté en wax coloré, pour un look quotidien authentique.',
        description_longue: 'Ensemble décontracté en wax aux motifs vifs et colorés. Idéal pour les occasions informelles tout en gardant une élégance africaine. Coupe confortable et moderne.',
        matiere: 'wax',
        type: '2-pieces',
        categorie: 'casual',
        prix_vente: 249.99,
        images: JSON.stringify({
          principale: 'wax-casual-1.jpg',
          galerie: ['wax-casual-2.jpg', 'wax-casual-3.jpg']
        }),
        statut: 'actif',
        visible_catalogue: true
      }
    ];

    for (const produit of produits) {
      const [result] = await connection.execute(`
        INSERT INTO produits (nom, slug, description_courte, description_longue, matiere, type, categorie, prix_vente, prix_promo, images, statut, visible_catalogue, produit_phare, nouveaute)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        produit.nom, produit.slug, produit.description_courte, produit.description_longue,
        produit.matiere, produit.type, produit.categorie, produit.prix_vente, produit.prix_promo || null,
        produit.images, produit.statut, produit.visible_catalogue, produit.produit_phare || false,
        produit.nouveaute || false
      ]);

      const produitId = result.insertId;
      console.log(`Produit "${produit.nom}" ajouté avec l'ID ${produitId}`);

      // Ajouter des variants pour chaque produit
      const tailles = ['M', 'L', 'XL', 'XXL'];
      const couleurs = produit.matiere === 'bazin' ? 
        ['blanc', 'noir', 'bleu-royal', 'bordeaux'] :
        ['multicolore', 'rouge-doré', 'bleu-vert', 'orange-marron'];

      for (const taille of tailles) {
        for (const couleur of couleurs) {
          const sku = `${produit.slug.substring(0, 6).toUpperCase()}-${taille}-${couleur.substring(0, 4).toUpperCase()}`;
          const prix_variant = produit.prix_promo || produit.prix_vente;
          const stock = Math.floor(Math.random() * 20) + 5; // Stock entre 5 et 24

          await connection.execute(`
            INSERT INTO variants (produit_id, sku, taille, couleur, prix_variant, stock_actuel, disponible)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [produitId, sku, taille, couleur, prix_variant, stock, true]);
        }
      }

      console.log(`Variants ajoutés pour "${produit.nom}"`);
    }

    console.log('✅ Données de test ajoutées avec succès !');
    console.log('');
    console.log('Produits ajoutés:');
    produits.forEach((p, i) => {
      console.log(`${i + 1}. ${p.nom} (${p.matiere} - ${p.type}) - ${p.prix_vente}€`);
    });
    console.log('');
    console.log('Vous pouvez maintenant tester l\'application:');
    console.log('- Interface utilisateur: http://localhost:3000');
    console.log('- Interface admin: http://localhost:3000/admin');

  } catch (error) {
    console.error('❌ Erreur lors de l\'ajout des données:', error);
  } finally {
    await connection.end();
  }
}

addSampleData();
