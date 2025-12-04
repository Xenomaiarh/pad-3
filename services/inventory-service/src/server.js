console.log("STARTING INVENTORY SERVICE");

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
        service: "inventory-service",
        version: "1.0.0"
    });
});

// Get inventory for product
app.get("/inventory/:productId", async (req, res) => {
    try {
        const inventory = await prisma.inventoryItem.findUnique({
            where: { productId: req.params.productId }
        });
        
        if (!inventory) {
            return res.status(404).json({ error: 'Inventory not found' });
        }
        
        const available = inventory.stock - inventory.reserved;
        res.json({
            ...inventory,
            available
        });
    } catch (error) {
        console.error('GET /inventory/:productId error', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Check stock availability
app.post("/inventory/:productId/check", async (req, res) => {
    try {
        const { quantity } = req.body;
        
        if (!quantity || quantity <= 0) {
            return res.status(400).json({ error: 'Invalid quantity' });
        }
        
        const inventory = await prisma.inventoryItem.findUnique({
            where: { productId: req.params.productId }
        });
        
        if (!inventory) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        const available = inventory.stock - inventory.reserved;
        const inStock = available >= quantity;
        
        res.json({
            productId: req.params.productId,
            requested: quantity,
            available,
            inStock
        });
    } catch (error) {
        console.error('POST /inventory/:productId/check error', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Reserve stock (internal - called by order service)
app.post("/inventory/:productId/reserve", async (req, res) => {
    try {
        const { quantity } = req.body;
        
        if (!quantity || quantity <= 0) {
            return res.status(400).json({ error: 'Invalid quantity' });
        }
        
        const inventory = await prisma.inventoryItem.findUnique({
            where: { productId: req.params.productId }
        });
        
        if (!inventory) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        const available = inventory.stock - inventory.reserved;
        if (available < quantity) {
            return res.status(400).json({ error: 'Not enough stock', available });
        }
        
        const updated = await prisma.inventoryItem.update({
            where: { productId: req.params.productId },
            data: { reserved: inventory.reserved + quantity }
        });
        
        // Log the action
        await prisma.inventoryLog.create({
            data: {
                productId: req.params.productId,
                action: 'reserved',
                quantity,
                reason: 'Order placement'
            }
        });
        
        res.json({
            ...updated,
            available: updated.stock - updated.reserved
        });
    } catch (error) {
        console.error('POST /inventory/:productId/reserve error', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Release reserved stock (internal - called on order cancellation)
app.post("/inventory/:productId/release", async (req, res) => {
    try {
        const { quantity } = req.body;
        
        if (!quantity || quantity <= 0) {
            return res.status(400).json({ error: 'Invalid quantity' });
        }
        
        const inventory = await prisma.inventoryItem.findUnique({
            where: { productId: req.params.productId }
        });
        
        if (!inventory) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        if (inventory.reserved < quantity) {
            return res.status(400).json({ error: 'Cannot release more than reserved', reserved: inventory.reserved });
        }
        
        const updated = await prisma.inventoryItem.update({
            where: { productId: req.params.productId },
            data: { reserved: Math.max(0, inventory.reserved - quantity) }
        });
        
        // Log the action
        await prisma.inventoryLog.create({
            data: {
                productId: req.params.productId,
                action: 'released',
                quantity,
                reason: 'Order cancellation'
            }
        });
        
        res.json({
            ...updated,
            available: updated.stock - updated.reserved
        });
    } catch (error) {
        console.error('POST /inventory/:productId/release error', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Update stock (admin only)
app.put("/inventory/:productId", authenticateJWT, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Only admins can update inventory' });
        }
        
        const { stock, warehouse, reorderLevel } = req.body;
        
        let inventory = await prisma.inventoryItem.findUnique({
            where: { productId: req.params.productId }
        });
        
        if (!inventory) {
            // Create new inventory entry if doesn't exist
            inventory = await prisma.inventoryItem.create({
                data: {
                    productId: req.params.productId,
                    stock: stock || 0,
                    warehouse,
                    reorderLevel: reorderLevel || 10
                }
            });
        } else {
            inventory = await prisma.inventoryItem.update({
                where: { productId: req.params.productId },
                data: {
                    ...(stock !== undefined && { stock }),
                    ...(warehouse && { warehouse }),
                    ...(reorderLevel && { reorderLevel }),
                    lastRestock: stock !== undefined ? new Date() : undefined
                }
            });
        }
        
        // Log the action if stock changed
        if (stock !== undefined) {
            await prisma.inventoryLog.create({
                data: {
                    productId: req.params.productId,
                    action: 'added',
                    quantity: stock,
                    reason: 'Admin restock'
                }
            });
        }
        
        res.json({
            ...inventory,
            available: inventory.stock - inventory.reserved
        });
    } catch (error) {
        console.error('PUT /inventory/:productId error', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Get inventory logs
app.get("/inventory/:productId/logs", authenticateJWT, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Only admins can view logs' });
        }
        
        const { limit = 20, page = 1 } = req.query;
        
        const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * parseInt(limit, 10);
        const logs = await prisma.inventoryLog.findMany({
            where: { productId: req.params.productId },
            skip,
            take: Math.max(parseInt(limit, 10) || 20, 1),
            orderBy: { createdAt: 'desc' }
        });
        
        const total = await prisma.inventoryLog.count({
            where: { productId: req.params.productId }
        });
        
        res.json({
            items: logs,
            total,
            page: Math.max(parseInt(page, 10) || 1, 1),
            limit: Math.max(parseInt(limit, 10) || 20, 1)
        });
    } catch (error) {
        console.error('GET /inventory/:productId/logs error', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Error handling
app.use((err, req, res, next) => {
    console.error("Inventory Service Error:", err);
    res.status(500).json({
        error: "Internal Server Error",
        message: err.message,
    });
});

const PORT = process.env.PORT || 4011;
app.listen(PORT, () => {
    console.log(`🚀 Inventory service running on port ${PORT}`);
});
