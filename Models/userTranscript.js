const express = require('express');
const router = express.Router();
const Section = require('./models/section'); 

router.get('/section/:id', async (req, res) => {
  try {
    console.log('Received request for section:', req.params.id);
    const section = await Section.findOne({ fieldName: req.params.id });
    console.log('Found section:', section);
    if (!section) {
      console.log('Section not found in database');
      return res.status(404).json({ message: 'Section not found' });
    }
    res.json(section);
  } catch (error) {
    console.error('Error in /section/:id route:', error);
    res.status(500).json({ message: 'Server error', error: error.toString() });
  }
});

module.exports = router;