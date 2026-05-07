// State variables
let threads = [];
let activeThreadId = null;
let aiSession = null;
let currentGeneratingMessageId = null;

// DOM Elements
const startupOverlay = document.getElementById('startup-overlay');
const startupLoading = document.getElementById('startup-loading');
const startupErrorApi = document.getElementById('startup-error-api');
const startupDownloadPrompt = document.getElementById('startup-download-prompt');
const startupDownloading = document.getElementById('startup-downloading');
const btnRecheckApi = document.getElementById('btn-recheck-api');
const btnStartDownload = document.getElementById('btn-start-download');
const progressBar = document.getElementById('download-progress-bar');
const progressPercentage = document.getElementById('download-percentage');
const progressBytes = document.getElementById('download-bytes');

const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const btnSend = document.getElementById('btn-send');
const toggleThinking = document.getElementById('toggle-thinking');
const historyContainer = document.getElementById('history-container');
const btnNewChat = document.getElementById('btn-new-chat');
const btnClearAll = document.getElementById('btn-clear-all');

const paramTemp = document.getElementById('param-temp');
const paramTopK = document.getElementById('param-topk');
const paramSystemPrompt = document.getElementById('param-system-prompt');
const tempValue = document.getElementById('temp-value');
const topkValue = document.getElementById('topk-value');

const speedMeter = document.getElementById('speed-meter');
const speedValue = document.getElementById('speed-value');
const speedCharCount = document.getElementById('speed-char-count');
const modelBadge = document.getElementById('model-badge');
const offlineBadge = document.getElementById('offline-badge');
const welcomeMessage = document.getElementById('welcome-message');

const infoModal = document.getElementById('info-modal');
const btnShowModelInfo = document.getElementById('btn-show-model-info');
const btnCloseModal = document.getElementById('btn-close-modal');
const btnBypassAndChat = document.getElementById('btn-bypass-and-chat');

// --- PWA SERVICE WORKER REGISTRATION ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then((reg) => console.log('Service Worker registered with scope:', reg.scope))
      .catch((err) => console.error('Service Worker registration failed:', err));
  });
}

// --- ONLINE/OFFLINE DETECTION ---
function updateOnlineStatus() {
  if (navigator.onLine) {
    offlineBadge.classList.add('hidden');
    offlineBadge.classList.remove('flex');
  } else {
    offlineBadge.classList.remove('hidden');
    offlineBadge.classList.add('flex');
  }
}
window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);
updateOnlineStatus();

// --- VERSION DETECTION UTILITY ---
function getChromeVersion() {
  const raw = navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./);
  return raw ? parseInt(raw[2], 10) : false;
}

// --- UNIVERSAL PROMPT API WRAPPERS ---
async function getModelAvailability() {
  if (typeof LanguageModel !== 'undefined' && typeof LanguageModel.availability === 'function') {
    return await LanguageModel.availability();
  }
  
  const aiObj = window.ai || (typeof ai !== 'undefined' ? ai : null);
  if (aiObj && aiObj.languageModel) {
    if (typeof aiObj.languageModel.capabilities === 'function') {
      const caps = await aiObj.languageModel.capabilities();
      return caps.available;
    } else if (typeof aiObj.languageModel.availability === 'function') {
      return await aiObj.languageModel.availability();
    }
    return 'available';
  }
  
  return 'no';
}

async function createModelSession(options) {
  if (typeof LanguageModel !== 'undefined' && typeof LanguageModel.create === 'function') {
    return await LanguageModel.create(options);
  }
  
  const aiObj = window.ai || (typeof ai !== 'undefined' ? ai : null);
  if (aiObj && aiObj.languageModel && typeof aiObj.languageModel.create === 'function') {
    return await aiObj.languageModel.create(options);
  }
  
  throw new Error('Prompt API is not supported in this browser.');
}

