console.log("STARTING REVIEW SERVICE");

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
        service: "review-service",
        version: "1.0.0"
    });
});

// Get product reviews
app.get("/reviews/product/:productId", async (req, res) => {
    try {
        const { limit = 10, page = 1, sortBy = 'newest' } = req.query;
        
        const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * parseInt(limit, 10);
        const orderBy = sortBy === 'helpful' 
            ? { helpful: 'desc' }
            : sortBy === 'rating_high'
            ? { rating: 'desc' }
            : sortBy === 'rating_low'
            ? { rating: 'asc' }
            : { createdAt: 'desc' };
        
        const reviews = await prisma.review.findMany({
            where: { 
                productId: req.params.productId,
                approved: true
            },
            skip,
            take: Math.max(parseInt(limit, 10) || 10, 1),
            orderBy
        });
        
        const total = await prisma.review.count({ 
            where: { productId: req.params.productId, approved: true }
        });
        
        // Calculate average rating
        const ratingData = await prisma.review.aggregate({
            where: { productId: req.params.productId, approved: true },
            _avg: { rating: true },
            _count: { rating: true }
        });
        
        res.json({
            items: reviews,
            total,
            page: Math.max(parseInt(page, 10) || 1, 1),
            limit: Math.max(parseInt(limit, 10) || 10, 1),
            avgRating: ratingData._avg.rating ? parseFloat(ratingData._avg.rating.toFixed(1)) : 0,
            totalRatings: ratingData._count.rating
        });
    } catch (error) {
        console.error('GET /reviews/product/:productId error', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Get user's reviews
app.get("/reviews/user/me", authenticateJWT, async (req, res) => {
    try {
        const { limit = 20, page = 1 } = req.query;
        
        const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * parseInt(limit, 10);
        const reviews = await prisma.review.findMany({
            where: { userId: req.user.id },
            skip,
            take: Math.max(parseInt(limit, 10) || 20, 1),
            orderBy: { createdAt: 'desc' }
        });
        
        const total = await prisma.review.count({ where: { userId: req.user.id } });
        
        res.json({
            items: reviews,
            total,
            page: Math.max(parseInt(page, 10) || 1, 1),
            limit: Math.max(parseInt(limit, 10) || 20, 1)
        });
    } catch (error) {
        console.error('GET /reviews/user/me error', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Create review
app.post("/reviews", authenticateJWT, async (req, res) => {
    try {
        const { productId, rating, title, comment } = req.body;
        
        if (!productId || !rating || !title || !comment) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        if (rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Rating must be between 1 and 5' });
        }
        
        const review = await prisma.review.create({
            data: {
                productId,
                userId: req.user.id,
                rating,
                title,
                comment
            }
        });
        
        res.status(201).json(review);
    } catch (error) {
        console.error('POST /reviews error', error);
        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'You have already reviewed this product' });
        }
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Update review
app.put("/reviews/:reviewId", authenticateJWT, async (req, res) => {
    try {
        const review = await prisma.review.findUnique({
            where: { id: req.params.reviewId }
        });
        
        if (!review) {
            return res.status(404).json({ error: 'Review not found' });
        }
        
        if (review.userId !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden' });
        }
        
        const { rating, title, comment } = req.body;
        
        if (rating && (rating < 1 || rating > 5)) {
            return res.status(400).json({ error: 'Rating must be between 1 and 5' });
        }
        
        const updated = await prisma.review.update({
            where: { id: req.params.reviewId },
            data: {
                ...(rating && { rating }),
                ...(title && { title }),
                ...(comment && { comment })
            }
        });
        
        res.json(updated);
    } catch (error) {
        console.error('PUT /reviews/:reviewId error', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Delete review
app.delete("/reviews/:reviewId", authenticateJWT, async (req, res) => {
    try {
        const review = await prisma.review.findUnique({
            where: { id: req.params.reviewId }
        });
        
        if (!review) {
            return res.status(404).json({ error: 'Review not found' });
        }
        
        if (review.userId !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden' });
        }
        
        const deleted = await prisma.review.delete({
            where: { id: req.params.reviewId }
        });
        
        res.json(deleted);
    } catch (error) {
        console.error('DELETE /reviews/:reviewId error', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Mark review as helpful
app.post("/reviews/:reviewId/helpful", async (req, res) => {
    try {
        const review = await prisma.review.findUnique({
            where: { id: req.params.reviewId }
        });
        
        if (!review) {
            return res.status(404).json({ error: 'Review not found' });
        }
        
        const updated = await prisma.review.update({
            where: { id: req.params.reviewId },
            data: { helpful: review.helpful + 1 }
        });
        
        res.json(updated);
    } catch (error) {
        console.error('POST /reviews/:reviewId/helpful error', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Error handling
app.use((err, req, res, next) => {
    console.error("Review Service Error:", err);
    res.status(500).json({
        error: "Internal Server Error",
        message: err.message,
    });
});

const PORT = process.env.PORT || 4010;
app.listen(PORT, () => {
    console.log(`🚀 Review service running on port ${PORT}`);
});
