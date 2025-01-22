# Full Page Translator - Firefox Extension

A Firefox extension that translates entire web pages using an external AI service through a webhook.

## Features

- Translate entire web pages while preserving HTML structure
- Automatic language detection for source text
- Configurable target language
- Option for automatic translation on page load
- Manual translation via toolbar button
- Preserves page layout and formatting

## Installation

1. Clone this repository
2. Open Firefox and navigate to `about:debugging`
3. Click "This Firefox" in the left sidebar
4. Click "Load Temporary Add-on"
5. Select the `manifest.json` file from this repository

## Configuration

1. Click the extension icon in the toolbar
2. Set your webhook URL (required)
3. Configure your target language (defaults to browser language)
4. Enable/disable automatic translation

## Development & Testing

### Prerequisites

System requirements:
```bash
# On Ubuntu/Debian
sudo apt-get update
sudo apt-get install python3 python3-venv nodejs npm make

# On Fedora
sudo dnf install python3 python3-virtualenv nodejs npm make

# On macOS with Homebrew
brew install python node make
```

Required software versions:
- Python 3.x
- Node.js 14+
- npm 6+
- Make

### Quick Start

1. Set up the development environment:
   ```bash
   make setup
   ```
   This will:
   - Create a Python virtual environment
   - Install Python dependencies
   - Install Node.js dependencies
   - Install Playwright and Firefox browser
   - Create a `.env` file from `.env.example`

2. Configure your environment:
   Edit the `.env` file and set your webhook URL:
   ```bash
   WEBHOOK_URL=https://your-actual-webhook-url.com
   ```

3. Run the tests:
   ```bash
   make test
   ```

### Environment Configuration

The extension uses a `.env` file for configuration. A template is provided in `.env.example`:

```bash
# Required
WEBHOOK_URL=https://your-webhook-url.com

# Optional
# TEST_BROWSER=firefox  # firefox, chromium, or webkit
# TEST_HEADLESS=false  # true or false
```

**Note**: Never commit your `.env` file to version control. It's automatically ignored by `.gitignore`.

### Available Make Commands

- `make setup` - Set up the development environment
- `make test` - Run the test suite
- `make clean` - Clean up all generated files and directories
- `make dev` - Start the development server

### Manual Setup (if not using Make)

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up your webhook URL (optional - defaults to https://your-webhook-url.com):
   ```bash
   export WEBHOOK_URL="your-webhook-url"
   ```

3. Run the tests:
   ```bash
   npm test
   ```

The test suite includes:
- Basic translation functionality
- HTML structure preservation
- Settings persistence
- Dynamic content translation

Test pages are served locally using Python's built-in HTTP server during testing.

## Webhook API Requirements

Your webhook should accept POST requests with the following parameters:

- `language`: Target language code (e.g., "fr", "en", "es")
- `content`: HTML/XML-like content with translation markers

Example request:
```json
{
  "language": "fr",
  "content": "<div><span data-translate-id=\"t0\">Hello world!</span><p>This is a <span data-translate-id=\"t1\">complex paragraph</span> with multiple <span data-translate-id=\"t2\">elements to translate</span>.</p></div>"
}
```

The webhook should return a JSON response with the translated content:
```json
{
  "text": "<div><span data-translate-id=\"t0\">Bonjour le monde!</span><p>This is a <span data-translate-id=\"t1\">paragraphe complexe</span> with multiple <span data-translate-id=\"t2\">éléments à traduire</span>.</p></div>"
}
```

Key points:
- The extension wraps text nodes in `<span>` elements with unique `data-translate-id` attributes
- Only text within these spans should be translated
- The response should maintain the exact same HTML structure
- Translation markers (`data-translate-id`) must be preserved in the response
- The webhook must return a JSON object with a `text` field containing the translated HTML

## Development

The extension is built using standard web technologies:
- JavaScript (ES6+)
- HTML5
- CSS3

### Project Structure

```
├── Makefile              # Build and development automation
├── manifest.json
├── content_scripts/
│   └── translator.js
├── background/
│   └── background.js
├── options/
│   ├── options.html
│   └── options.js
├── tests/
│   ├── extension.test.js
│   └── pages/
│       └── test.html
└── icons/
    └── translate-48.png
```

## License

MIT License