// --- STARTUP VALIDATION AND MODEL CHECK ---
async function checkSystemRequirements() {
  showOverlaySection(startupLoading);
  
  // Validate Chrome version (require 148+)
  const chromeVersion = getChromeVersion();
  const versionWarning = document.getElementById('version-warning');
  const currentVersion = document.getElementById('current-version');
  
  if (chromeVersion && chromeVersion < 148) {
    if (versionWarning && currentVersion) {
      currentVersion.textContent = chromeVersion;
      versionWarning.classList.remove('hidden');
    }
  } else {
    if (versionWarning) {
      versionWarning.classList.add('hidden');
    }
  }
  
  try {
    const available = await getModelAvailability();

    if (available === 'available') {
      // System is completely ready!
      hideStartupOverlay();
      initializeChatSystem();
      modelBadge.textContent = 'Gemini Nano (LanguageModel)';
      modelBadge.parentElement.className = "flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium border border-emerald-500/20 bg-emerald-500/5 text-emerald-300";
    } else if (available === 'downloadable' || available === 'after-download') {
      // Model weights download required
      showOverlaySection(startupDownloadPrompt);
    } else {
      // Explicitly unavailable or policy restricted
      showOverlaySection(startupErrorApi);
      modelBadge.textContent = 'Prompt API Blocked/Unavailable';
      modelBadge.parentElement.className = "flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium border border-red-500/20 bg-red-500/5 text-red-300";
    }
  } catch (err) {
    console.error('System validation failed:', err);
    showOverlaySection(startupErrorApi);
  }
}

function showOverlaySection(section) {
  startupLoading.classList.add('hidden');
  startupErrorApi.classList.add('hidden');
  startupDownloadPrompt.classList.add('hidden');
  startupDownloading.classList.add('hidden');
  
  section.classList.remove('hidden');
  startupOverlay.classList.remove('hidden');
}

function hideStartupOverlay() {
  startupOverlay.classList.add('hidden');
}

// Model download trigger
async function triggerModelDownload() {
  showOverlaySection(startupDownloading);

  try {
    // Calling createModelSession with monitor listener will trigger downloading state
    const session = await createModelSession({
      monitor(m) {
        m.addEventListener('downloadprogress', (e) => {
          const totalMB = (e.total / (1024 * 1024)).toFixed(1);
          const loadedMB = (e.loaded / (1024 * 1024)).toFixed(1);
          const percentage = Math.round((e.loaded / e.total) * 100) || 0;
          
          progressBar.style.width = `${percentage}%`;
          progressPercentage.textContent = `${percentage}%`;
          progressBytes.textContent = `${loadedMB} MB / ${totalMB} MB`;
        });
      }
    });

    // Successfully downloaded and built session!
    session.destroy(); // Free initial dummy session
    hideStartupOverlay();
    initializeChatSystem();
  } catch (err) {
    console.error('Download or creation failed:', err);
    showOverlaySection(startupErrorApi);
  }
}

// --- MAIN CHAT SYSTEM INITIALIZATION ---
function initializeChatSystem() {
  loadThreadsFromStorage();
  renderHistory();
  
  // Load saved parameters from localStorage
  const savedSystemPrompt = localStorage.getItem('param_system_prompt');
  if (savedSystemPrompt !== null && paramSystemPrompt) {
    paramSystemPrompt.value = savedSystemPrompt;
  }
  const savedTemp = localStorage.getItem('param_temp');
  if (savedTemp !== null && paramTemp) {
    paramTemp.value = savedTemp;
    if (tempValue) tempValue.textContent = parseFloat(savedTemp).toFixed(2);
  }
  const savedTopK = localStorage.getItem('param_topk');
  if (savedTopK !== null && paramTopK) {
    paramTopK.value = savedTopK;
    if (topkValue) topkValue.textContent = savedTopK;
  }

  setupEventListeners();
  
  // Create first thread automatically if history is empty
  if (threads.length === 0) {
    createNewThread();
  } else {
    // Select the most recent thread
    const lastActive = localStorage.getItem('activeThreadId');
    if (lastActive && threads.find(t => t.id === lastActive)) {
      selectThread(lastActive);
    } else {
      selectThread(threads[0].id);
    }
  }
}

// --- DATABASE STATE MANAGEMENT ---
function loadThreadsFromStorage() {
  const data = localStorage.getItem('aether_chat_threads');
  if (data) {
    try {
      threads = JSON.parse(data);
    } catch (e) {
      console.error('Error parsing local threads:', e);
      threads = [];
    }
  } else {
    threads = [];
  }
}

