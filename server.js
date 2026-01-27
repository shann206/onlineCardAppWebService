// include the required packages
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require("cors");
require('dotenv').config();
const port = process.env.PORT || 3000;

//database config info
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    WaitForConnection: true,
    connectionLimit: 100,
    queueLimit: 0,
};

//redeploy
//intialize Express app
const app = express();
//helps app to read JSON
app.use(express.json());

//configure CORS on the backend
const allowedOrigins = [
    "http://localhost:3000",
// "https://YOUR-frontend.vercel.app", // add later
// "https://YOUR-frontend.onrender.com" // add later
    "https://card-app-starter-wzxq.onrender.com/cards",
];
app.use(
    cors({
        origin: function (origin, callback) {
// allow requests with no origin (Postman/server-to-server)
            if (!origin) return callback(null, true);
            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }
            return callback(new Error("Not allowed by CORS"));
        },
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: false,
    })
);

const DEMO_USER = { id: 1, username: "admin", password: "admin123" };

const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;

app.post("/login", async (req, res) => {
    const { username, password } = req.body;

    if (username !== DEMO_USER.username || password !== DEMO_USER.password) {
        return res.status(401).json({error: "Invalid credentials"})
    }

    // create a token using the JWT secret
    const token = jwt.sign(
        { id: DEMO_USER.id, username: DEMO_USER.username },
        JWT_SECRET,
        { expiresIn: "1h"}
    );

    res.json({ token });
});

//Middleware to protect routes
function requireAuth(req, res, next) {
    const header = req.headers.authorization; //"Bearer TOKEN"

    if (!header) {
        return res.status(401).json({ error: "Authorization header required "})
    }

    const [type, token] = header.split(" ");
    if (type !== "Bearer" || !token) {
        return res.status(401).json({ error: "Invalid authorization format" });
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.user = payload; // attach user info to request
        next();
    } catch (error) {
        return res.status(401).json({ error: "Invalid token" });
    }
}
//Example Route: Get all cards
app.get('/allcards', async(req, res) => {
    try {
        let connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute('SELECT * FROM defaultdb.cards');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error for allcards' });
    }
})

// Example Route: Create a new card
app.post('/addcard', requireAuth, async(req, res) => {
    const { card_name, card_pic } = req.body;
    try {
        let connection = await mysql.createConnection(dbConfig);
        await connection.execute('INSERT INTO cards (card_name, card_pic) VALUES (?,?)', [card_name, card_pic]);
        res.status(201).json({message: 'Card '+card_name+' added successfully'});
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error - could not add card '+card_name})
    }
})

// Example Route: Update a card
app.put('/updatecard/:id', async (req, res) => {
    const { id } = req.params;
    const { card_name, card_pic } = req.body;
    try{
        let connection = await mysql.createConnection(dbConfig);
        await connection.execute('UPDATE cards SET card_name=?, card_pic=? WHERE id=?', [card_name, card_pic, id]);
        res.status(201).json({ message: 'Card ' + id + ' updated successfully!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error - could not update card ' + id });
    }
});

// Example Route: Delete a card
app.delete('/deletecard/:id', async (req, res) => {
    const { id } = req.params;
    try{
        let connection = await mysql.createConnection(dbConfig);
        await connection.execute('DELETE FROM cards WHERE id=?', [id]);
        res.status(201).json({ message: 'Card ' + id + ' deleted successfully!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error - could not delete card ' + id });
    }
});

//start the server
app.listen(port, () => {
    console.log('Server running on port', port);
});
