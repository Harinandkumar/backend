const express = require('express');
const router = express.Router();
const Category = require('../schemas/category');
const Gallery = require('../schemas/gallery');
const { adminAuth } = require('../middleware/auth');

// Get all categories
router.get('/categories', adminAuth, async (req, res) => {
    try {
        const categories = await Category.find().sort({ name: 1 });
        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create new category
router.post('/categories', adminAuth, async (req, res) => {
    try {
        const { name, icon, color } = req.body;
        if (!name) {
            return res.status(400).json({ message: 'Category name is required' });
        }
        const existing = await Category.findOne({ name: name });
        if (existing) {
            return res.status(400).json({ message: 'Category already exists' });
        }
        const category = new Category({ name, icon, color });
        await category.save();
        res.status(201).json({ message: 'Category created', category });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update category
router.put('/categories/:id', adminAuth, async (req, res) => {
    try {
        const { name, icon, color, isActive } = req.body;
        const category = await Category.findByIdAndUpdate(
            req.params.id,
            { name, icon, color, isActive },
            { new: true }
        );
        if (!category) return res.status(404).json({ message: 'Category not found' });
        res.json({ message: 'Category updated', category });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete category
router.delete('/categories/:id', adminAuth, async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) return res.status(404).json({ message: 'Category not found' });
        
        // Check if any gallery images use this category
        const imagesUsing = await Gallery.countDocuments({ category: category.name });
        if (imagesUsing > 0) {
            return res.status(400).json({ 
                message: `Cannot delete: ${imagesUsing} images are using this category. Update those images first.` 
            });
        }
        
        await Category.findByIdAndDelete(req.params.id);
        res.json({ message: 'Category deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Public route - get active categories
router.get('/public/categories', async (req, res) => {
    try {
        const categories = await Category.find({ isActive: true }).sort({ name: 1 });
        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;