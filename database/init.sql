-- ===============================================
-- BASE DE DONNÉES E-COMMERCE ENSEMBLES BAZIN/WAX - MYSQL
-- ===============================================

-- 1. TABLE ADMIN (simplifié - vous seul)
CREATE TABLE admin (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  mot_de_passe VARCHAR(255) NOT NULL,
  nom VARCHAR(100) NOT NULL,
  derniere_connexion TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABLE UTILISATEURS (clients détaillés)
CREATE TABLE utilisateurs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  mot_de_passe VARCHAR(255) NOT NULL,
  
  -- Informations personnelles
  civilite VARCHAR(10), -- 'M', 'Mme', 'Mlle'
  prenom VARCHAR(100) NOT NULL,
  nom VARCHAR(100) NOT NULL,
  date_naissance DATE,
  telephone VARCHAR(20),
  telephone_secondaire VARCHAR(20),
  
  -- Adresse principale
  adresse_ligne1 VARCHAR(255),
  adresse_ligne2 VARCHAR(255),
  ville VARCHAR(100),
  code_postal VARCHAR(20),
  pays VARCHAR(100) DEFAULT 'France',
  region VARCHAR(100),
  
  -- Adresse de livraison (si différente)
  livraison_nom VARCHAR(200),
  livraison_adresse1 VARCHAR(255),
  livraison_adresse2 VARCHAR(255),
  livraison_ville VARCHAR(100),
  livraison_code_postal VARCHAR(20),
  livraison_pays VARCHAR(100),
  
  -- Préférences
  newsletter BOOLEAN DEFAULT FALSE,
  sms_marketing BOOLEAN DEFAULT FALSE,
  langue VARCHAR(10) DEFAULT 'fr',
  devise VARCHAR(10) DEFAULT 'EUR',
  
  -- Métadonnées
  statut VARCHAR(20) DEFAULT 'actif', -- 'actif', 'suspendu', 'supprime'
  date_derniere_connexion TIMESTAMP NULL,
  source_inscription VARCHAR(100), -- 'site', 'facebook', 'google'
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 3. TABLE PRODUITS (ensembles simplifiés)
CREATE TABLE produits (
  id INT AUTO_INCREMENT PRIMARY KEY,
  
  -- Informations de base
  nom VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE, -- pour URL
  description_courte TEXT,
  description_longue TEXT,
  
  -- Classification
  matiere VARCHAR(50) NOT NULL, -- 'bazin', 'wax', 'tissu'
  type VARCHAR(20) NOT NULL, -- '2-pieces', '3-pieces'
  categorie VARCHAR(100), -- 'ceremonie', 'casual', 'business'
  
  -- Prix
  prix_achat DECIMAL(10,2), -- votre prix d'achat
  prix_vente DECIMAL(10,2) NOT NULL,
  prix_promo DECIMAL(10,2),
  
  -- Images et médias
  images JSON, -- {"principale": "img1.jpg", "galerie": ["img2.jpg", "img3.jpg"], "details": ["detail1.jpg"]}
  video_url VARCHAR(500),
  
  -- SEO et marketing
  meta_title VARCHAR(255),
  meta_description TEXT,
  mots_cles TEXT, -- mots séparés par des virgules
  tags TEXT, -- tags séparés par des virgules: 'nouveaute,bestseller,promo'
  
  -- Statuts
  statut VARCHAR(20) DEFAULT 'actif', -- 'brouillon', 'actif', 'rupture', 'archive'
  visible_catalogue BOOLEAN DEFAULT TRUE,
  produit_phare BOOLEAN DEFAULT FALSE,
  nouveaute BOOLEAN DEFAULT FALSE,
  
  -- Statistiques
  nombre_vues INT DEFAULT 0,
  nombre_ventes INT DEFAULT 0,
  note_moyenne DECIMAL(3,2) DEFAULT 0,
  nombre_avis INT DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 4. TABLE VARIANTS (tailles/couleurs détaillées)
CREATE TABLE variants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  produit_id INT NOT NULL,
  
  -- Identification
  sku VARCHAR(100) UNIQUE NOT NULL, -- ENS001-L-BLANC
  code_interne VARCHAR(50),
  
  -- Caractéristiques
  taille VARCHAR(10) NOT NULL, -- 'M', 'L', 'XL', 'XXL', 'XXXL'
  couleur VARCHAR(50) NOT NULL, -- 'blanc', 'bleu-royal', 'bordeaux'
  couleur_hex VARCHAR(7), -- #FFFFFF pour affichage web
  
  -- Mesures détaillées par pièce
  mesures JSON, -- {"veste": {"poitrine": 104, "longueur": 75}, "pantalon": {"taille": 90, "longueur": 110}}
  
  -- Prix et stock
  prix_variant DECIMAL(10,2), -- si prix différent du produit principal
  stock_actuel INT DEFAULT 0,
  stock_reserve INT DEFAULT 0, -- stock réservé pour commandes en cours
  stock_minimum INT DEFAULT 6, -- seuil d'alerte
  
  -- Gestion des stocks
  cout_unitaire DECIMAL(10,2),
  derniere_entree_stock TIMESTAMP NULL,
  derniere_sortie_stock TIMESTAMP NULL,
  emplacement_stock VARCHAR(100), -- 'Etagere-A-Niveau-2'
  
  -- Statuts
  disponible BOOLEAN DEFAULT TRUE,
  pre_commande BOOLEAN DEFAULT FALSE,
  date_disponibilite TIMESTAMP NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (produit_id) REFERENCES produits(id) ON DELETE CASCADE
);

-- 5. TABLE COMMANDES (complète)
CREATE TABLE commandes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  
  -- Identification
  numero_commande VARCHAR(50) UNIQUE NOT NULL, -- CMD-2024-001234
  utilisateur_id INT,
  
  -- Statuts
  statut VARCHAR(30) DEFAULT 'en_attente', -- 'en_attente', 'confirmee', 'preparee', 'expediee', 'livree', 'annulee', 'retournee'
  statut_paiement VARCHAR(30) DEFAULT 'en_attente', -- 'en_attente', 'paye', 'rembourse', 'echec', 'partiel'
  
  -- Montants
  sous_total DECIMAL(10,2) NOT NULL,
  frais_livraison DECIMAL(10,2) DEFAULT 0,
  remise DECIMAL(10,2) DEFAULT 0,
  code_promo VARCHAR(50),
  tva DECIMAL(10,2),
  total DECIMAL(10,2) NOT NULL,
  
  -- Adresses (snapshot au moment de la commande)
  adresse_facturation JSON, -- {"nom": "John Doe", "adresse1": "123 rue...", "ville": "Paris", "cp": "75001", "pays": "France"}
  adresse_livraison JSON,
  
  -- Livraison
  mode_livraison VARCHAR(100), -- 'colissimo', 'chronopost', 'dhl', 'ups', 'click_collect'
  transporteur VARCHAR(100),
  numero_suivi VARCHAR(200),
  date_expedition TIMESTAMP NULL,
  date_livraison_prevue TIMESTAMP NULL,
  date_livraison_reelle TIMESTAMP NULL,
  
  -- Paiement
  mode_paiement VARCHAR(50), -- 'carte', 'paypal', 'virement', 'orange_money', 'wave', 'mtn_money'
  transaction_id VARCHAR(200),
  reference_paiement VARCHAR(200),
  
  -- Communication
  email_confirmation_envoye BOOLEAN DEFAULT FALSE,
  sms_suivi_envoye BOOLEAN DEFAULT FALSE,
  
  -- Notes
  notes_client TEXT,
  notes_admin TEXT, -- vos notes personnelles
  instructions_livraison TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id)
);

