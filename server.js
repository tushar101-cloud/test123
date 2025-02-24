const express = require('express');
const compression = require('compression');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;

// Request logger middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Middleware
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname)));

// MongoDB connection - using local MongoDB
const mongoURI = 'mongodb://127.0.0.1:27017/indoor-nav';

// Map schema
const mapSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
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

// Connect to MongoDB with retry logic
function connectWithRetry() {
    console.log('Attempting to connect to MongoDB...');
    mongoose.connect(mongoURI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000
    })
    .then(() => {
        console.log('MongoDB connected successfully');
        setupRoutes();
    })
    .catch(err => {
        console.error('MongoDB connection error:', err);
        console.log('Retrying connection in 5 seconds...');
        setTimeout(connectWithRetry, 5000);
    });
}

// Monitor MongoDB connection
mongoose.connection.on('error', err => {
    console.error('MongoDB error event:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected');
    connectWithRetry();
});

mongoose.connection.on('reconnected', () => {
    console.log('MongoDB reconnected');
});

function setupRoutes() {
    // API Endpoints
    app.post('/api/maps', async (req, res) => {
        console.log('Received map data:', req.body);
        try {
            const existingMap = await MapModel.findOne({ id: req.body.id });
            if (existingMap) {
                const updatedMap = await MapModel.findOneAndUpdate(
                    { id: req.body.id },
                    req.body,
                    { new: true }
                );
                console.log('Map updated:', updatedMap);
                return res.status(200).json(updatedMap);
            }

            const newMap = new MapModel(req.body);
            await newMap.save();
            console.log('New map saved:', newMap);
            res.status(201).json(newMap);
        } catch (error) {
            console.error('Error saving map:', error);
            res.status(400).json({ error: 'Error saving map', details: error.message });
        }
    });

    app.get('/api/maps', async (req, res) => {
        try {
            const maps = await MapModel.find({}, { _id: 0, __v: 0 });
            console.log('Retrieved maps:', maps);
            res.status(200).json(maps);
        } catch (error) {
            console.error('Error fetching maps:', error);
            res.status(500).json({ error: 'Error fetching maps', details: error.message });
        }
    });

    app.get('/api/maps/:id', async (req, res) => {
        try {
            const map = await MapModel.findOne({ id: req.params.id }, { _id: 0, __v: 0 });
            if (!map) {
                console.log('Map not found:', req.params.id);
                return res.status(404).json({ error: 'Map not found' });
            }
            console.log('Retrieved map:', map);
            res.status(200).json(map);
        } catch (error) {
            console.error('Error fetching map:', error);
            res.status(500).json({ error: 'Error fetching map', details: error.message });
        }
    });

    app.delete('/api/maps/:id', async (req, res) => {
        try {
            const deletedMap = await MapModel.findOneAndDelete({ id: req.params.id });
            if (!deletedMap) {
                console.log('Map not found for deletion:', req.params.id);
                return res.status(404).json({ error: 'Map not found' });
            }
            console.log('Deleted map:', deletedMap);
            res.status(204).send();
        } catch (error) {
            console.error('Error deleting map:', error);
            res.status(500).json({ error: 'Error deleting map', details: error.message });
        }
    });

    // Test database connection
    app.get('/api/test-db', async (req, res) => {
        try {
            await mongoose.connection.db.admin().ping();
            const collections = await mongoose.connection.db.listCollections().toArray();
            res.json({ 
                message: 'Database connection successful',
                collections: collections.map(c => c.name)
            });
        } catch (error) {
            console.error('Database test failed:', error);
            res.status(500).json({ error: 'Database connection failed', details: error.message });
        }
    });

    console.log('Routes set up successfully');
}

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    connectWithRetry();
});