function saveThreadsToStorage() {
  localStorage.setItem('aether_chat_threads', JSON.stringify(threads));
  localStorage.setItem('activeThreadId', activeThreadId);
}

function createNewThread() {
  const newThread = {
    id: 'thread_' + Date.now(),
    title: '新しい会話スレッド',
    messages: [],
    updatedAt: Date.now()
  };
  threads.unshift(newThread);
  activeThreadId = newThread.id;
  saveThreadsToStorage();
  
  renderHistory();
  selectThread(newThread.id);
}

function selectThread(threadId) {
  activeThreadId = threadId;
  saveThreadsToStorage();
  
  // Highlight active thread in side panel
  const allCards = historyContainer.querySelectorAll('.thread-card');
  allCards.forEach(card => {
    if (card.dataset.id === threadId) {
      card.classList.add('bg-violet-500/10', 'border-violet-500/20', 'text-white');
      card.classList.remove('text-slate-400', 'border-transparent', 'hover:bg-white/5');
    } else {
      card.classList.remove('bg-violet-500/10', 'border-violet-500/20', 'text-white');
      card.classList.add('text-slate-400', 'border-transparent', 'hover:bg-white/5');
    }
  });

  // Load active messages
  const activeThread = threads.find(t => t.id === threadId);
  if (activeThread) {
    renderMessages(activeThread.messages);
  }
}

function deleteThread(threadId, e) {
  e.stopPropagation(); // Avoid selecting deleted thread
  
  threads = threads.filter(t => t.id !== threadId);
  saveThreadsToStorage();
  renderHistory();
  
  if (threads.length === 0) {
    createNewThread();
  } else if (activeThreadId === threadId) {
    selectThread(threads[0].id);
  }
}

function clearAllData() {
  if (confirm('すべてのスレッド履歴を完全に削除しますか？この操作は取り消せません。')) {
    threads = [];
    activeThreadId = null;
    localStorage.removeItem('aether_chat_threads');
    localStorage.removeItem('activeThreadId');
    createNewThread();
  }
}

// --- UI RENDERING HANDLERS ---
function renderHistory() {
  historyContainer.innerHTML = '';
  
  if (threads.length === 0) {
    historyContainer.innerHTML = `<p class="text-xs text-slate-500 text-center py-8">スレッドはありません</p>`;
    return;
  }

  threads.forEach(thread => {
    const card = document.createElement('div');
    card.dataset.id = thread.id;
    card.className = `thread-card group flex items-center justify-between p-3 rounded-xl border text-xs font-medium cursor-pointer transition duration-150 select-none`;
    
    // Active styling check
    if (thread.id === activeThreadId) {
      card.classList.add('bg-violet-500/10', 'border-violet-500/20', 'text-white');
    } else {
      card.classList.add('text-slate-400', 'border-transparent', 'hover:bg-white/5');
    }
    
    // Main text & delete trigger
    card.innerHTML = `
      <div class="flex items-center space-x-2.5 overflow-hidden w-full pr-2">
        <span class="text-sm shrink-0">💬</span>
        <span class="truncate font-outfit font-normal text-slate-200 group-hover:text-white transition">${thread.title}</span>
      </div>
      <button class="delete-btn opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 rounded transition shrink-0" title="スレッドを削除">
        🗑️
      </button>
    `;
    
    card.addEventListener('click', () => selectThread(thread.id));
    card.querySelector('.delete-btn').addEventListener('click', (e) => deleteThread(thread.id, e));
    
    historyContainer.appendChild(card);
  });
}

function renderMessages(messages) {
  // Clear container
  chatMessages.innerHTML = '';
  
  if (messages.length === 0) {
    chatMessages.appendChild(welcomeMessage);
    welcomeMessage.classList.remove('hidden');
    welcomeMessage.classList.add('flex');
    return;
  }

  welcomeMessage.classList.add('hidden');
  welcomeMessage.classList.remove('flex');

  messages.forEach(msg => {
    appendMessageToDOM(msg.role, msg.text, msg.id, msg.thinking);
  });

  // Scroll to bottom
  scrollToBottom();
}

