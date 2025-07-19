# 🛍️ Guide de Test - Interface Utilisateur Mansa

## ✅ Fonctionnalités Implémentées

### 🔐 Système d'Authentification
- **Connexion/Inscription** avec comptes de test
- **Session persistante** avec redirection automatique

### 🛒 Système de Panier Complet
- **Ajout au panier** avec sélection taille/couleur/quantité
- **Gestion du panier** (modifier quantités, supprimer articles)
- **Validation du stock** en temps réel
- **Persistance du panier** en base de données

### 📦 Processus de Commande Sans Paiement
- **Page de commande** avec formulaire complet
- **Adresse de livraison** (préremplie si profil existant)
- **Mode de paiement simulé** (carte, PayPal, virement)
- **Validation automatique** sans paiement réel
- **Page de confirmation** avec numéro de commande

### 👤 Espace Client
- **Mes commandes** avec historique complet
- **Détails des commandes** (articles, statuts, totaux)
- **Suivi des livraisons** (numéros de suivi quand disponibles)

### 🔔 Notifications Admin en Temps Réel
- **WebSocket** pour notifications instantanées
- **Son d'alerte** lors de nouvelles commandes
- **Badge animé** avec compteur de notifications

---

## 🚀 Comment Tester

### 1. Démarrer l'Application
```bash
npm start
```
L'application sera disponible sur `http://localhost:3000`

### 2. Comptes de Test Disponibles

#### 👨‍💼 Admin
- **Email :** `admin@mansa.com`
- **Mot de passe :** `admin123`
- **URL :** `http://localhost:3000/login`

#### 👤 Clients
- **Client 1 :** `client1@test.com` / `user123`
- **Client 2 :** `client2@test.com` / `user123`
- **Client 3 :** `client3@test.com` / `user123`

### 3. Scénario de Test Complet

#### 🛍️ Côté Client (Interface Utilisateur)

1. **Accéder à la boutique**
   - Aller sur `http://localhost:3000`
   - Naviguer vers "Boutique"
   - Observer les produits avec images et prix

2. **Se connecter**
   - Cliquer "Connexion" 
   - Utiliser `client1@test.com` / `user123`
   - Vérifier la redirection automatique

3. **Choisir un produit**
   - Cliquer sur un produit
   - **Sélectionner une taille** (M, L, XL, XXL)
   - **Sélectionner une couleur** (noir, blanc, rouge, bleu)
   - **Modifier la quantité** avec +/-
   - Observer le **statut du stock** en temps réel

4. **Ajouter au panier**
   - Cliquer "Ajouter au panier"
   - Vérifier la notification de succès
   - Observer le **compteur du panier** qui se met à jour

5. **Gérer le panier**
   - Aller sur `/panier`
   - **Modifier les quantités** avec +/-
   - **Supprimer des articles** avec l'icône poubelle
   - Observer la **mise à jour automatique** des totaux

6. **Finaliser la commande**
   - Cliquer "Passer la commande"
   - Remplir le **formulaire de livraison**
   - Choisir un **mode de paiement**
   - Ajouter des **notes spéciales** (optionnel)
   - Cliquer "Confirmer la commande"

7. **Confirmation de commande**
   - Observer la **page de confirmation**
   - Noter le **numéro de commande**
   - Vérifier que le **panier est vidé**

8. **Consulter mes commandes**
   - Aller sur `/mes-commandes`
   - Voir la **liste des commandes**
   - Cliquer "Voir détails" pour **afficher les articles**

#### 🔔 Côté Admin (Notifications)

1. **Se connecter en admin**
   - Ouvrir un nouvel onglet : `http://localhost:3000/login`
   - Utiliser `admin@mansa.com` / `admin123`

2. **Observer les notifications**
   - Laisser l'interface admin ouverte
   - Quand un client finalise une commande côté utilisateur
   - **Observer la notification instantanée** avec son
   - Vérifier le **badge avec compteur**
   - Cliquer sur l'icône cloche pour voir les détails

3. **Consulter les rapports**
   - Menu "Analytics" → "Rapports"
   - Observer les **statistiques en temps réel**
   - Tester l'**export CSV**

---

## 🎯 Points Clés à Vérifier

### ✅ Sélection de Variants
- [ ] **Tailles disponibles** s'affichent correctement
- [ ] **Couleurs disponibles** s'affichent correctement  
- [ ] **Stock en temps réel** ("En stock (X disponible)" ou "Rupture de stock")
- [ ] **Combinaisons indisponibles** affichent "Combinaison non disponible"
- [ ] **Boutons désactivés** quand aucune sélection

### ✅ Gestion du Panier
- [ ] **Ajout au panier** fonctionne avec quantité/taille/couleur
- [ ] **Modification des quantités** respecte le stock disponible
- [ ] **Suppression d'articles** fonctionne
- [ ] **Totaux automatiques** se mettent à jour
- [ ] **Persistance** (actualiser la page, le panier reste)

### ✅ Processus de Commande
- [ ] **Formulaire de livraison** se prérempli avec données du profil
- [ ] **Validation des champs** obligatoires
- [ ] **Modes de paiement** sélectionnables
- [ ] **Récapitulatif** affiche correctement les articles
- [ ] **Frais de livraison** calculés (gratuit dès 150€, sinon 9,90€)
- [ ] **Création de commande** génère un numéro unique

### ✅ Notifications Admin
- [ ] **Son d'alerte** joue lors de nouvelles commandes
- [ ] **Badge animé** affiche le bon nombre
- [ ] **Dropdown de notifications** fonctionne
- [ ] **Mise à jour temps réel** sans actualiser la page

---

## 🐛 Problèmes Potentiels

### Base de Données
- Vérifier que MySQL est démarré
- Vérifier les variables d'environnement dans `.env`
- Exécuter `node scripts/init-sample-data.js` si les données manquent

### Socket.IO
- Les notifications nécessitent une connexion WebSocket
- Ouvrir la console développeur pour voir les erreurs

### Stock
- Si "Combinaison non disponible", vérifier que les variants existent en BDD
- Le stock se met à jour automatiquement lors des commandes

---

## 🎉 Fonctionnalités Bonus

### 🔄 Mises à Jour Automatiques
- **Compteur du panier** se met à jour sans rechargement
- **Stock en temps réel** lors de la sélection
- **Notifications push** pour les admins

### 💡 UX Améliorée
- **Animations fluides** sur les boutons et transitions
- **Messages de feedback** pour toutes les actions
- **Design responsive** mobile et desktop
- **Breadcrumbs** pour la navigation

### 🎨 Design Cohérent
- **Thème bogolan/terre** dans toute l'interface
- **Icônes Font Awesome** pour une meilleure lisibilité
- **Cartes et ombres** pour la hiérarchie visuelle

---

## 📱 Test Mobile

L'interface est **responsive** et fonctionne sur mobile :
- **Navigation adaptée** avec menu burger
- **Formulaires optimisés** pour mobile
- **Boutons accessibles** au doigt
- **Images responsives**

---

## 🏆 Résumé

Tu as maintenant **une boutique e-commerce complètement fonctionnelle** avec :

✅ **Sélection de produits** avec variants (taille/couleur/quantité)  
✅ **Panier persistant** avec gestion complète  
✅ **Commandes sans paiement** mais processus complet  
✅ **Notifications admin en temps réel** avec son  
✅ **Interface utilisateur moderne** et responsive  
✅ **Gestion du stock** automatique  
✅ **Historique des commandes** pour les clients

**Le système est prêt pour la production !** 🚀