-- 6. TABLE COMMANDE_ITEMS (détails des articles)
CREATE TABLE commande_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  commande_id INT NOT NULL,
  variant_id INT,
  
  -- Détails de l'article (snapshot au moment de la commande)
  nom_produit VARCHAR(255),
  sku VARCHAR(100),
  taille VARCHAR(10),
  couleur VARCHAR(50),
  matiere VARCHAR(50),
  type VARCHAR(20),
  
  -- Quantités et prix
  quantite INT NOT NULL,
  prix_unitaire DECIMAL(10,2) NOT NULL,
  prix_total DECIMAL(10,2) NOT NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (commande_id) REFERENCES commandes(id) ON DELETE CASCADE,
  FOREIGN KEY (variant_id) REFERENCES variants(id)
);

-- 7. TABLE AVIS_CLIENTS (reviews détaillées)
CREATE TABLE avis_clients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  produit_id INT,
  utilisateur_id INT,
  commande_id INT,
  
  -- Évaluation globale
  note INT CHECK (note >= 1 AND note <= 5),
  titre VARCHAR(200),
  commentaire TEXT,
  
  -- Évaluations spécifiques mode
  qualite_tissu INT CHECK (qualite_tissu >= 1 AND qualite_tissu <= 5),
  qualite_coupe INT CHECK (qualite_coupe >= 1 AND qualite_coupe <= 5),
  qualite_finition INT CHECK (qualite_finition >= 1 AND qualite_finition <= 5),
  
  -- Conformité
  taille_conforme BOOLEAN,
  couleur_conforme BOOLEAN,
  delai_livraison_conforme BOOLEAN,
  
  -- Recommandation
  recommande BOOLEAN,
  taille_commandee VARCHAR(10),
  taille_habituelle VARCHAR(10), -- taille habituelle du client
  morphologie VARCHAR(50), -- 'mince', 'normale', 'forte'
  
  -- Modération
  statut VARCHAR(20) DEFAULT 'en_attente', -- 'en_attente', 'approuve', 'rejete'
  
  -- Images client
  photos TEXT, -- URLs des photos séparées par des virgules
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (produit_id) REFERENCES produits(id),
  FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id),
  FOREIGN KEY (commande_id) REFERENCES commandes(id)
);

