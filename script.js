// State management
let credits = 10;
let usedCodes = [];
let geminiApiKey = '';
let vercelToken = 'GZoCw2xrGg3hwCkKQXxO7z34';
let pendingDeployment = null;
let isProcessing = false;

const redeemCodes = {
    'Rafiensem': 5,
    'Rafikacak': 5,
    'Rapzz88': 8,
    'Nicewebsite': 10,
    'sayangowner': 20
};

// Load saved data
function loadData() {
    const saved = sessionStorage.getItem('rapzbotData');
    if (saved) {
        const data = JSON.parse(saved);
        credits = data.credits || 10;
        usedCodes = data.usedCodes || [];
        geminiApiKey = data.geminiApiKey || '';
        vercelToken = data.vercelToken || 'GZoCw2xrGg3hwCkKQXxO7z34';
        
        if (geminiApiKey) document.getElementById('geminiKey').value = geminiApiKey;
        if (vercelToken) document.getElementById('vercelToken').value = vercelToken;
    }
    updateCreditDisplay();
}

// Save data
function saveData() {
    sessionStorage.setItem('rapzbotData', JSON.stringify({
        credits,
        usedCodes,
        geminiApiKey,
        vercelToken
    }));
}

// Update credit display
function updateCreditDisplay() {
    document.getElementById('creditDisplay').textContent = credits;
}

// Toggle sidebar
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

// Save API keys
function saveApiKeys() {
    geminiApiKey = document.getElementById('geminiKey').value.trim();
    vercelToken = document.getElementById('vercelToken').value.trim();
    
    if (!geminiApiKey) {
        showAlert('keyAlert', 'Sila masukkan Gemini API key!', 'error');
        return;
    }
    
    saveData();
    showAlert('keyAlert', 'API keys berjaya disimpan!', 'success');
}

// Show alert
function showAlert(elementId, message, type) {
    const alert = document.getElementById(elementId);
    alert.textContent = message;
    alert.className = `alert ${type} show`;
    setTimeout(() => alert.classList.remove('show'), 3000);
}

// Redeem code
function handleRedeem() {
    const code = document.getElementById('redeemCode').value.trim();
    
    if (!code) {
        showAlert('redeemAlert', 'Sila masukkan code!', 'error');
        return;
    }

    if (usedCodes.includes(code)) {
        showAlert('redeemAlert', 'Code ini telah digunakan!', 'error');
        return;
    }

    if (redeemCodes[code]) {
        const creditAmount = redeemCodes[code];
        credits += creditAmount;
        usedCodes.push(code);
        updateCreditDisplay();
        saveData();
        
        showAlert('redeemAlert', `Berjaya! +${creditAmount} credit ditambah!`, 'success');
        document.getElementById('redeemCode').value = '';
    } else {
        showAlert('redeemAlert', 'Code tidak sah!', 'error');
    }
}

