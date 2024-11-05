const mongoose = require('mongoose');

const legalDocSchema = new mongoose.Schema({
    fields: {
        Case: String,
        Court: String,
        petitioner: {
            name: String,
            father_name: String,
            age: String,
            residence: String
        },
        respondent: {
            name: String,
            father_name: String,
            age: String,
            residence: String
        },
        act: String,
        grounds_for_divorce: String,
      
    }
}, { collection: 'legaldrafting' }); // Specify the collection name here

const LegalDocument = mongoose.model('LegalDocument', legalDocSchema);
module.exports = LegalDocument;
