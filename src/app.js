const express = require('express');
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const redis = require('redis');
const path = require('path');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = 3000;

const users = [
    {
        username: process.env.AUTH_USERNAME,
        password: process.env.AUTH_PASSWORD
    }
];

// Initialize Redis client
const redisClient = redis.createClient({
    url: `redis://${process.env.REDIS_HOST || 'localhost'}:6379`
});

redisClient.on('error', (err) => {
    console.error('Redis error: ', err);
});

redisClient.connect().catch(console.error); // Ensure the client connects properly

app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    store: new RedisStore({ client: redisClient }),
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production' ? true : false,
        httpOnly: true,
        maxAge: 1000 * 60 * 60 // 1 hour
    }
}));

app.get('/', (req, res) => {
    if (req.session && req.session.user) {
        res.sendFile(path.join(__dirname, 'index.html'));
    } else {
        res.redirect('/login');
    }
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'templates/login.html'));
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;

    const user = users.find(u => u.username === username);
    if (!user || password !== user.password) {
        return res.status(401).redirect('/login?error=true');
    }

    req.session.user = username;
    return res.redirect('/');
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

app.get('/auth', (req, res) => {
    if (req.session && req.session.user) {
        return res.status(200).send('Authenticated');
    } else {
        return res.status(401).send('Unauthorized');
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.send('Logged out');
});

app.listen(PORT, () => {
    console.log(`Auth service running on port ${PORT}`);
});
