const bcrypt = require('bcrypt');
const db = require('../config/database');

async function createAdmin() {
  try {
    const email = 'admin@mansa.com';
    const password = 'admin123'; // Changez ce mot de passe !
    const nom = 'Administrateur Mansa';
    
    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Vérifier si l'admin existe déjà
    const [existing] = await db.execute('SELECT id FROM admin WHERE email = ?', [email]);
    
    if (existing.length > 0) {
      console.log('Un administrateur existe déjà avec cet email.');
      return;
    }
    
    // Créer l'administrateur
    await db.execute(
      'INSERT INTO admin (email, mot_de_passe, nom) VALUES (?, ?, ?)',
      [email, hashedPassword, nom]
    );
    
    console.log('Administrateur créé avec succès !');
    console.log('Email:', email);
    console.log('Mot de passe:', password);
    console.log('⚠️  N\'oubliez pas de changer le mot de passe après la première connexion !');
    
  } catch (error) {
    console.error('Erreur lors de la création de l\'administrateur:', error);
  } finally {
    process.exit();
  }
}

createAdmin();
