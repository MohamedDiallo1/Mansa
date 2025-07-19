const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Configuration
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'mansa-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

// Routes utilisateur (sans middleware admin)
const userRoutes = require('./routes/user');
const cartRoutes = require('./routes/cart');

app.use('/', userRoutes);
app.use('/', cartRoutes);

// Routes admin sans middleware (les routes elles-mêmes gèrent l'auth)
const adminRoutes = require('./routes/admin');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const customerRoutes = require('./routes/customers');
const reviewRoutes = require('./routes/reviews');
const analyticsRoutes = require('./routes/analytics');

// Middleware d'authentification admin pour les routes protégées
const adminAuth = (req, res, next) => {
  if (!req.session.admin) {
    return res.redirect('/login');
  }
  next();
};

// Routes admin
app.use('/', adminRoutes); // Pour /login et /auth
app.use('/dashboard', adminAuth, adminRoutes);
app.use('/products', adminAuth, productRoutes);
app.use('/orders', adminAuth, orderRoutes);
app.use('/customers', adminAuth, customerRoutes);
app.use('/reviews', adminAuth, reviewRoutes);
app.use('/analytics', adminAuth, analyticsRoutes);

// Configuration Socket.IO pour notifications en temps réel
io.on('connection', (socket) => {
  console.log('Admin connecté pour notifications:', socket.id);
  
  socket.on('join-admin', () => {
    socket.join('admins');
    console.log('Admin rejoint le canal de notifications');
  });

  socket.on('disconnect', () => {
    console.log('Admin déconnecté:', socket.id);
  });
});

// Rendre io accessible dans les routes
app.set('io', io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Mansa démarré sur le port ${PORT}`);
  console.log(`Interface utilisateur: http://localhost:${PORT}`);
  console.log(`Interface admin: http://localhost:${PORT}/login`);
});
