const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

console.log('Starting minimal server...');
console.log('PORT:', PORT);

app.get('/', (req, res) => {
    console.log('Root endpoint hit');
    res.json({ 
        message: 'Minimal server working!',
        port: PORT,
        timestamp: new Date().toISOString()
    });
});

app.get('/health', (req, res) => {
    console.log('Health endpoint hit');
    res.json({ status: 'OK' });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Minimal server running on port ${PORT}`);
}).on('error', (err) => {
    console.error('Server error:', err);
});