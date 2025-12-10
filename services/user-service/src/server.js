console.log("STARTING USER SERVICE");

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { PrismaClient } = require('@prisma/client');
const authenticateJWT = require('./middleware/auth');

dotenv.config();

const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
    res.json({ 
        status: "OK",
        service: "user-service",
        version: "1.0.0"
    });
});

// Get user by email
app.get("/users/email/:email", async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { email: req.params.email }
        });
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json(user);
    } catch (error) {
        console.error('GET /users/email/:email error', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Get user profile
app.get("/users/:userId", async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.params.userId }
        });
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json(user);
    } catch (error) {
        console.error('GET /users/:userId error', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Get current user profile (auth)
app.get("/users/me/profile", authenticateJWT, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id }
        });
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json(user);
    } catch (error) {
        console.error('GET /users/me/profile error', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Update user profile (auth)
app.put("/users/me/profile", authenticateJWT, async (req, res) => {
    try {
        const { name, avatar, phone, bio, address, city, state, zipCode, country } = req.body;
        
        const updated = await prisma.user.update({
            where: { id: req.user.id },
            data: {
                ...(name && { name }),
                ...(avatar && { avatar }),
                ...(phone !== undefined && { phone }),
                ...(bio !== undefined && { bio }),
                ...(address !== undefined && { address }),
                ...(city !== undefined && { city }),
                ...(state !== undefined && { state }),
                ...(zipCode !== undefined && { zipCode }),
                ...(country !== undefined && { country })
            }
        });
        
        res.json(updated);
    } catch (error) {
        console.error('PUT /users/me/profile error', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Create user (called by auth-service after registration)
app.post("/users", async (req, res) => {
    try {
        const { id, email, name } = req.body;
        
        if (!id || !email || !name) {
            return res.status(400).json({ error: 'Missing required fields: id, email, name' });
        }
        
        const user = await prisma.user.create({
            data: { id, email, name }
        });
        
        res.status(201).json(user);
    } catch (error) {
        console.error('POST /users error', error);
        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'User already exists' });
        }
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Error handling
app.use((err, req, res, next) => {
    console.error("User Service Error:", err);
    res.status(500).json({
        error: "Internal Server Error",
        message: err.message,
    });
});

const PORT = process.env.PORT || 4007;
app.listen(PORT, () => {
    console.log(`🚀 User service running on port ${PORT}`);
});
