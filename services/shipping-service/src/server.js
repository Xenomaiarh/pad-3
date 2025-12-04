console.log("STARTING SHIPPING SERVICE");

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
        service: "shipping-service",
        version: "1.0.0"
    });
});

// Get shipment details
app.get("/shipments/:shipmentId", authenticateJWT, async (req, res) => {
    try {
        const shipment = await prisma.shipment.findUnique({
            where: { id: req.params.shipmentId }
        });
        
        if (!shipment) {
            return res.status(404).json({ error: 'Shipment not found' });
        }
        
        if (shipment.userId !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden' });
        }
        
        res.json(shipment);
    } catch (error) {
        console.error('GET /shipments/:shipmentId error', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Get shipment by tracking number (public)
app.get("/shipments/track/:trackingNo", async (req, res) => {
    try {
        const shipment = await prisma.shipment.findFirst({
            where: { trackingNo: req.params.trackingNo }
        });
        
        if (!shipment) {
            return res.status(404).json({ error: 'Shipment not found' });
        }
        
        res.json(shipment);
    } catch (error) {
        console.error('GET /shipments/track/:trackingNo error', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Get user's shipments
app.get("/shipments", authenticateJWT, async (req, res) => {
    try {
        const { limit = 20, page = 1, status } = req.query;
        
        const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * parseInt(limit, 10);
        const where = { userId: req.user.id };
        if (status) where.status = status;
        
        const shipments = await prisma.shipment.findMany({
            where,
            skip,
            take: Math.max(parseInt(limit, 10) || 20, 1),
            orderBy: { createdAt: 'desc' }
        });
        
        const total = await prisma.shipment.count({ where });
        
        res.json({
            items: shipments,
            total,
            page: Math.max(parseInt(page, 10) || 1, 1),
            limit: Math.max(parseInt(limit, 10) || 20, 1)
        });
    } catch (error) {
        console.error('GET /shipments error', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Create shipment (internal - called by order service)
app.post("/shipments", async (req, res) => {
    try {
        const { orderId, userId, address, city, state, zipCode, country } = req.body;
        
        if (!orderId || !userId || !address || !city || !state || !zipCode || !country) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        const shipment = await prisma.shipment.create({
            data: {
                orderId,
                userId,
                address,
                city,
                state,
                zipCode,
                country,
                status: 'pending'
            }
        });
        
        res.status(201).json(shipment);
    } catch (error) {
        console.error('POST /shipments error', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Update shipment status (admin only)
app.put("/shipments/:shipmentId/status", authenticateJWT, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Only admins can update shipment status' });
        }
        
        const { status, carrier, trackingNo, estimatedDate } = req.body;
        
        if (!status || !['pending', 'processing', 'shipped', 'delivered', 'cancelled'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        
        const updated = await prisma.shipment.update({
            where: { id: req.params.shipmentId },
            data: {
                status,
                ...(carrier && { carrier }),
                ...(trackingNo && { trackingNo }),
                ...(estimatedDate && { estimatedDate: new Date(estimatedDate) })
            }
        });
        
        res.json(updated);
    } catch (error) {
        console.error('PUT /shipments/:shipmentId/status error', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Error handling
app.use((err, req, res, next) => {
    console.error("Shipping Service Error:", err);
    res.status(500).json({
        error: "Internal Server Error",
        message: err.message,
    });
});

const PORT = process.env.PORT || 4009;
app.listen(PORT, () => {
    console.log(`🚀 Shipping service running on port ${PORT}`);
});
