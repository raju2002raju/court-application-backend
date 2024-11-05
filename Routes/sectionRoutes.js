const express = require('express');
const router = express.Router();
const DynamicModel = require('../Models/section');

// Function to fetch all documents
async function fetchAllDocuments() {
  try {
    const documents = await DynamicModel.find({}).lean();
    return documents;
  } catch (error) {
    throw error;
  }
}

// Function to fetch a document by ID
async function fetchDocumentById(id) {
  try {
    const document = await DynamicModel.findById(id).lean();
    console.log('Fetched document:', JSON.stringify(document, null, 2));
    return document;
  } catch (error) {
    throw error;
  }
}

// API endpoint to get all documents
router.get('/documents', async (req, res) => {
  try {
    const documents = await fetchAllDocuments();
    const formattedDocuments = documents.map(doc => ({
      _id: doc._id,
      name: doc.fields?.['Case'] || 'Untitled Document',
      sections: doc.fields || []
    }));
    res.json(formattedDocuments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// API endpoint to get a specific document by ID
router.get('/documents/:id', async (req, res) => {
  try {
    const document = await fetchDocumentById(req.params.id);
    if (document) {
      res.json(document);
    } else {
      res.status(404).json({ message: 'Document not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


module.exports= router;