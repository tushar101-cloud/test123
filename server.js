const express = require('express');
const compression = require('compression');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB connection
const mongoURI = 'mongodb+srv://rishitush:6STJgxPWUeelXVhL@cluster0.1tmfl.mongodb.net/?retryWrites=true&w=majority&appName=cluster0';
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true, dbName: 'indoor-nav' })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

// Test database connection
app.get('/api/test-db', async (req, res) => {
    try {
        const collections = await mongoose.connection.db.listCollections().toArray();
        res.json({ message: 'Database connection successful', collections: collections.map(c => c.name) });
    } catch (error) {
        res.status(500).json({ error: 'Database connection failed', details: error.message });
    }
});

// Middleware
app.use(compression());
app.use(cors());
app.use(express.json()); // For parsing application/json
app.use(express.static(path.join(__dirname)));

// Serve the index.html file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Map schema
const mapSchema = new mongoose.Schema({
    id: String,
    name: String,
    waypoints: [{
        id: String,
        position: {
            x: Number,
            y: Number,
            z: Number
        },
        connections: [String]
    }],
    features: [{
        position: {
            x: Number,
            y: Number,
            z: Number
        },
        descriptor: Array
    }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Map model
const MapModel = mongoose.model('Map', mapSchema);

// API Endpoints
app.post('/api/maps', async (req, res) => {
    const newMap = new MapModel(req.body);
    try {
        await newMap.save();
        res.status(201).json(newMap);
    } catch (error) {
        res.status(400).json({ error: 'Error saving map' });
    }
});

app.get('/api/maps', async (req, res) => {
    try {
        const maps = await MapModel.find();
        res.status(200).json(maps);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching maps' });
    }
});

app.get('/api/maps/:id', async (req, res) => {
    try {
        const map = await MapModel.findOne({ id: req.params.id });
        if (!map) return res.status(404).json({ error: 'Map not found' });
        res.status(200).json(map);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching map' });
    }
});

app.put('/api/maps/:id', async (req, res) => {
    try {
        const updatedMap = await MapModel.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
        if (!updatedMap) return res.status(404).json({ error: 'Map not found' });
        res.status(200).json(updatedMap);
    } catch (error) {
        res.status(400).json({ error: 'Error updating map' });
    }
});

app.delete('/api/maps/:id', async (req, res) => {
    try {
        const deletedMap = await MapModel.findOneAndDelete({ id: req.params.id });
        if (!deletedMap) return res.status(404).json({ error: 'Map not found' });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Error deleting map' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
