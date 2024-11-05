// Backend endpoint example (Node.js/Express)
const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const fs = require('fs');
const router = express.Router();

const upload = multer({ dest: 'uploads/' });

router.post('/extract-text', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    let text = '';

    if (file.mimetype === 'application/pdf') {
      const dataBuffer = fs.readFileSync(file.path);
      const data = await pdfParse(dataBuffer);
      text = data.text;
    } 
    else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({path: file.path});
      text = result.value;
    }
    else if (file.mimetype === 'text/plain') {
      text = fs.readFileSync(file.path, 'utf8');
    }

    // Clean up the uploaded file
    fs.unlinkSync(file.path);

    res.json({ text });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports=router;