function appendMessageToDOM(role, rawText, id = null, thinkingText = null) {
  const msgDiv = document.createElement('div');
  msgDiv.className = `flex ${role === 'user' ? 'justify-end' : 'justify-start'} w-full animate-fade-in`;
  if (id) msgDiv.dataset.id = id;

  const isUser = role === 'user';
  
  // Custom parsing for assistant message (with optional thought log)
  let innerHTML = '';
  
  if (isUser) {
    innerHTML = `
      <div class="max-w-[85%] md:max-w-[70%] bg-indigo-600/15 border border-indigo-500/25 px-4 py-3.5 rounded-2xl rounded-tr-none shadow-md">
        <p class="text-sm text-indigo-100 leading-relaxed font-sans select-text whitespace-pre-wrap">${escapeHTML(rawText)}</p>
      </div>
    `;
  } else {
    // Assistant message layout
    innerHTML = `
      <div class="flex items-start space-x-3 max-w-[90%] md:max-w-[75%]">
        <!-- Logo Avatar -->
        <div class="w-8 h-8 rounded-lg overflow-hidden border border-violet-500/20 shadow-md shrink-0 select-none bg-slate-900 mt-1 flex items-center justify-center">
          <img src="./icon-192.png" alt="Aether" class="w-full h-full object-cover" />
        </div>
        
        <!-- Chat Bubble -->
        <div class="bg-slate-900/50 border border-white/5 px-4.5 py-4 rounded-2xl rounded-tl-none shadow-xl flex-1 min-w-0">
          <!-- Thinking Log Block (if present) -->
          <div class="thinking-block hidden flex flex-col mb-4 bg-slate-950/40 rounded-xl border border-white/5 overflow-hidden">
            <button class="thinking-toggle-btn flex items-center justify-between w-full px-3.5 py-2.5 text-[11px] font-mono font-medium text-slate-400 hover:text-slate-200 transition focus:outline-none">
              <div class="flex items-center space-x-2">
                <span class="thinking-arrow transition-transform duration-200 transform">▶</span>
                <span class="thinking-dot w-2 h-2 rounded-full bg-violet-400 animate-pulse"></span>
                <span class="thinking-status">思考プロセス（CoT）</span>
              </div>
              <span class="thinking-time text-[10px] text-slate-500">推論中...</span>
            </button>
            <div class="thinking-log hidden px-4 pb-3.5 text-xs text-slate-400 leading-relaxed italic font-mono select-text border-t border-white/5 pt-3 max-h-60 overflow-y-auto"></div>
          </div>

          <!-- Final Response content -->
          <div class="response-content text-sm text-slate-200 leading-relaxed font-sans select-text whitespace-pre-wrap"></div>
        </div>
      </div>
    `;
  }

  msgDiv.innerHTML = innerHTML;
  chatMessages.appendChild(msgDiv);

  // If there's an active thought log, render it
  if (!isUser) {
    const responseEl = msgDiv.querySelector('.response-content');
    const thinkingBlock = msgDiv.querySelector('.thinking-block');
    const thinkingLog = msgDiv.querySelector('.thinking-log');
    const thinkingArrow = msgDiv.querySelector('.thinking-arrow');
    const thinkingStatus = msgDiv.querySelector('.thinking-status');
    const thinkingTime = msgDiv.querySelector('.thinking-time');
    const thinkingToggle = msgDiv.querySelector('.thinking-toggle-btn');

    // Process parsing
    let { thought, response } = parseThinkingTags(rawText);
    
    // Explicitly override thinkingText if passed
    if (thinkingText !== null) {
      thought = thinkingText;
    }

    if (thought) {
      thinkingBlock.classList.remove('hidden');
      thinkingLog.innerHTML = renderMarkdown(thought);
      
      // Setup expand toggle
      thinkingToggle.onclick = () => {
        const isHidden = thinkingLog.classList.toggle('hidden');
        thinkingArrow.style.transform = isHidden ? 'rotate(0deg)' : 'rotate(90deg)';
      };

      // Set default open state if still generating, else collapsed
      if (id === currentGeneratingMessageId) {
        thinkingLog.classList.remove('hidden');
        thinkingArrow.style.transform = 'rotate(90deg)';
      } else {
        thinkingStatus.textContent = '思考プロセス（完了）';
        thinkingTime.textContent = '';
        msgDiv.querySelector('.thinking-dot').classList.remove('bg-violet-400', 'animate-pulse');
        msgDiv.querySelector('.thinking-dot').classList.add('bg-emerald-500');
      }
    }

    responseEl.innerHTML = renderMarkdown(response || (thought ? "" : rawText));
  }

  scrollToBottom();
}

