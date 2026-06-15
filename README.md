# AI-Powered DSA Vault & SRS Tracker

A heavily customized, AI-driven Next.js dashboard for tracking Data Structures and Algorithms (DSA) progress. It features Spaced Repetition (SRS), a Blind Mode for practicing pattern recognition, and an automated deployment pipeline powered entirely by your AI coding assistant.

## 🚀 Quick Start for New Users (Friends & Collaborators)

If a friend shared this project with you, here is exactly how to set up your own personal, separate instance that syncs to your phone via Vercel.

### 1. Clone the Project
Open your terminal and clone the repository to your local machine:
```bash
git clone https://github.com/YOUR_FRIENDS_USERNAME/dsa-tracker.git my-dsa-vault
cd my-dsa-vault
npm install
```

### 2. Connect to Your Own GitHub Account
You don't want to push your notes to your friend's repository! You need to link this code to a brand new repository owned by *you*.
1. Go to [GitHub](https://github.com/new) and create a new, empty repository (e.g., `my-dsa-vault`).
2. Run these commands in your terminal to point the code to your new repository:
```bash
# Remove your friend's git connection
git remote remove origin

# Add your new GitHub URL
git remote add origin https://github.com/YOUR_USERNAME/my-dsa-vault.git

# Push the code to your GitHub
git push -u origin main
```

### 3. Deploy to Vercel (For Free Mobile Access)
To get that handy, read-only mobile view so you can review notes on the train:
1. Go to [Vercel](https://vercel.com/new) and log in with your GitHub account.
2. Click **Import** next to your `my-dsa-vault` repository.
3. Click **Deploy**. 
*(In 30 seconds, Vercel will give you a live `.vercel.app` URL. Bookmark this on your phone!)*

### 4. Train Your AI
This project is designed to be completely maintained by an AI (like Cursor, Windsurf, or GitHub Copilot).
Open the `AI_WORKFLOW_PROMPTS.md` file in this project, copy the massive "Master Prompt", and paste it into your AI Chat. 
From then on, whenever you finish a LeetCode problem, just tell the AI: *"I solved Two Sum, here is the code, please archive it."* 
The AI will automatically write the code to your vault, commit it to Git, and push it to GitHub—which automatically updates your live Vercel app!

---

## 🛠 Features
- **Spaced Repetition System (SRS):** Automatically tracks when you need to revise a problem (Forgot, Hard, Easy intervals).
- **Blind Mode:** Hides tags, complexities, and code so you can practice pattern recognition.
- **Topic Analytics:** Auto-categorizes problems by topics and displays a dashboard of your weakest areas.
- **AI Automation:** Designed specifically for an AI agent to parse, format, and push code directly to the vault autonomously.
