console.log("STARTING WISHLIST SERVICE");

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const authenticateJWT = require('./middleware/auth');

dotenv.config();

const prisma = new PrismaClient();
const app = express();
const catalogBase = process.env.CATALOG_SERVICE_URL || 'http://localhost:4001';

app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
    res.json({ 
        status: "OK",
        service: "wishlist-service",
        version: "1.0.0"
    });
});

// Get user's wishlist
app.get("/wishlist", authenticateJWT, async (req, res) => {
    try {
        const userId = req.user.id;
        const { limit = 20, page = 1 } = req.query;
        
        const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * parseInt(limit, 10);
        const wishlistItems = await prisma.wishlistItem.findMany({
            where: { userId },
            skip,
            take: Math.max(parseInt(limit, 10) || 20, 1),
            orderBy: { createdAt: 'desc' }
        });
        
        const total = await prisma.wishlistItem.count({ where: { userId } });
        
        res.json({
            items: wishlistItems,
            total,
            page: Math.max(parseInt(page, 10) || 1, 1),
            limit: Math.max(parseInt(limit, 10) || 20, 1)
        });
    } catch (error) {
        console.error('GET /wishlist error', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Add to wishlist
app.post("/wishlist", authenticateJWT, async (req, res) => {
    try {
        const userId = req.user.id;
        const { productId } = req.body;
        
        if (!productId) {
            return res.status(400).json({ error: 'Product ID is required' });
        }
        
        // Validate product exists via catalog service
        try {
            const response = await axios.get(`${catalogBase}/products/${productId}`);
            if (!response.data) {
                return res.status(404).json({ error: 'Product not found' });
            }
        } catch (error) {
            console.error('Catalog service check failed', error.message);
            return res.status(404).json({ error: 'Product not found' });
        }
        
        // Check if already in wishlist
        const existing = await prisma.wishlistItem.findUnique({
            where: { userId_productId: { userId, productId } }
        });
        
        if (existing) {
            return res.status(409).json({ error: 'Product already in wishlist' });
        }
        
        const wishlistItem = await prisma.wishlistItem.create({
            data: { userId, productId }
        });
        
        res.status(201).json(wishlistItem);
    } catch (error) {
        console.error('POST /wishlist error', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Check if product in wishlist
app.get("/wishlist/:productId", authenticateJWT, async (req, res) => {
    try {
        const userId = req.user.id;
        const productId = req.params.productId;
        
        const item = await prisma.wishlistItem.findUnique({
            where: { userId_productId: { userId, productId } }
        });
        
        res.json({
            productId,
            inWishlist: !!item
        });
    } catch (error) {
        console.error('GET /wishlist/:productId error', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Remove from wishlist
app.delete("/wishlist/:productId", authenticateJWT, async (req, res) => {
    try {
        const userId = req.user.id;
        const productId = req.params.productId;
        
        const item = await prisma.wishlistItem.findUnique({
            where: { userId_productId: { userId, productId } }
        });
        
        if (!item) {
            return res.status(404).json({ error: 'Item not in wishlist' });
        }
        
        const deleted = await prisma.wishlistItem.delete({
            where: { userId_productId: { userId, productId } }
        });
        
        res.json(deleted);
    } catch (error) {
        console.error('DELETE /wishlist/:productId error', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Error handling
app.use((err, req, res, next) => {
    console.error("Wishlist Service Error:", err);
    res.status(500).json({
        error: "Internal Server Error",
        message: err.message,
    });
});

const PORT = process.env.PORT || 4006;
app.listen(PORT, () => {
    console.log(`🚀 Wishlist service running on port ${PORT}`);
});
