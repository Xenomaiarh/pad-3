console.log("STARTING NOTIFICATION SERVICE");

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { PrismaClient } = require('@prisma/client');
const authenticateJWT = require('./middleware/auth');
const { sendEmail } = require('./utils/mailer');

dotenv.config();

const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
    res.json({ 
        status: "OK",
        service: "notification-service",
        version: "1.0.0"
    });
});

// Get user notifications
app.get("/notifications", authenticateJWT, async (req, res) => {
    try {
        const userId = req.user.id;
        const { limit = 20, page = 1, unreadOnly = false } = req.query;
        
        const where = { userId };
        if (unreadOnly === 'true') where.read = false;
        
        const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * parseInt(limit, 10);
        const notifications = await prisma.notification.findMany({
            where,
            skip,
            take: Math.max(parseInt(limit, 10) || 20, 1),
            orderBy: { createdAt: 'desc' }
        });
        
        const total = await prisma.notification.count({ where });
        res.json({
            items: notifications,
            total,
            page: Math.max(parseInt(page, 10) || 1, 1),
            limit: Math.max(parseInt(limit, 10) || 20, 1)
        });
    } catch (error) {
        console.error('/notifications error', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Get specific notification
app.get("/notifications/:id", authenticateJWT, async (req, res) => {
    try {
        const id = req.params.id;
        const notification = await prisma.notification.findUnique({ where: { id } });
        if (!notification) return res.status(404).json({ error: 'Notification not found' });
        
        // Allow only owner or admin
        if (notification.userId !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden' });
        }
        
        res.json(notification);
    } catch (error) {
        console.error('/notifications/:id error', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Send/Create notification (can be internal service call or direct POST)
app.post("/notifications", async (req, res) => {
    try {
        const { userId, type = 'info', title, message, data = null, email = null } = req.body;
        
        if (!userId || !title || !message) {
            return res.status(400).json({ error: 'Missing required fields: userId, title, message' });
        }

        // Store notification in database
        const notif = await prisma.notification.create({
            data: {
                userId,
                type,
                title,
                message,
                data: data ? JSON.stringify(data) : null,
            }
        });

        // Send email if provided
        if (email) {
            await sendEmail(
                email,
                title,
                message,
                `<h3>${title}</h3><p>${message}</p>`
            );
        }

        res.status(201).json(notif);
    } catch (error) {
        console.error('/notifications POST error', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Mark as read
app.put("/notifications/:id/read", authenticateJWT, async (req, res) => {
    try {
        const id = req.params.id;
        const notification = await prisma.notification.findUnique({ where: { id } });
        if (!notification) return res.status(404).json({ error: 'Notification not found' });
        
        if (notification.userId !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const updated = await prisma.notification.update({
            where: { id },
            data: { read: true }
        });

        res.json(updated);
    } catch (error) {
        console.error('/notifications/:id/read error', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Delete notification
app.delete("/notifications/:id", authenticateJWT, async (req, res) => {
    try {
        const id = req.params.id;
        const notification = await prisma.notification.findUnique({ where: { id } });
        if (!notification) return res.status(404).json({ error: 'Notification not found' });
        
        if (notification.userId !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const deleted = await prisma.notification.delete({ where: { id } });
        res.json(deleted);
    } catch (error) {
        console.error('/notifications/:id DELETE error', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Error handling
app.use((err, req, res, next) => {
    console.error("Notification Service Error:", err);
    res.status(500).json({
        error: "Internal Server Error",
        message: err.message,
    });
});

const PORT = process.env.PORT || 4004;
app.listen(PORT, () => {
    console.log(`🚀 Notification service running on port ${PORT}`);
});