// Update streamed message details in real-time
function updateStreamedMessage(id, text, estimatedSpeed = 0, isCompleted = false) {
  const msgDiv = chatMessages.querySelector(`[data-id="${id}"]`);
  if (!msgDiv) return;

  const responseEl = msgDiv.querySelector('.response-content');
  const thinkingBlock = msgDiv.querySelector('.thinking-block');
  const thinkingLog = msgDiv.querySelector('.thinking-log');
  const thinkingArrow = msgDiv.querySelector('.thinking-arrow');
  const thinkingStatus = msgDiv.querySelector('.thinking-status');
  const thinkingTime = msgDiv.querySelector('.thinking-time');

  let { thought, response } = parseThinkingTags(text);

  // Show thinking block if model is currently thinking
  if (thought) {
    thinkingBlock.classList.remove('hidden');
    thinkingLog.innerHTML = renderMarkdown(thought);
    
    // Dynamically show log if it was hidden initially during generation
    if (id === currentGeneratingMessageId && thinkingLog.classList.contains('hidden')) {
      thinkingLog.classList.remove('hidden');
      thinkingArrow.style.transform = 'rotate(90deg)';
    }
  }

  // Handle final completion state for thinking
  if (isCompleted) {
    if (thought) {
      thinkingStatus.textContent = '思考プロセス（完了）';
      thinkingTime.textContent = '';
      const dot = msgDiv.querySelector('.thinking-dot');
      if (dot) {
        dot.classList.remove('bg-violet-400', 'animate-pulse');
        dot.classList.add('bg-emerald-500');
      }
      
      // Auto-collapse thinking process when finished to look clean!
      thinkingLog.classList.add('hidden');
      thinkingArrow.style.transform = 'rotate(0deg)';
    }
  }

  responseEl.innerHTML = renderMarkdown(response || (thought ? "" : text));
  scrollToBottom();
}

function scrollToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// --- UTILITY COMPILERS AND PARSERS ---
function escapeHTML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function parseThinkingTags(text) {
  // Check for thinking blocks
  const thinkStart = text.indexOf('<think>');
  const thinkEnd = text.indexOf('</think>');

  if (thinkStart !== -1) {
    if (thinkEnd !== -1) {
      // Completed thinking
      const thought = text.substring(thinkStart + 7, thinkEnd).trim();
      const response = text.substring(thinkEnd + 8).trim();
      return { thought, response };
    } else {
      // Currently thinking
      const thought = text.substring(thinkStart + 7).trim();
      return { thought, response: "" };
    }
  }
  
  return { thought: null, response: text };
}

