const express = require('express');
const multer = require('multer');
const path = require('path');
const { transcribeAudio, getChatCompletion } = require('../utils/audio');
const dotenv = require('dotenv');
const cors = require('cors');
const bodyParser = require('body-parser');

dotenv.config();

let transcriptions = [];

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `audio-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

// Add file filter to accept only audio files
const fileFilter = (req, file, cb) => {
  // Accept audio files only
  if (file.mimetype.startsWith('audio/')) {
    cb(null, true);
  } else {  
    cb(new Error('Only audio files are allowed!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

router.post('/asr', upload.single('audio'), async (req, res) => {
  console.log('File received:', req.file);
  console.log('Request body:', req.body); // Log the request body

  try {
    if (!req.file) {
      throw new Error('No file uploaded');
    }

    const transcript = await transcribeAudio(req.file.path);
    console.log('Transcription:', transcript);

    // Make sure to access templateText correctly
    const templateText = req.body.templateText; // This should now work
    console.log('Template Text:', templateText);

    const chatResponse = await getChatCompletion(transcript, templateText);
    console.log('OpenAI Response:', chatResponse);

    const recordingUrl = `http://localhost:8080/uploads/${req.file.filename}`;
    console.log('Recording URL:', recordingUrl);

    const transcription = {
      id: Date.now(),
      transcript,
      filePath: req.file.filename,
      contactId: req.body.contactId,
      dateTime: req.body.dateTime || new Date().toISOString(),
      recordingUrl,
    };

    transcriptions.push(transcription);

    res.status(200).json({
      message: 'File received, transcribed, and responded successfully',
      transcript,
      chatResponse,
      recordingUrl,
    });
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ 
      error: 'Internal Server Error', 
      details: error.message 
    });
  }
});


// Keep the rest of your routes the same
router.get('/transcriptions', (req, res) => {
  res.json({ contacts: transcriptions });
});



router.post('/section-content', async (req, res) =>  {
  const {content} = req.body;
  if (!content) {
    return res.status(400).json({ error: 'Essay topic is required' });
  }

  try {
    const correctedContent = await getChatCompletion(content);
    res.json({ correctedContent });
  } catch (error) {
    console.error('Error during essay generation:', error);
    res.status(500).json({ error: 'Unable to generate essay at this time. Please try again later.' });
  }
})


module.exports = router;