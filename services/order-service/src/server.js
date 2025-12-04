console.log("STARTING ORDER SERVICE");

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const axios = require("axios");
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const authenticateJWT = require('./middleware/auth');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Microservices URLs
const AUTH_SERVICE = process.env.AUTH_SERVICE_URL || "http://localhost:4001";
const CATALOG_SERVICE = process.env.CATALOG_SERVICE_URL || "http://localhost:4002";

// Health check
app.get("/health", (req, res) => {
    res.json({ 
        status: "OK",
        service: "order-service",
        version: "1.0.0"
    });
});

// Get user's orders
app.get('/orders', authenticateJWT, async (req, res) => {
    try {
        const userId = req.user.id;
        const orders = await prisma.order.findMany({
            where: { userId },
            include: { items: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(orders);
    } catch (error) {
        console.error('/orders error', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Get specific order
app.get('/orders/:id', authenticateJWT, async (req, res) => {
    try {
        const id = req.params.id;
        const order = await prisma.order.findUnique({
            where: { id },
            include: { items: true }
        });
        if (!order) return res.status(404).json({ error: 'Order not found' });
        // Allow owner or admin
        if (order.userId !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden' });
        }
        res.json(order);
    } catch (error) {
        console.error('/orders/:id error', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Create new order
app.post('/orders', authenticateJWT, async (req, res) => {
    try {
        const userId = req.user.id;
        const { items, shippingAddress, paymentMethod } = req.body;
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Items are required' });
        }

        // Validate products via Catalog Service
        const catalogBase = process.env.CATALOG_SERVICE_URL || 'http://localhost:4002';
        const productChecks = await Promise.all(items.map(async it => {
            const resp = await axios.get(`${catalogBase}/products/${it.productId}`).catch(e => null);
            if (!resp || resp.status !== 200) return { ok: false, id: it.productId };
            const product = resp.data;
            if (product.stock < (it.quantity || 1)) return { ok: false, id: it.productId, reason: 'out_of_stock' };
            return { ok: true, product };
        }));

        const failed = productChecks.find(p => !p.ok);
        if (failed) return res.status(400).json({ error: 'Product validation failed', detail: failed });

        // Calculate total and prepare order items
        const orderItemsData = items.map((it, idx) => {
            const prod = productChecks[idx].product;
            return {
                productId: prod.id,
                title: prod.title,
                price: prod.price,
                quantity: it.quantity || 1
            };
        });

        const total = orderItemsData.reduce((s, it) => s + it.price * it.quantity, 0);

        // Persist order
        const created = await prisma.order.create({
            data: {
                userId,
                status: 'pending',
                total,
                items: {
                    create: orderItemsData.map(i => ({
                        productId: i.productId,
                        title: i.title,
                        price: i.price,
                        quantity: i.quantity
                    }))
                }
            },
            include: { items: true }
        });

        // Notify user via Notification Service (best-effort)
        const notificationBase = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:4004';
        axios.post(`${notificationBase}/notifications`, {
            userId,
            type: 'order_created',
            title: 'Order created',
            message: `Your order ${created.id} has been created`,
            data: { orderId: created.id }
        }).catch(err => console.warn('Notification failed', err.message));

        res.status(201).json(created);
    } catch (error) {
        console.error('/orders POST error', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Update order
app.put("/orders/:id", async (req, res) => {
    try {
        // TODO: Implement order update
        res.json({ 
            message: "Update order endpoint - TODO: implement",
            id: req.params.id,
            body: req.body
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Cancel order
app.post("/orders/:id/cancel", async (req, res) => {
    try {
        const id = req.params.id;
        // require auth
        // reuse middleware
        // We'll manually call auth check here to preserve existing signature
        const authHeader = req.headers.authorization || req.headers.Authorization;
        if (!authHeader) return res.status(401).json({ error: 'Authorization header missing' });
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
        const jwt = require('jsonwebtoken');
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        const userId = payload.id || payload.userId || payload.sub;

        const order = await prisma.order.findUnique({ where: { id }, include: { items: true } });
        if (!order) return res.status(404).json({ error: 'Order not found' });
        if (order.userId !== userId && payload.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

        if (order.status === 'cancelled') return res.status(400).json({ error: 'Order already cancelled' });

        const updated = await prisma.order.update({ where: { id }, data: { status: 'cancelled' } });

        // Notify user
        const notificationBase = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:4004';
        axios.post(`${notificationBase}/notifications`, {
            userId: order.userId,
            type: 'order_cancelled',
            title: 'Order cancelled',
            message: `Order ${order.id} has been cancelled`,
            data: { orderId: order.id }
        }).catch(err => console.warn('Notification failed', err.message));

        res.json(updated);
    } catch (error) {
        console.error('/orders/:id/cancel error', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Get order status
app.get("/orders/:id/status", async (req, res) => {
    try {
        const id = req.params.id;
        const order = await prisma.order.findUnique({ where: { id } });
        if (!order) return res.status(404).json({ error: 'Order not found' });
        res.json({ id: order.id, status: order.status });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Error handling
app.use((err, req, res, next) => {
    console.error("Order Service Error:", err);
    res.status(500).json({
        error: "Internal Server Error",
        message: err.message,
    });
});

const PORT = process.env.PORT || 4003;
app.listen(PORT, () => {
    console.log(`🚀 Order service running on port ${PORT}`);
    console.log(`📦 Auth Service: ${AUTH_SERVICE}`);
    console.log(`📚 Catalog Service: ${CATALOG_SERVICE}`);
});