function renderMarkdown(text) {
  if (!text) return "";
  let html = text;
  
  // Safe HTML Escapes
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Render multi-line code blocks: ```javascript ... ```
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
    const escapedCode = code.trim();
    return `<div class="my-3 rounded-lg overflow-hidden border border-white/10 font-mono text-xs bg-slate-950/80">
      <div class="bg-slate-900/60 px-4 py-1.5 flex justify-between items-center text-[10px] text-slate-400 border-b border-white/5 select-none">
        <span>${lang || 'code'}</span>
        <button class="hover:text-white cursor-pointer transition uppercase font-semibold text-[10px]" onclick="navigator.clipboard.writeText(\`${escapedCode.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`)">コピー</button>
      </div>
      <pre class="p-4 overflow-x-auto text-cyan-200/90 select-all font-mono leading-relaxed"><code>${escapedCode}</code></pre>
    </div>`;
  });

  // Render inline code: `code`
  html = html.replace(/`([^`\n]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-slate-800 border border-white/5 text-cyan-300 font-mono text-[11px]">$1</code>');

  // Render Bold: **text**
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-white">$1</strong>');

  // Render Italic: *text*
  html = html.replace(/\*([^*]+)\*/g, '<em class="italic text-slate-300">$1</em>');

  // Render Line breaks
  html = html.replace(/\n/g, '<br />');

  return html;
}

// Token counter high-fidelity heuristic
function estimateTokens(text) {
  let tokens = 0;
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    if (charCode >= 0x3000 && charCode <= 0x9FFF) {
      // CJK characters: roughly 1 token per character in Gemini Nano
      tokens += 1;
    } else {
      // English words/symbols: roughly 0.25 tokens per character
      tokens += 0.25;
    }
  }
  return Math.max(1, Math.round(tokens));
}

// --- PROMPT API ORCHESTRATION ---
async function handleMessageSubmission() {
  const userText = chatInput.value.trim();
  if (!userText || currentGeneratingMessageId) return;

  // Clear inputs
  chatInput.value = '';
  chatInput.style.height = 'auto';

  const activeThread = threads.find(t => t.id === activeThreadId);
  if (!activeThread) return;

  // Append user message
  const userMessageId = 'msg_' + Date.now();
  const userMessage = { id: userMessageId, role: 'user', text: userText };
  activeThread.messages.push(userMessage);

  // Dynamically update thread title if it is the first user message
  if (activeThread.messages.filter(m => m.role === 'user').length === 1) {
    activeThread.title = userText.length > 15 ? userText.slice(0, 15) + '...' : userText;
    renderHistory();
  }

  activeThread.updatedAt = Date.now();
  saveThreadsToStorage();

  // Render in Chat screen
  renderMessages(activeThread.messages);

  // Setup Assistant Bubble
  const assistantMsgId = 'msg_' + (Date.now() + 1);
  currentGeneratingMessageId = assistantMsgId;
  
  // Append Assistant bubble skeleton
  appendMessageToDOM('assistant', "", assistantMsgId);

  // Enable Speedometer
  speedMeter.classList.remove('hidden');
  speedMeter.classList.add('flex');
  speedValue.textContent = '0.0';
  speedCharCount.textContent = '0';

  // Construct context instructions dynamically from UI setting
  let systemInstructions = (paramSystemPrompt && paramSystemPrompt.value.trim()) || "You are Aether, an extremely powerful local AI assistant. Answer the user's questions clearly, concisely, and accurately in Japanese.";
  let finalPrompt = "";

  // Add recent context memory to fit Nano context limits gracefully (last 6 messages)
  const recentTurns = activeThread.messages.slice(0, -1).slice(-6);
  recentTurns.forEach(msg => {
    finalPrompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.text}\n`;
  });

  // Toggle Thinking Mode directive
  if (toggleThinking.checked) {
    systemInstructions += " 重要: ユーザーへの回答の前に、論理思考を展開するための <think> タグと </think> タグを使用してください。このタグの内部に、回答の構築プロセス、ステップ、または論理的思考ログを日本語で詳細に記録してください。タグを完全に閉じた後、通常の日本語による最終回答を出力してください。";
    finalPrompt += `User: ${userText}\nAssistant: <think>`;
  } else {
    finalPrompt += `User: ${userText}\nAssistant:`;
  }

  // Setup performance metrics
  let startTime = performance.now();
  let textReceived = "";
  let lastChunkLength = 0;

  try {
    // Instantiate prompt session with parameters using universal wrapper
    const temperature = parseFloat(paramTemp.value);
    const topK = parseInt(paramTopK.value);
    
    aiSession = await createModelSession({
      systemPrompt: systemInstructions,
      temperature: temperature,
      topK: topK
    });

    const stream = await aiSession.promptStreaming(finalPrompt);

    // Stream rendering
    for await (const chunk of stream) {
      // Check if current session was cancelled
      if (currentGeneratingMessageId !== assistantMsgId) break;

      // Handle cumulative streams
      let isCumulative = chunk.length >= lastChunkLength && chunk.startsWith(textReceived.slice(0, Math.min(textReceived.length, 20)));
      
      if (isCumulative) {
        textReceived = chunk;
      } else {
        textReceived += chunk;
      }
      lastChunkLength = chunk.length;

      // Ensure we restore the prepended <think> block if model continues stream
      let fullText = textReceived;
      if (toggleThinking.checked && !fullText.startsWith('<think>')) {
        fullText = '<think>' + fullText;
      }

      // Performance calculations
      const elapsed = (performance.now() - startTime) / 1000;
      const charCount = fullText.length;
      const tokenCount = estimateTokens(fullText);
      const tokensPerSec = (tokenCount / Math.max(0.1, elapsed)).toFixed(1);

      // Speedometer update
      speedValue.textContent = tokensPerSec;
      speedCharCount.textContent = charCount;

      updateStreamedMessage(assistantMsgId, fullText, tokensPerSec, false);
    }

    // Capture finalized responses
    let finalizedText = textReceived;
    if (toggleThinking.checked && !finalizedText.startsWith('<think>')) {
      finalizedText = '<think>' + finalizedText;
    }

    // Save output message
    const { thought, response } = parseThinkingTags(finalizedText);
    const finalAssistantMsg = {
      id: assistantMsgId,
      role: 'assistant',
      text: finalizedText,
      thinking: thought
    };

    activeThread.messages.push(finalAssistantMsg);
    saveThreadsToStorage();

    // Trigger final completion styling
    updateStreamedMessage(assistantMsgId, finalizedText, 0, true);

  } catch (err) {
    console.error('Streaming session error:', err);
    updateStreamedMessage(assistantMsgId, `⚠️ エラーが発生しました: ${err.message || 'モデルの推論中にエラーが発生しました。'}`);
  } finally {
    // Clear generation sessions
    if (aiSession) {
      try {
        aiSession.destroy();
      } catch(e){}
      aiSession = null;
    }
    
    currentGeneratingMessageId = null;
    speedMeter.classList.add('hidden');
    speedMeter.classList.remove('flex');
  }
}

