# Claude AI Extension - Project Overview

## PROJECT OVERVIEW

**Architecture:** Chrome Extension with AI Integration  
**Main Technologies:** Vanilla JavaScript, Chrome Extension API, CSS3  
**Key Patterns:** Content Scripts, Background Scripts, Cross-Origin Messaging  
**Entry Point:** manifest.json (Manifest V3)

## COMPONENT MAP

```
Extension Core
├── manifest.json           # Extension configuration & permissions
├── background.js           # Service worker for screenshots
├── popup.html/popup.js     # Extension menu interface
└── content.js             # Main floating UI & orchestration

Content Scripts (Injected)
├── content.js             # Floating buttons & core functionality  
├── content.css            # Button styling & animations
├── claude_auto_handler.js # Claude AI automation
├── test_ocr.js           # OCR automation logic
└── gemini_final.js       # Google Gemini automation

AI Engine Support
├── Claude AI              # Direct URL prompt support
└── Google Gemini         # LocalStorage + clipboard automation
```

## KEY ARCHITECTURE INSIGHTS

### **🎯 Multi-Engine AI System**
- **Dual AI Support**: Claude AI (direct URL params) + Google Gemini (localStorage/clipboard)
- **Engine Switching**: User can toggle between AI providers via popup interface
- **Real-time Updates**: Floating button titles update instantly when AI engine changes
- **Cross-Context Storage**: Uses both localStorage and chrome.storage.local for reliable data sharing
- **Automated Workflows**: Each engine has specialized automation scripts

### **🔄 Floating Button Ecosystem**
- **4 Core Functions**: Summary (🧠), Translation (🌐), OCR (📷), Search (🔍)
- **Engine-Agnostic**: Button titles dynamically update to show current AI engine
- **Smart Positioning**: Draggable buttons with localStorage persistence
- **State Management**: Individual show/hide states per button
- **Domain Awareness**: Auto-hides on AI websites (claude.ai, gemini.google.com)

### **📸 Advanced OCR Pipeline**
```
Screenshot → Chrome API → Clipboard → AI Site → Auto-paste → Send
```
- **Dual Modes**: Full page capture vs manual area selection
- **Canvas Processing**: In-page image cropping for selected areas
- **Cross-Tab Automation**: Background script coordination

### **🚀 Automation Architecture**
- **Multi-Strategy Button Detection**: 5 different methods to find send buttons
- **Content Injection**: Specialized scripts for each AI platform
- **Event-Driven**: MutationObserver for SPA compatibility
- **Error Recovery**: Graceful fallbacks and user notifications

### **💾 Data Flow Patterns**
1. **Content Extraction**: Smart page parsing with content selector hierarchy
2. **Cross-Origin Communication**: Background ↔ Content ↔ AI sites
3. **State Persistence**: LocalStorage for positions, preferences, and automation data
4. **Message Passing**: Chrome extension messaging for popup ↔ content communication

### **🎨 UI/UX Features**
- **Gradient Buttons**: Color-coded functionality with hover animations
- **Responsive Design**: Auto-positioning within viewport boundaries
- **Visual Feedback**: Loading states, animations, and user confirmations
- **Accessibility**: Keyboard shortcuts, tooltips, and drag-and-drop

## FILE STRUCTURE

```
claude_extension/
├── manifest.json       # Extension configuration
├── background.js       # Screenshot handling
├── content.js          # Main content script (1255 lines)
├── content.css         # Button styling
├── popup.html          # Extension popup UI
├── popup.js            # Popup functionality
├── claude_auto_handler.js  # Claude automation
├── test_ocr.js         # OCR automation
├── gemini_final.js     # Gemini automation
├── gemini_auto_handler.js  # Gemini handler
├── gemini_auto_handler_simple.js  # Simplified Gemini
├── auto_send.js        # Auto-send utilities
├── claude_auto.js      # Claude utilities
├── icons8-magic-64.png # Extension icon
└── README.md           # Documentation
```

## CORE FUNCTIONS

### 1. **Summary Function** (content.js:280-326)
- Extracts page content intelligently
- Uses content selectors hierarchy
- Limits content to 8000 characters
- Auto-generates summary prompts

### 2. **Translation Function** (content.js:329-375)
- Translates entire page content
- Preserves original formatting
- Professional translation prompts
- Multi-language support ready

### 3. **OCR Function** (content.js:772-817)
- Full page or area selection
- Chrome tabs API for screenshots
- Canvas-based image cropping
- Clipboard integration

### 4. **Search Function** (content.js:378-391)
- Custom keyword search
- Strict data verification requirements
- Source citation enforcement
- Anti-speculation prompts

## TECHNICAL PATTERNS

### **Chrome Extension Patterns**
- Manifest V3 compliance
- Content script injection per domain
- Background service worker
- Cross-origin permissions

### **AI Integration Patterns**
- URL parameter passing (Claude)
- LocalStorage communication (Gemini)
- Clipboard automation
- Window management

### **UI Patterns**
- CSS-only animations
- Drag-and-drop positioning
- State persistence
- Responsive design

### **Automation Patterns**
- Multi-strategy element detection
- Event simulation
- Retry mechanisms
- Error handling

This Chrome extension demonstrates sophisticated engineering with seamless AI integration, advanced automation, and excellent user experience design.