-- 8. TABLE PANIER (persistant)
CREATE TABLE panier (
  id INT AUTO_INCREMENT PRIMARY KEY,
  utilisateur_id INT NOT NULL,
  variant_id INT NOT NULL,
  quantite INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_panier (utilisateur_id, variant_id),
  FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id),
  FOREIGN KEY (variant_id) REFERENCES variants(id)
);

-- 9. TABLE WISHLIST (liste de souhaits)
CREATE TABLE wishlist (
  id INT AUTO_INCREMENT PRIMARY KEY,
  utilisateur_id INT NOT NULL,
  produit_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_wishlist (utilisateur_id, produit_id),
  FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id),
  FOREIGN KEY (produit_id) REFERENCES produits(id)
);

-- 10. TABLE CODES_PROMO
CREATE TABLE codes_promo (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  description VARCHAR(255),
  type VARCHAR(20), -- 'pourcentage', 'montant_fixe', 'livraison_gratuite'
  valeur DECIMAL(10,2), -- 10.00 pour 10% ou 10€
  montant_minimum DECIMAL(10,2), -- commande minimum pour utiliser le code
  
  -- Limites
  utilisations_max INT,
  utilisations_actuelles INT DEFAULT 0,
  utilisations_par_client INT DEFAULT 1,
  
  -- Dates
  date_debut TIMESTAMP NULL,
  date_fin TIMESTAMP NULL,
  
  -- Statut
  actif BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. TABLE MOUVEMENTS_STOCK (historique)
CREATE TABLE mouvements_stock (
  id INT AUTO_INCREMENT PRIMARY KEY,
  variant_id INT,
  type VARCHAR(20), -- 'entree', 'sortie', 'ajustement', 'retour'
  quantite INT, -- positif pour entrée, négatif pour sortie
  stock_avant INT,
  stock_apres INT,
  motif VARCHAR(100), -- 'vente', 'reception', 'inventaire', 'casse'
  commande_id INT, -- si lié à une commande
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (variant_id) REFERENCES variants(id),
  FOREIGN KEY (commande_id) REFERENCES commandes(id)
);

-- ===============================================
-- INDEX POUR LES PERFORMANCES
-- ===============================================

CREATE INDEX idx_produits_matiere_type ON produits(matiere, type);
CREATE INDEX idx_produits_statut ON produits(statut, visible_catalogue);
CREATE INDEX idx_variants_produit_stock ON variants(produit_id, stock_actuel);
CREATE INDEX idx_variants_sku ON variants(sku);
CREATE INDEX idx_commandes_utilisateur ON commandes(utilisateur_id);
CREATE INDEX idx_commandes_statut ON commandes(statut);
CREATE INDEX idx_commandes_date ON commandes(created_at);
CREATE INDEX idx_avis_produit ON avis_clients(produit_id, statut);

-- ===============================================
-- DONNÉES INITIALES
-- ===============================================

-- Créer un compte admin par défaut
INSERT INTO admin (email, mot_de_passe, nom) VALUES 
('admin@mansa.com', '$2b$10$dummy.hashed.password', 'Administrateur Mansa');