// --- CONTROLS AND INTERACTIVITY EVENT LISTENERS ---
function setupEventListeners() {
  // Input autosizing
  chatInput.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = `${Math.min(chatInput.scrollHeight, 180)}px`;
  });

  // Enter triggers send, Cmd+Enter is optimal
  chatInput.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleMessageSubmission();
    }
  });

  btnSend.addEventListener('click', handleMessageSubmission);

  // New Chat Action
  btnNewChat.addEventListener('click', createNewThread);

  // Clear Database Action
  btnClearAll.addEventListener('click', clearAllData);

  // Slider adjustments and auto-saving
  paramTemp.addEventListener('input', (e) => {
    tempValue.textContent = parseFloat(e.target.value).toFixed(2);
    localStorage.setItem('param_temp', e.target.value);
  });

  paramTopK.addEventListener('input', (e) => {
    topkValue.textContent = parseInt(e.target.value);
    localStorage.setItem('param_topk', e.target.value);
  });

  if (paramSystemPrompt) {
    paramSystemPrompt.addEventListener('input', (e) => {
      localStorage.setItem('param_system_prompt', e.target.value);
    });
  }

  // Quick Action Prompts
  document.querySelectorAll('.quick-prompt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const pText = btn.querySelector('.text-slate-400').textContent.replace(/[「」]/g, '').trim();
      chatInput.value = pText;
      chatInput.style.height = 'auto';
      chatInput.style.height = `${chatInput.scrollHeight}px`;
      chatInput.focus();
    });
  });

  // Modal dialog toggles
  btnShowModelInfo.addEventListener('click', () => {
    infoModal.classList.remove('hidden');
  });

  btnCloseModal.addEventListener('click', () => {
    infoModal.classList.add('hidden');
  });

  infoModal.addEventListener('click', (e) => {
    if (e.target === infoModal) {
      infoModal.classList.add('hidden');
    }
  });

  // Action Buttons on Overlay
  btnRecheckApi.addEventListener('click', checkSystemRequirements);
  btnStartDownload.addEventListener('click', triggerModelDownload);
  
  if (btnBypassAndChat) {
    btnBypassAndChat.addEventListener('click', () => {
      hideStartupOverlay();
      initializeChatSystem();
      modelBadge.textContent = 'Sandbox (Bypassed)';
      modelBadge.parentElement.className = "flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium border border-amber-500/20 bg-amber-500/5 text-amber-300";
    });
  }
}

// Kickstart startup checks
checkSystemRequirements();
