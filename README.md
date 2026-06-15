# GHAS Viewer

A lightweight, easy-to-use web application for viewing and managing GitHub Advanced Security (GHAS) alerts from JSON files. Perfect for teams whose organizations only provide GHAS export files without direct dashboard access.

## 🎯 Motivation

Many companies provide GitHub Advanced Security alert data only as JSON exports, without direct access to the GitHub dashboard. **GHAS Viewer** bridges this gap by offering a user-friendly interface to:

- Load and parse GHAS JSON export files
- View, filter, and search security alerts
- Explore code snippets and vulnerability details
- Manage alerts locally without any server dependencies

## ✨ Features

- **📁 Local File Processing** - All data stays on your local machine. No uploads, no servers.
- **🔍 Smart Search & Filter** - Quickly find alerts by type, severity, path, and more
- **📋 Alert Management** - View detailed alert information with syntax-highlighted code previews
- **🎨 Clean UI** - Modern interface built with PrimeVue for seamless navigation
- **📊 Alert Statistics** - Dashboard overview of vulnerability types and severity levels
- **🔗 Markdown Support** - Render markdown in alert details for better readability
- **⚡ Type-Safe** - Built with TypeScript for reliability
- **🚀 Single File Build** - Export as standalone HTML for easy distribution

## 🛠️ Tech Stack

- **Vue 3** - Progressive JavaScript framework
- **Vite** - Next-generation frontend tooling
- **TypeScript** - Type-safe JavaScript
- **PrimeVue** - Premium Vue UI component library
- **Pinia** - State management
- **Fuse.js** - Fuzzy search library
- **markdown-it** - Markdown parser and renderer
- **DOMPurify** - XSS protection for rendering
- **Lucide Vue** - Beautiful icon library

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm/yarn

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd GHAS-Viewer
   ```

2. Install dependencies:
   ```bash
   pnpm install
   # or
   npm install
   ```

3. Start the development server:
   ```bash
   pnpm dev
   # or
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173`

## 📖 Usage

### Loading GHAS JSON Files

1. Launch the application
2. Use the file input to load your GHAS JSON export file
3. The app will parse and display all alerts in a table

### Viewing Alert Details

- Click on any alert row to open detailed information
- View full alert description, affected code, and recommendations
- Code snippets are syntax-highlighted for easy reading

### Filtering & Searching

- Use the filter panel to narrow down by:
  - Alert type/rule
  - Severity level
  - File path
  - Status
- Use the search box for full-text search across all alerts

### Exporting Results

- Filter alerts as needed
- All filtered results can be viewed in the table
- Copy or export alert details as needed

## 🏗️ Project Structure

```
GHAS-Viewer/
├── src/
│   ├── components/           # Vue components
│   │   ├── AlertDetailDialog.vue    # Detailed alert view
│   │   ├── AlertTable.vue          # Alert list table
│   │   ├── CodePreview.vue         # Syntax-highlighted code
│   │   ├── FilterPanel.vue         # Filter controls
│   │   ├── MarkdownViewer.vue      # Markdown renderer
│   │   └── TopNav.vue              # Navigation header
│   ├── services/             # Business logic
│   │   ├── ghasParser.ts     # GHAS JSON parsing
│   │   ├── searchIndex.ts    # Search functionality
│   │   └── sourceReader.ts   # File reading utilities
│   ├── stores/               # Pinia state management
│   │   ├── ghasStore.ts      # Alert data store
│   │   └── uiStore.ts        # UI state store
│   ├── types/                # TypeScript types
│   │   └── ghas.ts           # GHAS data type definitions
│   ├── utils/                # Utility functions
│   │   └── dateFormatter.ts  # Date formatting
│   ├── styles/               # Stylesheets
│   ├── App.vue               # Root component
│   └── main.ts               # Application entry point
├── public/                   # Static assets
├── index.html                # HTML template
├── vite.config.ts            # Vite configuration
├── tsconfig.json             # TypeScript configuration
└── package.json              # Project dependencies
```

## 🔨 Build & Deployment

### Development Build

```bash
pnpm dev
```

Starts the development server with hot module replacement.

### Production Build

```bash
pnpm build
```

Creates an optimized production build in the `dist/` directory.

### Single File Build

Export as a standalone HTML file (great for distribution):

```bash
pnpm build:single
```

This creates a single `index.html` file with all assets embedded.

### Build All Variants

```bash
pnpm build:all
```

Generates both standard and single-file production builds.

## ⚙️ Configuration

- **Vite Config**: [vite.config.ts](vite.config.ts)
- **TypeScript Config**: [tsconfig.json](tsconfig.json)
- **Theme Config**: Uses PrimeVue's built-in theme system

## 📝 JSON Format

The app expects a standard GHAS JSON export file. Example structure:

```json
[
  {
    "rule": {
      "id": "js/sql-injection",
      "name": "SQL Injection",
      "tags": ["security", "database"]
    },
    "message": {
      "text": "Potential SQL injection vulnerability"
    },
    "locations": [
      {
        "physicalLocation": {
          "artifactLocation": {
            "uri": "src/services/database.ts"
          },
          "region": {
            "startLine": 42
          }
        }
      }
    ]
  }
]
```

## 🔒 Security

- All processing happens locally - no data is sent to external servers
- Uses DOMPurify to prevent XSS attacks
- TypeScript provides type safety
- No authentication or sensitive data storage

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report issues
- Submit pull requests
- Suggest improvements

## 📧 Support

For issues, questions, or feedback, please create an issue in the repository.

---
