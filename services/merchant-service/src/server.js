console.log("STARTING MERCHANT SERVICE");

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

// Helper to check if user is admin
const isAdmin = (req) => req.user && req.user.role === 'admin';

// Health check
app.get("/health", (req, res) => {
    res.json({ 
        status: "OK",
        service: "merchant-service",
        version: "1.0.0"
    });
});

// Get all merchants
app.get("/merchants", async (req, res) => {
    try {
        const { limit = 20, page = 1, search = '', active = true } = req.query;
        const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * parseInt(limit, 10);
        
        const where = {};
        if (search) where.name = { contains: search };
        if (active !== undefined) where.active = active === 'true';
        
        const merchants = await prisma.merchant.findMany({
            where,
            skip,
            take: Math.max(parseInt(limit, 10) || 20, 1),
            orderBy: { createdAt: 'desc' }
        });
        
        const total = await prisma.merchant.count({ where });
        res.json({
            items: merchants,
            total,
            page: Math.max(parseInt(page, 10) || 1, 1),
            limit: Math.max(parseInt(limit, 10) || 20, 1)
        });
    } catch (error) {
        console.error('GET /merchants error', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Get specific merchant
app.get("/merchants/:id", async (req, res) => {
    try {
        const merchant = await prisma.merchant.findUnique({
            where: { id: req.params.id }
        });
        
        if (!merchant) {
            return res.status(404).json({ error: 'Merchant not found' });
        }
        
        res.json(merchant);
    } catch (error) {
        console.error('GET /merchants/:id error', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Create merchant (admin only)
app.post("/merchants", authenticateJWT, async (req, res) => {
    try {
        if (!isAdmin(req)) {
            return res.status(403).json({ error: 'Only admins can create merchants' });
        }
        
        const { name, email, phone, address, city, country } = req.body;
        
        if (!name || !email) {
            return res.status(400).json({ error: 'Name and email are required' });
        }
        
        const merchant = await prisma.merchant.create({
            data: {
                name,
                email,
                phone: phone || null,
                address: address || null,
                city: city || null,
                country: country || null
            }
        });
        
        res.status(201).json(merchant);
    } catch (error) {
        console.error('POST /merchants error', error);
        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'Merchant with that name or email already exists' });
        }
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Update merchant (admin only)
app.put("/merchants/:id", authenticateJWT, async (req, res) => {
    try {
        if (!isAdmin(req)) {
            return res.status(403).json({ error: 'Only admins can update merchants' });
        }
        
        const merchant = await prisma.merchant.findUnique({
            where: { id: req.params.id }
        });
        
        if (!merchant) {
            return res.status(404).json({ error: 'Merchant not found' });
        }
        
        const { name, email, phone, address, city, country, rating, active } = req.body;
        
        const updated = await prisma.merchant.update({
            where: { id: req.params.id },
            data: {
                ...(name && { name }),
                ...(email && { email }),
                ...(phone !== undefined && { phone }),
                ...(address !== undefined && { address }),
                ...(city !== undefined && { city }),
                ...(country !== undefined && { country }),
                ...(rating !== undefined && { rating }),
                ...(active !== undefined && { active })
            }
        });
        
        res.json(updated);
    } catch (error) {
        console.error('PUT /merchants/:id error', error);
        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'Name or email already in use' });
        }
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Get merchant statistics
app.get("/merchants/:id/stats", async (req, res) => {
    try {
        const merchant = await prisma.merchant.findUnique({
            where: { id: req.params.id }
        });
        
        if (!merchant) {
            return res.status(404).json({ error: 'Merchant not found' });
        }
        
        // Return merchant stats (can be extended with order data later)
        res.json({
            merchantId: merchant.id,
            name: merchant.name,
            rating: merchant.rating,
            reviews: merchant.reviews,
            active: merchant.active,
            createdAt: merchant.createdAt,
            updatedAt: merchant.updatedAt
        });
    } catch (error) {
        console.error('GET /merchants/:id/stats error', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Error handling
app.use((err, req, res, next) => {
    console.error("Merchant Service Error:", err);
    res.status(500).json({
        error: "Internal Server Error",
        message: err.message,
    });
});

const PORT = process.env.PORT || 4005;
app.listen(PORT, () => {
    console.log(`🚀 Merchant service running on port ${PORT}`);
});
