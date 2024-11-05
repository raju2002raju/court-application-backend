const express = require('express');
const router = express.Router();
const multer = require('multer');
const { transcribeAudio, getChatCompletion } = require('../utils/audio');

// Configure multer storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});
const upload = multer({ storage: storage });

// POST route for file uploads and transcription
router.post('/', upload.single('wavfile'), async (req, res) => {
    console.log('File received:', req.file);
    const { contactId, dateTime } = req.body;

    try {
        if (!req.file) {
            throw new Error('No file uploaded');
        }

        // Step 1: Perform transcription
        const transcript = await transcribeAudio(req.file.path);
        console.log('Transcription:', transcript);

        // Step 2: Ensure transcript is not empty or undefined
        if (!transcript) {
            throw new Error('Transcription returned an empty result.');
        }

        // Step 3: Send transcript for chat completion (correction)
        const chatResponse = await getChatCompletion(transcript);
        console.log('Chat Completion Response:', chatResponse);

        const recordingUrl = `http://localhost:8080/uploads/${req.file.filename}`;
        console.log('Recording URL:', recordingUrl);

        // Step 4: Send the response back
        res.status(200).send({ 
            message: 'File received, transcribed, and responded successfully', 
            transcript, 
            chatResponse, 
            recordingUrl
        });
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).send({ 
            error: 'Error processing the request', 
            details: error.response ? error.response.data : error.message 
        });
    }
});

module.exports = router;
