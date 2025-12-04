console.log("STARTING ANALYTICS SERVICE");

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

// Helper to check admin
const isAdmin = (req) => req.user && req.user.role === 'admin';

// Health check
app.get("/health", (req, res) => {
    res.json({ 
        status: "OK",
        service: "analytics-service",
        version: "1.0.0"
    });
});

// Get daily statistics (admin only)
app.get("/analytics/daily", authenticateJWT, async (req, res) => {
    try {
        if (!isAdmin(req)) {
            return res.status(403).json({ error: 'Only admins can view analytics' });
        }
        
        const { days = 30 } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days, 10));
        
        const stats = await prisma.dailyStat.findMany({
            where: {
                date: {
                    gte: startDate
                }
            },
            orderBy: { date: 'asc' }
        });
        
        const totals = await prisma.dailyStat.aggregate({
            where: {
                date: {
                    gte: startDate
                }
            },
            _sum: {
                totalOrders: true,
                totalRevenue: true,
                newUsers: true
            },
            _avg: {
                avgOrderValue: true
            }
        });
        
        res.json({
            items: stats,
            summary: {
                totalOrders: totals._sum.totalOrders || 0,
                totalRevenue: totals._sum.totalRevenue || 0,
                newUsers: totals._sum.newUsers || 0,
                avgOrderValue: totals._avg.avgOrderValue ? parseFloat(totals._avg.avgOrderValue.toFixed(2)) : 0
            },
            period: days
        });
    } catch (error) {
        console.error('GET /analytics/daily error', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Get product statistics (admin only)
app.get("/analytics/products", authenticateJWT, async (req, res) => {
    try {
        if (!isAdmin(req)) {
            return res.status(403).json({ error: 'Only admins can view analytics' });
        }
        
        const { limit = 50, sortBy = 'revenue' } = req.query;
        
        const orderBy = sortBy === 'views' 
            ? { views: 'desc' }
            : sortBy === 'purchases'
            ? { purchases: 'desc' }
            : { revenue: 'desc' };
        
        const stats = await prisma.productStat.findMany({
            take: Math.max(parseInt(limit, 10) || 50, 1),
            orderBy
        });
        
        const totals = await prisma.productStat.aggregate({
            _sum: { revenue: true, purchases: true, views: true },
            _avg: { rating: true }
        });
        
        res.json({
            items: stats,
            totals: {
                totalRevenue: totals._sum.revenue || 0,
                totalPurchases: totals._sum.purchases || 0,
                totalViews: totals._sum.views || 0,
                avgRating: totals._avg.rating ? parseFloat(totals._avg.rating.toFixed(2)) : 0
            }
        });
    } catch (error) {
        console.error('GET /analytics/products error', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Get product detail stats
app.get("/analytics/products/:productId", authenticateJWT, async (req, res) => {
    try {
        if (!isAdmin(req)) {
            return res.status(403).json({ error: 'Only admins can view analytics' });
        }
        
        const stats = await prisma.productStat.findUnique({
            where: { productId: req.params.productId }
        });
        
        if (!stats) {
            return res.status(404).json({ error: 'Product statistics not found' });
        }
        
        res.json(stats);
    } catch (error) {
        console.error('GET /analytics/products/:productId error', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Get user statistics
app.get("/analytics/users/me", authenticateJWT, async (req, res) => {
    try {
        const stats = await prisma.userStat.findUnique({
            where: { userId: req.user.id }
        });
        
        if (!stats) {
            return res.status(404).json({ error: 'User statistics not found' });
        }
        
        res.json(stats);
    } catch (error) {
        console.error('GET /analytics/users/me error', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Get all user statistics (admin only)
app.get("/analytics/users", authenticateJWT, async (req, res) => {
    try {
        if (!isAdmin(req)) {
            return res.status(403).json({ error: 'Only admins can view analytics' });
        }
        
        const { limit = 50, sortBy = 'spent' } = req.query;
        
        const orderBy = sortBy === 'orders'
            ? { totalOrders: 'desc' }
            : { totalSpent: 'desc' };
        
        const stats = await prisma.userStat.findMany({
            take: Math.max(parseInt(limit, 10) || 50, 1),
            orderBy
        });
        
        const totals = await prisma.userStat.aggregate({
            _sum: { totalSpent: true, totalOrders: true },
            _avg: { avgOrderValue: true },
            _count: { userId: true }
        });
        
        res.json({
            items: stats,
            totals: {
                totalUsers: totals._count.userId || 0,
                totalSpent: totals._sum.totalSpent || 0,
                totalOrders: totals._sum.totalOrders || 0,
                avgUserSpent: totals._avg.avgOrderValue ? parseFloat(totals._avg.avgOrderValue.toFixed(2)) : 0
            }
        });
    } catch (error) {
        console.error('GET /analytics/users error', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Record daily statistics (internal - called by cron job)
app.post("/analytics/daily/record", async (req, res) => {
    try {
        const { totalOrders, totalRevenue, newUsers, totalUsers, avgOrderValue } = req.body;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const stat = await prisma.dailyStat.upsert({
            where: { date: today },
            update: {
                totalOrders: totalOrders || 0,
                totalRevenue: totalRevenue || 0,
                newUsers: newUsers || 0,
                totalUsers: totalUsers || 0,
                avgOrderValue: avgOrderValue || 0
            },
            create: {
                date: today,
                totalOrders: totalOrders || 0,
                totalRevenue: totalRevenue || 0,
                newUsers: newUsers || 0,
                totalUsers: totalUsers || 0,
                avgOrderValue: avgOrderValue || 0
            }
        });
        
        res.status(201).json(stat);
    } catch (error) {
        console.error('POST /analytics/daily/record error', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Update product statistics (internal)
app.post("/analytics/products/:productId/record", async (req, res) => {
    try {
        const { views, purchases, revenue, rating, reviewCount } = req.body;
        
        const stat = await prisma.productStat.upsert({
            where: { productId: req.params.productId },
            update: {
                ...(views !== undefined && { views: { increment: views } }),
                ...(purchases !== undefined && { purchases: { increment: purchases } }),
                ...(revenue !== undefined && { revenue: { increment: revenue } }),
                ...(rating !== undefined && { rating }),
                ...(reviewCount !== undefined && { reviewCount })
            },
            create: {
                productId: req.params.productId,
                views: views || 0,
                purchases: purchases || 0,
                revenue: revenue || 0,
                rating: rating || 0,
                reviewCount: reviewCount || 0
            }
        });
        
        res.status(201).json(stat);
    } catch (error) {
        console.error('POST /analytics/products/:productId/record error', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Update user statistics (internal)
app.post("/analytics/users/:userId/record", async (req, res) => {
    try {
        const { totalOrders, totalSpent, avgOrderValue, lastOrder } = req.body;
        
        const stat = await prisma.userStat.upsert({
            where: { userId: req.params.userId },
            update: {
                ...(totalOrders !== undefined && { totalOrders }),
                ...(totalSpent !== undefined && { totalSpent }),
                ...(avgOrderValue !== undefined && { avgOrderValue }),
                ...(lastOrder && { lastOrder: new Date(lastOrder) })
            },
            create: {
                userId: req.params.userId,
                totalOrders: totalOrders || 0,
                totalSpent: totalSpent || 0,
                avgOrderValue: avgOrderValue || 0,
                lastOrder: lastOrder ? new Date(lastOrder) : null
            }
        });
        
        res.status(201).json(stat);
    } catch (error) {
        console.error('POST /analytics/users/:userId/record error', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Error handling
app.use((err, req, res, next) => {
    console.error("Analytics Service Error:", err);
    res.status(500).json({
        error: "Internal Server Error",
        message: err.message,
    });
});

const PORT = process.env.PORT || 4012;
app.listen(PORT, () => {
    console.log(`🚀 Analytics service running on port ${PORT}`);
});
