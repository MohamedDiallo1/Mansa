# Mansa Admin - Interface d'administration

Interface d'administration pour la gestion du site e-commerce Mansa, spécialisé dans la vente de prêt-à-porter masculin (ensembles 2 et 3 pièces).

## Fonctionnalités

- **Gestion des produits** : Ajout, modification et suppression de produits
- **Gestion des variants** : Tailles, couleurs et stocks pour chaque produit
- **Gestion des stocks** : Suivi et ajustement des stocks
- **Gestion des commandes** : Suivi des commandes et mise à jour des statuts
- **Gestion des clients** : Consultation des profils clients
- **Gestion des avis** : Modération des avis clients

## Technologies utilisées

- **Backend** : Node.js, Express
- **Base de données** : MySQL
- **Frontend** : EJS (templates), TailwindCSS
- **Authentification** : Sessions Express avec bcrypt

## Installation

### Prérequis

- Node.js (version 14 ou supérieure)
- MySQL (via XAMPP ou installation locale)
- Git

### Étapes d'installation

1. **Cloner le projet**
   ```bash
   cd c:\xampp\htdocs\
   git clone <url-du-repo> projetAmp
   cd projetAmp
   ```

2. **Installer les dépendances**
   ```bash
   npm install
   ```

3. **Configurer la base de données**
   - Démarrer XAMPP et activer MySQL
   - Créer une base de données nommée `mansa_db`
   - Importer le fichier SQL :
     ```bash
     mysql -u root -p mansa_db < database/init.sql
     ```

4. **Configurer les variables d'environnement**
   - Copier le fichier `.env.example` vers `.env`
   - Modifier les paramètres de connexion à la base de données :
     ```
     DB_HOST=localhost
     DB_USER=root
     DB_PASSWORD=
     DB_NAME=mansa_db
     SESSION_SECRET=votre-clé-secrète-unique
     ```

5. **Créer le compte administrateur**
   ```bash
   npm run create-admin
   ```
   Utilisez les identifiants par défaut :
   - Email: `admin@mansa.com`
   - Mot de passe: `admin123`
   
   ⚠️ **Important:** Changez le mot de passe après la première connexion !

6. **Lancer l'application**
   ```bash
   npm start
   ```
   ou en mode développement :
   ```bash
   npm run dev
   ```

7. **Accéder à l'interface**
   - Ouvrir http://localhost:3000 dans votre navigateur
   - Se connecter avec vos identifiants admin

## Structure du projet

```
projetAmp/
├── config/
│   └── database.js         # Configuration de la base de données
├── database/
│   └── init.sql           # Script d'initialisation de la BDD
├── routes/
│   ├── admin.js           # Routes d'authentification et dashboard
│   ├── products.js        # Routes de gestion des produits
│   ├── orders.js          # Routes de gestion des commandes
│   ├── customers.js       # Routes de gestion des clients
│   └── reviews.js         # Routes de gestion des avis
├── views/
│   ├── dashboard.ejs      # Page d'accueil admin
│   ├── login.ejs          # Page de connexion
│   └── products/          # Vues de gestion des produits
│       ├── index.ejs
│       ├── add.ejs
│       ├── variants.ejs
│       └── stock.ejs
├── app.js                 # Point d'entrée de l'application
├── package.json
└── README.md
```

## Utilisation

### Connexion
- Accéder à `/login`
- Utiliser vos identifiants administrateur

### Gestion des produits
1. Aller dans "Produits" > "Ajouter un produit"
2. Remplir les informations du produit
3. Ajouter les variants (tailles/couleurs) avec les stocks
4. Gérer les stocks via l'interface dédiée

### Gestion des commandes
- Consulter les commandes par statut
- Mettre à jour les statuts de livraison
- Ajouter des numéros de suivi

### Gestion des avis
- Modérer les avis clients (approuver/rejeter)
- Consulter les détails des avis

## Sécurité

- Authentification par session
- Mots de passe hachés avec bcrypt
- Variables d'environnement pour les données sensibles

## Support

Pour toute question ou problème, consultez la documentation ou contactez l'administrateur système.
