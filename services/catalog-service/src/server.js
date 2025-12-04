console.log("STARTING CATALOG SERVICE");

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
    res.json({ 
        status: "OK",
        service: "catalog-service",
        version: "1.0.0"
    });
});
// Simple in-memory data (temporary). Replace with DB/Prisma later.
const { products: PRODUCTS, categories: CATEGORIES } = require('./data/products');

// Utility: paginate array
function paginate(array, { page = 1, limit = 20 } = {}) {
    const p = Math.max(parseInt(page, 10) || 1, 1);
    const l = Math.max(parseInt(limit, 10) || 20, 1);
    const start = (p - 1) * l;
    const items = array.slice(start, start + l);
    return {
        items,
        total: array.length,
        page: p,
        limit: l,
        pages: Math.ceil(array.length / l)
    };
}

// GET /products - list products with optional filters
app.get('/products', (req, res) => {
    try {
        const { page, limit, category, sortBy, minPrice, maxPrice } = req.query;

        let results = PRODUCTS.slice();

        if (category) {
            results = results.filter(p => p.category === category);
        }

        if (minPrice) {
            const mp = parseFloat(minPrice);
            if (!isNaN(mp)) results = results.filter(p => p.price >= mp);
        }

        if (maxPrice) {
            const mp = parseFloat(maxPrice);
            if (!isNaN(mp)) results = results.filter(p => p.price <= mp);
        }

        if (sortBy === 'price_asc') results.sort((a, b) => a.price - b.price);
        if (sortBy === 'price_desc') results.sort((a, b) => b.price - a.price);
        if (sortBy === 'rating') results.sort((a, b) => b.rating - a.rating);

        const paged = paginate(results, { page, limit });
        res.json(paged);
    } catch (err) {
        console.error('Error /products', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /products/:id - product details
app.get('/products/:id', (req, res) => {
    try {
        const id = req.params.id;
        const product = PRODUCTS.find(p => p.id === id);
        if (!product) return res.status(404).json({ error: 'Product not found' });
        res.json(product);
    } catch (err) {
        console.error('Error /products/:id', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /categories - list categories
app.get('/categories', (req, res) => {
    try {
        res.json({ items: CATEGORIES });
    } catch (err) {
        console.error('Error /categories', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /search?query= - simple fulltext search (title + description)
app.get('/search', (req, res) => {
    try {
        const q = (req.query.query || '').trim().toLowerCase();
        if (!q) return res.json({ items: [], total: 0 });

        const results = PRODUCTS.filter(p => {
            return (p.title + ' ' + p.description).toLowerCase().includes(q);
        });
        const paged = paginate(results, { page: req.query.page, limit: req.query.limit });
        res.json(paged);
    } catch (err) {
        console.error('Error /search', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Error handling
app.use((err, req, res, next) => {
    console.error("Catalog Service Error:", err);
    res.status(500).json({
        error: "Internal Server Error",
        message: err.message,
    });
});

const PORT = process.env.PORT || 4002;
app.listen(PORT, () => {
    console.log(`🚀 Catalog service running on port ${PORT}`);
});

//test