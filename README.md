# 🚀 ChatGPT Business & Team Bulk Exporter (Smart Resume + Anti-429)

A bulletproof JavaScript snippet to bulk export all your ChatGPT conversations and Projects into clean Markdown (`.md`) files. Designed specifically for **ChatGPT Business, Team, and Enterprise** workspaces where native export options might be restricted or unreliable.

## 🌟 Why this script?
Exporting hundreds of chats from a corporate ChatGPT account often leads to `429 Too Many Requests` errors, resulting in empty files, skipped chats, or a complete halt. Extensions often fail to handle these limits or only scrape the DOM. 

This script interacts directly with OpenAI's internal API (`/backend-api/`) and features a **Smart Resume mechanism** and **Auto-Retry system**, making it perfect for massive accounts (800+ chats).

## ✨ Key Features
- **🧠 Smart Resume (ID Matching):** If the script stops, you don't have to start over. Upon restart, it scans your target folder, reads the unique Chat IDs from the filenames, and downloads *only* the missing chats.
- **🛡️ Bulletproof Anti-429 Protection:** Automatically detects rate limits. If a `429` error occurs, it pauses for 35 minutes, lets the server cool down, and seamlessly resumes downloading the exact same file. No skipped files, no empty `.md` files.
- **📁 Projects Support:** Fully supports scraping conversations hidden inside your Workspace "Projects".
- **📝 Clean Markdown:** Formats the conversation cleanly with User/Assistant headers, metadata, and timestamps.
- **🚫 Zero Dependencies:** Just plain JavaScript. Run it directly in your browser's Developer Console.

---

## 🛠️ Prerequisites
1. **Chromium-based browser** (Chrome, Edge, Brave, etc.) is required because the script uses the File System Access API (`showDirectoryPicker`) to prevent duplicate downloads.
2. **Turn off download prompts:** Go to `chrome://settings/downloads` (or your browser's equivalent) and **disable** the option *"Ask where to save each file before downloading"*. Otherwise, your browser will open hundreds of pop-ups!

---

## 🚀 How to Use

### Step 1: Prepare a local folder
Create a new, empty folder on your computer (e.g., `ChatGPT_Archive`) where you want the Markdown files to be saved.

### Step 2: Open ChatGPT
Log into your ChatGPT account. Make sure you are switched to your **Business/Team Workspace** (where your projects and chats are located).

### Step 3: Open Developer Console
Press `F12` (or `Ctrl+Shift+I` / `Cmd+Option+I` on Mac) to open Developer Tools. Navigate to the **Console** tab.

### Step 4: Run the Script
1. Copy the entire code from `chatgpt-exporter.js`.
2. Paste it into the Console and hit `Enter`.
3. A browser prompt will ask you to select a directory. Select the `ChatGPT_Archive` folder you created in Step 1.
4. The browser will ask for permission to view files in this folder. Click **Allow / View files**.

### Step 5: Relax ☕
Sit back and leave the tab open. The script will output its progress in the console:
- `[Скачивание...]` — Downloading a new chat.
- `[Пропуск...]` — Skipping a chat that is already in your folder.
- `[429 Лимит]` — Rate limit hit. The script will automatically sleep for 35 minutes and resume on its own.

An alert `SNATCHER DONE!` will pop up when every single chat has been successfully exported.

---

## ⚠️ Troubleshooting

**Q: The script is skipping files but downloading them again next time?**
A: Make sure you are selecting the *exact same folder* every time you run the script. The script looks for the unique 8-character ID at the end of the existing `.md` files (e.g., `My_Chat_6a79d168.md`).

**Q: I keep getting rate limited immediately.**
A: Browser extensions (like Superpower ChatGPT or AdBlockers) might be intercepting network requests and messing with the script's built-in sleep cycle. Try running the script in an **Incognito window** (with all extensions disabled) and log into ChatGPT there.

---

## 📜 Disclaimer
This script is provided as-is. It relies on undocumented internal APIs (`/backend-api/`) which OpenAI may change at any time. This project is not affiliated with, endorsed by, or sponsored by OpenAI. Use at your own risk.

## 📄 License
MIT License