// Add message to chat
function addMessage(content, isUser = false) {
    const chatContainer = document.getElementById('chatContainer');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user' : 'bot'}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = isUser ? '👤' : '🤖';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.innerHTML = content;
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(contentDiv);
    chatContainer.appendChild(messageDiv);
    
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Show typing indicator
function showTyping() {
    const chatContainer = document.getElementById('chatContainer');
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message bot';
    typingDiv.id = 'typingIndicator';
    typingDiv.innerHTML = `
        <div class="message-avatar">🤖</div>
        <div class="typing-indicator">
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
        </div>
    `;
    chatContainer.appendChild(typingDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Hide typing indicator
function hideTyping() {
    const typing = document.getElementById('typingIndicator');
    if (typing) typing.remove();
}

// Extract code blocks from text
function extractCodeBlocks(text) {
    const codeRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const blocks = [];
    let match;
    
    while ((match = codeRegex.exec(text)) !== null) {
        blocks.push({
            language: match[1] || 'text',
            code: match[2].trim()
        });
    }
    
    return blocks;
}

// Format response with code blocks
function formatResponse(text) {
    // Remove DEPLOY_READY marker
    text = text.replace(/DEPLOY_READY:.*$/m, '');
    
    // Format code blocks
    text = text.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
        const language = lang || 'text';
        const blockId = 'code_' + Math.random().toString(36).substr(2, 9);
        const escapedCode = escapeHtml(code.trim());
        return `
            <div class="code-block">
                <div class="code-header">
                    <span>${language}</span>
                    <button class="copy-code-btn" onclick="copyCode('${blockId}')">📋 Copy</button>
                </div>
                <pre id="${blockId}">${escapedCode}</pre>
            </div>
        `;
    });
    
    // Format line breaks
    text = text.replace(/\n/g, '<br>');
    
    return text;
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Copy code to clipboard
function copyCode(blockId) {
    const code = document.getElementById(blockId).textContent;
    navigator.clipboard.writeText(code).then(() => {
        alert('Code telah dicopy! ✅');
    });
}

// Extract files for deployment
function extractDeployFiles(text, codeBlocks) {
    const files = [];
    
    if (text.includes('DEPLOY_READY:') && codeBlocks.length > 0) {
        codeBlocks.forEach((block, index) => {
            let filename = `file${index}.${block.language}`;
            
            if (block.language === 'html') {
                filename = index === 0 ? 'index.html' : `page${index}.html`;
            } else if (block.language === 'css') {
                filename = 'style.css';
            } else if (block.language === 'javascript' || block.language === 'js') {
                filename = 'script.js';
            }
            
            files.push({
                filename: filename,
                content: block.code
            });
        });
    }
    
    return files;
}

// Get deploy prompt HTML
function getDeployPrompt() {
    return `
        <div class="deploy-prompt">
            <h4>🚀 Code sedia untuk deploy!</h4>
            <p>Adakah anda mahu deploy code ini ke Vercel sekarang?</p>
            <div class="deploy-buttons">
                <button class="deploy-btn yes" onclick="deployNow()">✅ Ya, Deploy</button>
                <button class="deploy-btn no" onclick="cancelDeploy()">❌ Tidak</button>
            </div>
        </div>
    `;
}

// Send message to Gemini
async function sendMessage() {
    const input = document.getElementById('userInput');
    const message = input.value.trim();
    
    if (!message || isProcessing) return;
    
    if (!geminiApiKey) {
        alert('Sila tetapkan Gemini API key di settings terlebih dahulu!');
        toggleSidebar();
        return;
    }

    // Add user message
    addMessage(message, true);
    input.value = '';
    
    // Disable input
    isProcessing = true;
    document.getElementById('sendBtn').disabled = true;
    
    showTyping();

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiApiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `You are Rapzbot, an AI coding assistant created by Rapzz (Rafiuddin, GitHub: rapzz88) with help from Claude AI.

Your capabilities:
- Help write, debug, and explain code
- Create complete web applications (HTML, CSS, JavaScript)
- Suggest best practices and optimizations
- Answer programming questions

IMPORTANT: When you generate complete, deployable code (HTML files with optional CSS/JS), you MUST end your response with:
"DEPLOY_READY"

Make sure to wrap code in proper markdown code blocks with language specified.

User message: ${message}`
                    }]
                }]
            })
        });

        hideTyping();

        if (!response.ok) {
            throw new Error('Gagal mendapat response dari Gemini API');
        }

        const data = await response.json();
        const botResponse = data.candidates[0].content.parts[0].text;
        
        // Extract code blocks
        const codeBlocks = extractCodeBlocks(botResponse);
        let formattedResponse = formatResponse(botResponse);
        
        // Check if deployable
        if (botResponse.includes('DEPLOY_READY:') || botResponse.includes('DEPLOY_READY')) {
            const files = extractDeployFiles(botResponse, codeBlocks);
            if (files.length > 0) {
                pendingDeployment = files;
                formattedResponse += getDeployPrompt();
            }
        }
        
        addMessage(formattedResponse);
        
    } catch (error) {
        hideTyping();
        addMessage(`❌ Maaf, terjadi error: ${error.message}. Sila pastikan API key anda betul.`);
    }
    
    isProcessing = false;
    document.getElementById('sendBtn').disabled = false;
}

// Deploy to Vercel
async function deployNow() {
    if (!pendingDeployment || pendingDeployment.length === 0) {
        addMessage('❌ Tiada code untuk di deploy!');
        return;
    }

    if (credits < 1) {
        addMessage('❌ Credit tidak mencukupi! Sila redeem code untuk deploy.');
        return;
    }

    // Deduct credit
    credits--;
    updateCreditDisplay();
    saveData();

    addMessage('⏳ Sedang deploy ke Vercel...');

    try {
        const projectName = 'rapzbot-' + Date.now();
        const files = pendingDeployment.map(f => ({
            file: f.filename,
            data: f.content
        }));

        const response = await fetch('https://api.vercel.com/v13/deployments', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${vercelToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: projectName,
                files: files,
                projectSettings: {
                    framework: null
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Deployment gagal');
        }

        const deployData = await response.json();
        const deployUrl = `https://${deployData.url}`;
        
        addMessage(`
            <div class="deployment-status">
                <h4>✅ Deployment Berjaya!</h4>
                <p>Website anda telah berjaya di deploy!</p>
                <div class="deployment-link">${deployUrl}</div>
                <button class="copy-link-btn" onclick="copyDeployLink('${deployUrl}')">📋 Copy Link</button>
            </div>
        `);
        
        pendingDeployment = null;

    } catch (error) {
        // Refund credit
        credits++;
        updateCreditDisplay();
        saveData();
        
        addMessage(`❌ Deployment gagal: ${error.message}`);
    }
}

// Cancel deployment
function cancelDeploy() {
    pendingDeployment = null;
    addMessage('❌ Deployment dibatalkan.');
}

// Copy deployment link
function copyDeployLink(url) {
    navigator.clipboard.writeText(url).then(() => {
        alert('Link telah dicopy! ✅');
    });
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    
    // Send button
    document.getElementById('sendBtn').addEventListener('click', sendMessage);
    
    // Enter to send
    document.getElementById('userInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Sidebar toggle
    document.getElementById('sidebarToggle').addEventListener('click', toggleSidebar);
    
    // Save API keys
    document.getElementById('saveKeysBtn').addEventListener('click', saveApiKeys);
    
    // Redeem code
    document.getElementById('redeemBtn').addEventListener('click', handleRedeem);
    
    // Close sidebar when clicking outside
    document.addEventListener('click', (e) => {
        const sidebar = document.getElementById('sidebar');
        const toggle = document.getElementById('sidebarToggle');
        
        if (sidebar.classList.contains('open') && 
            !sidebar.contains(e.target) && 
            !toggle.contains(e.target)) {
            sidebar.classList.remove('open');
        }
    });
});
