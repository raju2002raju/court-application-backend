const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const router = express.Router();

router.use(bodyParser.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
    console.warn('Warning: OpenAI API key is not set');
}

const generateLegalDocument = async (requirement, previousResponses = {}) => {
    const systemPrompt = `You are a specialized legal document assistant that asks one question at a time based on the document type selected. After receiving an answer, you should store it and proceed to ask the next relevant question. Only ask one question at a time.
    

Current responses received:
${Object.entries(previousResponses)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n')}

Please provide the next appropriate question based on the document type and previous responses. If all questions are answered, generate the final document.`;

    const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: systemPrompt
                },
                {
                    role: 'user',
                    content: `Document Type: ${requirement.documentType}
Current Answer: ${requirement.currentAnswer || "Not provided yet"}

Rules for question flow:

For Divorce Petition:
1. Ask for husband's full name
2. Ask for wife's full name
3. Ask for marital address
4. Ask for date of marriage
5. Ask for grounds for divorce
6. Ask if child custody is requested (Yes/No)
   If Yes: Ask for custody details
   If No: Skip to question about spousal support
7. If custody requested, ask about child support (Yes/No)
   If Yes: Ask for support details
8. Ask if spousal support is requested (Yes/No)
   If Yes: Ask for spousal support details

**Bail Application**

Before the Hon'ble Court of {{courtName}}

District: {{districtName}}

City: {{cityName}}

In the matter of:

{{petitionerName}}
Age: {{petitionerAge}}
Occupation: {{petitionerOccupation}}
Address: {{petitionerAddress}}

Petitioner

Versus

{{respondentName}}
Representative: {{respondentRepresentativeName}}
Age: {{respondentRepresentativeAge}}
Occupation: {{respondentRepresentativeOccupation}}
Address: {{respondentRepresentativeAddress}}

Respondent

**FIR Details:**
- FIR Number: {{firNumber}}
- Section of FIR: {{firSection}}
- Police Station: {{policeStation}}

Date of Arrest: {{dateOfArrest}}

Relevant Facts Supporting Petitioner's Innocence:
{{petitionerFacts}}

Additional questions and details required for finalization:

What is the name of the court? (store as courtName)
What is the district name? (store as districtName)
What is the city name? (store as cityName)
What is the petitioner's full name? (store as petitionerName)
What is the petitioner's age? (store as petitionerAge)
What is the occupation of the petitioner? (store as petitionerOccupation)
What is the petitioner's complete address? (store as petitionerAddress)
What is the name of the respondent? (store as respondentName)
What is the full name of the respondent’s representative? (store as respondentRepresentativeName)
What is the age of the respondent's representative? (store as respondentRepresentativeAge)
What is the occupation of the respondent's representative? (store as respondentRepresentativeOccupation)
What is the complete address of the respondent’s representative? (store as respondentRepresentativeAddress)
What is the FIR number? (store as firNumber)
Under which section is the FIR filed? (store as firSection)
Which police station registered the FIR? (store as policeStation)
On what date was the petitioner arrested? (store as dateOfArrest)
What are the relevant facts supporting the petitioner's innocence? (store as petitionerFacts)
After gathering all answers, substitute each placeholder with the respective answer, ensuring each detail is inserted into the final document. This structured prompt ensures clarity, accuracy, and easy identification of each part of the document.

For Lease Agreement:
1. Ask for landlord's full name
2. Ask for tenant's full name
3. Ask for property address
4. Ask for lease term
5. Ask for monthly rent amount
6. Ask for security deposit amount
7. Ask for any special terms or conditions

Please provide only the next appropriate question based on the previous responses. Do not include any other text or explanations.
Based on the following responses, generate a complete ${requirement.documentType}.
`
                }
            ],
            temperature: 0.7,
            max_tokens: 150
        },
        {
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        }
    );
    return response.data.choices[0]?.message.content.trim();
};

// Route for handling text queries
router.post('/ai-text-query', async (req, res) => {
    const { documentType, currentAnswer, previousResponses } = req.body;

    try {
        // Generate the next question or final document based on previous responses
        const nextQuestion = await generateLegalDocument(
            { documentType, currentAnswer },
            previousResponses
        );

        // Send the AI response back to the client
        res.json({
            success: true,
            responseText: nextQuestion,
        });
    } catch (error) {
        console.error('Error processing text query:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error processing text query',
        });
    }
});

router.post('/generate-document', async (req, res) => {
  const { documentType, responses } = req.body;

  try {
    const systemPrompt = `You are a legal document generator. Based on the following responses, generate a complete ${documentType}. Make it formal and professionally formatted.

Responses:
${Object.entries(responses)
  .map(([question, answer]) => `${question}: ${answer}`)
  .join('\n')}`;

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: `Please generate a complete ${documentType} using the provided responses.`
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json({
      success: true,
      document: response.data.choices[0]?.message.content.trim()
    });
  } catch (error) {
    console.error('Error generating document:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating document'
    });
  }
});

module.exports = router;