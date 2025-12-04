console.log("STARTING PAYMENT SERVICE");

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const axios = require('axios');
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
        service: "payment-service",
        version: "1.0.0"
    });
});

// Get payment details
app.get("/payments/:paymentId", authenticateJWT, async (req, res) => {
    try {
        const payment = await prisma.payment.findUnique({
            where: { id: req.params.paymentId }
        });
        
        if (!payment) {
            return res.status(404).json({ error: 'Payment not found' });
        }
        
        // Only allow owner or admin to view
        if (payment.userId !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden' });
        }
        
        res.json(payment);
    } catch (error) {
        console.error('GET /payments/:paymentId error', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Get user's payments
app.get("/payments", authenticateJWT, async (req, res) => {
    try {
        const { limit = 20, page = 1 } = req.query;
        
        const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * parseInt(limit, 10);
        const payments = await prisma.payment.findMany({
            where: { userId: req.user.id },
            skip,
            take: Math.max(parseInt(limit, 10) || 20, 1),
            orderBy: { createdAt: 'desc' }
        });
        
        const total = await prisma.payment.count({ where: { userId: req.user.id } });
        
        res.json({
            items: payments,
            total,
            page: Math.max(parseInt(page, 10) || 1, 1),
            limit: Math.max(parseInt(limit, 10) || 20, 1)
        });
    } catch (error) {
        console.error('GET /payments error', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Process payment
app.post("/payments", authenticateJWT, async (req, res) => {
    try {
        const { orderId, amount, currency = 'USD', method = 'credit_card' } = req.body;
        
        if (!orderId || !amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid order ID or amount' });
        }
        
        // Verify order exists in Order Service
        try {
            const orderBase = process.env.ORDER_SERVICE_URL || 'http://localhost:4003';
            const orderResponse = await axios.get(`${orderBase}/orders/${orderId}`, {
                headers: { 'Authorization': `Bearer ${req.headers.authorization.split(' ')[1]}` }
            });
            
            if (!orderResponse.data) {
                return res.status(404).json({ error: 'Order not found' });
            }
        } catch (error) {
            console.error('Order Service check failed', error.message);
            return res.status(404).json({ error: 'Order not found' });
        }
        
        // Create payment (would integrate with Stripe/PayPal in production)
        const payment = await prisma.payment.create({
            data: {
                orderId,
                userId: req.user.id,
                amount,
                currency,
                method,
                status: 'processing',
                reference: `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            }
        });
        
        // Simulate payment processing (in production: call Stripe/PayPal API)
        // For now, mark as completed after 1 second
        setTimeout(async () => {
            await prisma.payment.update({
                where: { id: payment.id },
                data: { status: 'completed' }
            });
            
            // Notify order service that payment is complete
            try {
                const notificationBase = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:4004';
                await axios.post(`${notificationBase}/notifications`, {
                    userId: req.user.id,
                    type: 'payment_completed',
                    title: 'Payment Successful',
                    message: `Payment of ${currency} ${amount} for order ${orderId} completed`,
                    email: req.user.email
                });
            } catch (error) {
                console.error('Notification service call failed', error.message);
            }
        }, 1000);
        
        res.status(201).json({
            ...payment,
            message: 'Payment processing. Status will update shortly.'
        });
    } catch (error) {
        console.error('POST /payments error', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Refund payment
app.post("/payments/:paymentId/refund", authenticateJWT, async (req, res) => {
    try {
        const payment = await prisma.payment.findUnique({
            where: { id: req.params.paymentId }
        });
        
        if (!payment) {
            return res.status(404).json({ error: 'Payment not found' });
        }
        
        // Only allow owner or admin
        if (payment.userId !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden' });
        }
        
        if (payment.status !== 'completed') {
            return res.status(400).json({ error: 'Only completed payments can be refunded' });
        }
        
        const refunded = await prisma.payment.update({
            where: { id: req.params.paymentId },
            data: { status: 'refunded' }
        });
        
        res.json(refunded);
    } catch (error) {
        console.error('POST /payments/:paymentId/refund error', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Error handling
app.use((err, req, res, next) => {
    console.error("Payment Service Error:", err);
    res.status(500).json({
        error: "Internal Server Error",
        message: err.message,
    });
});

const PORT = process.env.PORT || 4008;
app.listen(PORT, () => {
    console.log(`🚀 Payment service running on port ${PORT}`);
});
