# Vocabulary Import Format

This document describes the CSV and JSON formats for importing vocabulary words into the Snake Game vocabulary system.

## CSV Format (Recommended)

CSV format is simpler and easier to work with in spreadsheet applications like Excel or Google Sheets.

### CSV Template

Download a template file from the Vocabulary management page, or create a CSV file with the following structure:

```csv
word,definition,partOfSpeech,difficulty,language
EPHEMERAL,Lasting for a very short time,adjective,medium,en
RESILIENT,Able to recover quickly from difficulties,adjective,easy,en
PROFOUND,Very great or intense; having deep meaning,adjective,hard,en
```

### CSV Field Descriptions

- `word` (required): The vocabulary word (automatically converted to uppercase)
- `definition` (required): The meaning of the word
- `partOfSpeech` (optional): The grammatical category (noun, verb, adjective, etc.)
- `difficulty` (required): One of: "easy", "medium", or "hard"
- `language` (optional): Language code (default: "en" for English)

### CSV Tips

- Use double quotes around text that contains commas: `"word, with comma","definition"`
- Save as CSV (Comma Delimited) format
- First row must contain headers exactly as shown above
- Empty rows are automatically skipped

## JSON Format (Legacy Support)

JSON format is also supported for existing vocabulary lists.

### JSON Template

```json
[
  {
    "id": "word-1",
    "word": "EPHEMERAL",
    "definition": "Lasting for a very short time",
    "partOfSpeech": "adjective",
    "difficulty": "medium",
    "language": "en"
  },
  {
    "id": "word-2",
    "word": "RESILIENT",
    "definition": "Able to recover quickly from difficulties",
    "partOfSpeech": "adjective",
    "difficulty": "easy",
    "language": "en"
  }
]
```

### JSON Field Descriptions

- `id` (optional): Unique identifier for the word. If not provided, one will be generated automatically.
- `word` (required): The vocabulary word in uppercase letters.
- `definition` (required): The meaning of the word.
- `partOfSpeech` (optional): The grammatical category (noun, verb, adjective, etc.)
- `difficulty` (required): One of: "easy", "medium", or "hard"
- `language` (optional): Language code (default: "en" for English)

## Difficulty Levels

- **easy**: Simple, commonly-used words
- **medium**: Intermediate vocabulary
- **hard**: Advanced, academic, or specialized words

## Part of Speech Options

- noun
- verb
- adjective
- adverb
- preposition
- conjunction
- interjection

## Import Process

1. Click the "Template" button to download a sample CSV file
2. Edit the file with your vocabulary words (works great in Excel/Google Sheets)
3. Click "Import CSV/JSON" to upload your customized vocabulary list
4. The system will validate the format and add all valid words

## Export Options

- **Export**: Downloads your current vocabulary list as CSV for easy viewing and editing
- **Template**: Downloads a sample CSV file to get you started

## Notes

- CSV format is recommended for easier editing and sharing
- Words are automatically converted to uppercase
- Invalid entries are skipped during import with error messages
- Both CSV and JSON formats are supported for import
- The `learned` field is automatically set to false for imported words
