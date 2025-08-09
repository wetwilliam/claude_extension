// AI引擎配置
const AI_ENGINES = {
  claude: {
    name: 'Claude AI',
    baseUrl: 'https://claude.ai/new',
    supportsDirectPrompt: true
  },
  gemini: {
    name: 'Google Gemini',
    baseUrl: 'https://gemini.google.com/app',
    supportsDirectPrompt: false
  }
};

// 提取頁面內容的函數
function extractPageContent() {
  try {
    console.log('📄 開始提取頁面內容...');
    
    // 先嘗試移除不需要的元素
    const elementsToRemove = [
      'script', 'style', 'nav', 'header', 'footer', 
      '.ad', '.advertisement', '.sidebar', '.menu',
      '#comment', '.comment', '#social', '.social'
    ];
    
    // 創建頁面的副本以避免修改原頁面
    const pageClone = document.cloneNode(true);
    
    elementsToRemove.forEach(selector => {
      const elements = pageClone.querySelectorAll(selector);
      elements.forEach(el => el.remove());
    });
    
    // 優先提取主要內容
    let content = '';
    
    // 嘗試不同的內容選擇器
    const contentSelectors = [
      'article',
      'main', 
      '[role="main"]',
      '.content',
      '.post-content',
      '.article-content', 
      '#content',
      '.entry-content',
      '.post-body',
      'body'
    ];
    
    for (const selector of contentSelectors) {
      const element = pageClone.querySelector(selector);
      if (element) {
        content = element.innerText || element.textContent || '';
        if (content.trim().length > 100) {
          console.log('✅ 找到內容，使用選擇器：', selector);
          break;
        }
      }
    }
    
    // 如果還是沒有足夠內容，使用整個body
    if (content.trim().length < 100) {
      content = pageClone.body?.innerText || pageClone.body?.textContent || '';
      console.log('📝 使用body內容作為備選');
    }
    
    // 清理內容
    content = content
      .replace(/\s+/g, ' ') // 多個空白字符替換為單個空格
      .replace(/\n\s*\n/g, '\n') // 多個換行替換為單個換行
      .trim();
    
    // 限制內容長度 (避免過長)
    if (content.length > 8000) {
      content = content.substring(0, 8000) + '...\n\n[內容已截斷，如需完整內容請查看原網頁]';
    }
    
    console.log('📊 提取到內容長度：', content.length);
    return content;
    
  } catch (error) {
    console.error('提取頁面內容失敗：', error);
    return document.body?.innerText || document.body?.textContent || '';
  }
}

// 獲取當前選擇的AI引擎
function getCurrentAIEngine() {
  return localStorage.getItem('ai-engine') || 'claude';
}

// 生成AI URL並處理不同引擎
async function generateAIUrl(actionType, prompt, currentUrl = '') {
  const engine = getCurrentAIEngine();
  const engineConfig = AI_ENGINES[engine];
  
  if (engineConfig.supportsDirectPrompt) {
    // Claude AI - 直接使用URL參數
    if (actionType === 'ocr') {
      // OCR特殊處理
      return `${engineConfig.baseUrl}?ocr=true&t=${Date.now()}`;
    } else {
      let fullPrompt = prompt;
      if (currentUrl && actionType !== 'search') {
        fullPrompt += `網頁連結：${currentUrl}`;
      }
      return `${engineConfig.baseUrl}?q=${encodeURIComponent(fullPrompt)}`;
    }
  } else {
    // Google Gemini - 使用localStorage儲存prompt，然後開啟網站
    let fullPrompt = prompt;
    let shouldAlert = true;
    
    if (actionType === 'ocr') {
      fullPrompt = '請幫我識別這張圖片中的文字內容，並將其轉換為可編輯的文本格式。請保持原有的排版結構。';
      shouldAlert = false; // OCR的alert在別處處理
    } else if (currentUrl && actionType !== 'search') {
      fullPrompt += `\n\n網頁連結：${currentUrl}`;
    }
    
    try {
      // 複製到剪貼簿作為備用
      await navigator.clipboard.writeText(fullPrompt);
      console.log('Prompt已複製到剪貼簿:', fullPrompt);
      
      // 儲存到localStorage供Gemini頁面讀取
      localStorage.setItem('gemini-auto-prompt', fullPrompt);
      localStorage.setItem('gemini-auto-prompt-time', Date.now().toString());
      localStorage.setItem('gemini-auto-prompt-action', actionType);
      
      console.log('Prompt已儲存到localStorage:', fullPrompt);
      
      if (shouldAlert) {
        // 顯示提示訊息
        setTimeout(() => {
          alert('內容將自動輸入到Gemini並發送！\n\n✅ 使用智能事件系統自動處理');
        }, 300);
      }
      
    } catch (error) {
      console.error('處理prompt失敗:', error);
      if (shouldAlert) {
        alert('無法處理prompt，請手動複製以下內容：\n\n' + fullPrompt);
      }
    }
    
    return engineConfig.baseUrl;
  }
}

// 創建懸浮按鈕
function createSummaryButton() {
  // 在Claude AI網站上不顯示懸浮按鈕
  if (window.location.hostname === 'claude.ai'|| window.location.hostname === 'gemini.google.com') {
    return;
  }
  
  // 檢查是否已經存在按鈕，避免重複創建
  if (document.getElementById('claude-summary-btn')) {
    return;
  }

  const button = document.createElement('button');
  button.id = 'claude-summary-btn';
  button.className = 'claude-summary-button';
  button.title = '用 Claude AI 總結此頁面 | 右鍵隱藏/顯示';
  
  // 從localStorage讀取按鈕位置和狀態
  const savedPosition = localStorage.getItem('claude-button-position');
  const savedHidden = localStorage.getItem('claude-button-hidden') === 'true';
  
  if (savedPosition) {
    const pos = JSON.parse(savedPosition);
    button.style.left = pos.x + 'px';
    button.style.top = pos.y + 'px';
    button.style.right = 'auto';
  }
  
  if (savedHidden) {
    button.classList.add('hidden');
  }
  
  // 拖拽功能變量
  let isDragging = false;
  let dragStartX, dragStartY, buttonStartX, buttonStartY;
  let dragStartTime;
  
  // 鼠標按下事件
  button.addEventListener('mousedown', function(e) {
    if (e.button === 2) return; // 右鍵不觸發拖拽
    
    dragStartTime = Date.now();
    isDragging = false;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    
    const rect = button.getBoundingClientRect();
    buttonStartX = rect.left;
    buttonStartY = rect.top;
    
    button.classList.add('dragging');
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    e.preventDefault();
  });
  
  // 鼠標移動事件
  function handleMouseMove(e) {
    const deltaX = e.clientX - dragStartX;
    const deltaY = e.clientY - dragStartY;
    
    // 如果移動距離超過5px，開始拖拽
    if (!isDragging && (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)) {
      isDragging = true;
    }
    
    if (isDragging) {
      const newX = buttonStartX + deltaX;
      const newY = buttonStartY + deltaY;
      
      // 確保按鈕不會超出視窗邊界
      const maxX = window.innerWidth - 60;
      const maxY = window.innerHeight - 60;
      
      const constrainedX = Math.max(0, Math.min(newX, maxX));
      const constrainedY = Math.max(0, Math.min(newY, maxY));
      
      button.style.left = constrainedX + 'px';
      button.style.top = constrainedY + 'px';
      button.style.right = 'auto';
    }
  }
  
  // 鼠標放開事件
  function handleMouseUp(e) {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    
    button.classList.remove('dragging');
    
    // 如果是拖拽，保存位置
    if (isDragging) {
      const rect = button.getBoundingClientRect();
      localStorage.setItem('claude-button-position', JSON.stringify({
        x: rect.left,
        y: rect.top
      }));
    }
    
    // 如果是點擊（不是拖拽且時間短），觸發總結功能
    if (!isDragging && Date.now() - dragStartTime < 200) {
      handleSummaryAction();
    }
    
    isDragging = false;
  }
  
  // 右鍵菜單事件（隱藏/顯示功能）
  button.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    
    button.classList.toggle('hidden');
    const isHidden = button.classList.contains('hidden');
    localStorage.setItem('claude-button-hidden', isHidden);
    
    button.title = isHidden ? 
      '點擊顯示 | 拖拽移動 | 右鍵切換' : 
      '用 Claude AI 總結此頁面 | 拖拽移動 | 右鍵隱藏';
  });

  // 將按鈕添加到頁面
  document.body.appendChild(button);
}

// 處理總結動作
async function handleSummaryAction() {
  try {
    console.log('📋 開始處理總結動作...');
    
    // 獲取頁面內容
    const pageContent = extractPageContent();
    const currentUrl = window.location.href;
    const pageTitle = document.title;
    
    if (!pageContent || pageContent.trim().length < 50) {
      alert('無法獲取足夠的頁面內容進行總結');
      return;
    }
    
    // 組合完整prompt
    const promptTemplate = '我希望你扮演一個摘要助手。我將向你提供文章、報告、會議記錄、學術論文或其他長篇文本內容，你需要提取關鍵資訊並產生簡潔明了的摘要。請確保摘要文章原文的核心觀點、重要數據、主要結論和關鍵細節，同時保持邏輯清晰和結構合理。摘要應探究中性，不添加個人觀點或解釋。請根據內容的複雜程度和重要性調整摘要的長度，通常會控制在原文的10-30%。如果是技術性或專業性的內容，請保留必要的專業術語。';
    
    const fullPrompt = `${promptTemplate}

請總結以下內容：

標題：${pageTitle}
來源：${currentUrl}

內容：
${pageContent}`;

    console.log('📝 總結prompt已準備，內容長度：', pageContent.length);
    
    // 複製到剪貼簿
    await navigator.clipboard.writeText(fullPrompt);
    console.log('📋 總結內容已複製到剪貼簿');
    
    const aiUrl = await generateAIUrl('summary', fullPrompt, currentUrl);
    
    // 計算右側位置
    const rightPosition = window.screen.width - 800 - 100;
    const topPosition = window.screenY + 50;
    
    // 開小視窗在右側
    window.open(aiUrl, '_blank', `width=800,height=1200,left=${rightPosition},top=${topPosition},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`);
    
  } catch (error) {
    console.error('總結功能錯誤：', error);
    alert('總結功能出現錯誤，請稍後再試');
  }
}

// 處理翻譯動作
async function handleTranslateAction() {
  try {
    console.log('🌐 開始處理翻譯動作...');
    
    // 獲取頁面內容
    const pageContent = extractPageContent();
    const currentUrl = window.location.href;
    const pageTitle = document.title;
    
    if (!pageContent || pageContent.trim().length < 10) {
      alert('無法獲取足夠的頁面內容進行翻譯');
      return;
    }
    
    // 組合完整prompt
    const promptTemplate = '我希望您選擇一個專業的翻譯助理。我將向您提供需要翻譯的文字內容或網頁，請您提供準確、流暢且符合目標語言表達習慣的翻譯。請保持原文的語調、風格和內涵，確保翻譯的專業性和準確性。對於專業術語、慣用語或文化特定的表達，請選擇最適合的對應翻譯。如果遇到模糊或有多種理解的情況，請提供最合理的內容翻譯版本。請只提供翻譯結果，無需額外的解釋或說明。';
    
    const fullPrompt = `${promptTemplate}

請翻譯以下內容為中文：

標題：${pageTitle}
來源：${currentUrl}

內容：
${pageContent}`;

    console.log('🌐 翻譯prompt已準備，內容長度：', pageContent.length);
    
    // 複製到剪貼簿
    await navigator.clipboard.writeText(fullPrompt);
    console.log('📋 翻譯內容已複製到剪貼簿');
    
    const aiUrl = await generateAIUrl('translate', fullPrompt, currentUrl);
    
    // 計算右側位置
    const rightPosition = window.screen.width - 800 - 100;
    const topPosition = window.screenY + 50;
    
    // 開小視窗在右側
    window.open(aiUrl, '_blank', `width=800,height=1200,left=${rightPosition},top=${topPosition},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`);
    
  } catch (error) {
    console.error('翻譯功能錯誤：', error);
    alert('翻譯功能出現錯誤，請稍後再試');
  }
}

// 處理搜尋動作
async function handleSearchAction() {
  const keyword = prompt('請輸入搜尋關鍵字：');
  if (keyword && keyword.trim()) {
    const searchPrompt = `請收集「${keyword.trim()}」的最新相關資訊，並遵守以下指引：只根據你實際使用搜尋工具檢索到的公開數據回答，不得依賴內建知識或推測內容。所有重要數據與事實，務必標明明確資料來源（如新聞、官方公告、專業網站），並於每點附上來源說明。若某項資訊未於檢索工具或外部資料中獲得，請明確回覆「查無此資料」或「資訊不足」，嚴禁自行假設或補足內容。`;
    const aiUrl = await generateAIUrl('search', searchPrompt);
    
    // 計算右側位置
    const rightPosition = window.screen.width - 800 - 100; // 螢幕寬度 - 視窗寬度 - 邊距
    const topPosition = window.screenY + 50; // 當前視窗頂部 + 小邊距
    
    // 開小視窗在右側
    window.open(aiUrl, '_blank', `width=800,height=1200,left=${rightPosition},top=${topPosition},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`);
  }
}

// 創建翻譯按鈕
function createTranslateButton() {
  // 在Claude AI網站上不顯示懸浮按鈕
  if (window.location.hostname === 'claude.ai' || window.location.hostname === 'gemini.google.com') {
    return;
  }
  
  // 檢查是否已經存在按鈕，避免重複創建
  if (document.getElementById('claude-translate-btn')) {
    return;
  }

  const button = document.createElement('button');
  button.id = 'claude-translate-btn';
  button.className = 'claude-translate-button';
  button.title = '用 Claude AI 翻譯此頁面為中文 | 右鍵隱藏/顯示';
  
  // 從localStorage讀取按鈕位置和狀態
  const savedPosition = localStorage.getItem('claude-translate-position');
  const savedHidden = localStorage.getItem('claude-translate-hidden') === 'true';
  
  if (savedPosition) {
    const pos = JSON.parse(savedPosition);
    button.style.left = pos.x + 'px';
    button.style.top = pos.y + 'px';
    button.style.right = 'auto';
  }
  
  if (savedHidden) {
    button.classList.add('hidden');
  }
  
  // 拖拽功能變量
  let isDragging = false;
  let dragStartX, dragStartY, buttonStartX, buttonStartY;
  let dragStartTime;
  
  // 鼠標按下事件
  button.addEventListener('mousedown', function(e) {
    if (e.button === 2) return; // 右鍵不觸發拖拽
    
    dragStartTime = Date.now();
    isDragging = false;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    
    const rect = button.getBoundingClientRect();
    buttonStartX = rect.left;
    buttonStartY = rect.top;
    
    button.classList.add('dragging');
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    e.preventDefault();
  });
  
  // 鼠標移動事件
  function handleMouseMove(e) {
    const deltaX = e.clientX - dragStartX;
    const deltaY = e.clientY - dragStartY;
    
    // 如果移動距離超過5px，開始拖拽
    if (!isDragging && (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)) {
      isDragging = true;
    }
    
    if (isDragging) {
      const newX = buttonStartX + deltaX;
      const newY = buttonStartY + deltaY;
      
      // 確保按鈕不會超出視窗邊界
      const maxX = window.innerWidth - 60;
      const maxY = window.innerHeight - 60;
      
      const constrainedX = Math.max(0, Math.min(newX, maxX));
      const constrainedY = Math.max(0, Math.min(newY, maxY));
      
      button.style.left = constrainedX + 'px';
      button.style.top = constrainedY + 'px';
      button.style.right = 'auto';
    }
  }
  
  // 鼠標放開事件
  function handleMouseUp(e) {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    
    button.classList.remove('dragging');
    
    // 如果是拖拽，保存位置
    if (isDragging) {
      const rect = button.getBoundingClientRect();
      localStorage.setItem('claude-translate-position', JSON.stringify({
        x: rect.left,
        y: rect.top
      }));
    }
    
    // 如果是點擊（不是拖拽且時間短），觸發翻譯功能
    if (!isDragging && Date.now() - dragStartTime < 200) {
      handleTranslateAction();
    }
    
    isDragging = false;
  }
  
  // 右鍵菜單事件（隱藏/顯示功能）
  button.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    
    button.classList.toggle('hidden');
    const isHidden = button.classList.contains('hidden');
    localStorage.setItem('claude-translate-hidden', isHidden);
    
    button.title = isHidden ? 
      '點擊顯示 | 拖拽移動 | 右鍵切換' : 
      '用 Claude AI 翻譯此頁面為中文 | 拖拽移動 | 右鍵隱藏';
  });

  // 將按鈕添加到頁面
  document.body.appendChild(button);
}

// 創建搜尋按鈕
function createSearchButton() {
  // 在Claude AI網站上不顯示懸浮按鈕
  if (window.location.hostname === 'claude.ai'|| window.location.hostname === 'gemini.google.com') {
    return;
  }
  
  // 檢查是否已經存在按鈕，避免重複創建
  if (document.getElementById('claude-search-btn')) {
    return;
  }

  const button = document.createElement('button');
  button.id = 'claude-search-btn';
  button.className = 'claude-search-button';
  button.title = '自定義搜尋功能 | 右鍵隱藏/顯示';
  
  // 從localStorage讀取按鈕位置和狀態
  const savedPosition = localStorage.getItem('claude-search-position');
  const savedHidden = localStorage.getItem('claude-search-hidden') === 'true';
  
  if (savedPosition) {
    const pos = JSON.parse(savedPosition);
    button.style.left = pos.x + 'px';
    button.style.top = pos.y + 'px';
    button.style.right = 'auto';
  }
  
  if (savedHidden) {
    button.classList.add('hidden');
  }
  
  // 拖拽功能變量
  let isDragging = false;
  let dragStartX, dragStartY, buttonStartX, buttonStartY;
  let dragStartTime;
  
  // 鼠標按下事件
  button.addEventListener('mousedown', function(e) {
    if (e.button === 2) return; // 右鍵不觸發拖拽
    
    dragStartTime = Date.now();
    isDragging = false;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    
    const rect = button.getBoundingClientRect();
    buttonStartX = rect.left;
    buttonStartY = rect.top;
    
    button.classList.add('dragging');
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    e.preventDefault();
  });
  
  // 鼠標移動事件
  function handleMouseMove(e) {
    const deltaX = e.clientX - dragStartX;
    const deltaY = e.clientY - dragStartY;
    
    // 如果移動距離超過5px，開始拖拽
    if (!isDragging && (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)) {
      isDragging = true;
    }
    
    if (isDragging) {
      const newX = buttonStartX + deltaX;
      const newY = buttonStartY + deltaY;
      
      // 確保按鈕不會超出視窗邊界
      const maxX = window.innerWidth - 60;
      const maxY = window.innerHeight - 60;
      
      const constrainedX = Math.max(0, Math.min(newX, maxX));
      const constrainedY = Math.max(0, Math.min(newY, maxY));
      
      button.style.left = constrainedX + 'px';
      button.style.top = constrainedY + 'px';
      button.style.right = 'auto';
    }
  }
  
  // 鼠標放開事件
  function handleMouseUp(e) {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    
    button.classList.remove('dragging');
    
    // 如果是拖拽，保存位置
    if (isDragging) {
      const rect = button.getBoundingClientRect();
      localStorage.setItem('claude-search-position', JSON.stringify({
        x: rect.left,
        y: rect.top
      }));
    }
    
    // 如果是點擊（不是拖拽且時間短），觸發搜尋功能
    if (!isDragging && Date.now() - dragStartTime < 200) {
      handleSearchAction();
    }
    
    isDragging = false;
  }
  
  // 右鍵菜單事件（隱藏/顯示功能）
  button.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    
    button.classList.toggle('hidden');
    const isHidden = button.classList.contains('hidden');
    localStorage.setItem('claude-search-hidden', isHidden);
    
    button.title = isHidden ? 
      '點擊顯示 | 拖拽移動 | 右鍵切換' : 
      '自定義搜尋功能 | 拖拽移動 | 右鍵隱藏';
  });

  // 將按鈕添加到頁面
  document.body.appendChild(button);
}

// 創建OCR按鈕
function createOCRButton() {
  // 在Claude AI網站上不顯示懸浮按鈕
  if (window.location.hostname === 'claude.ai'|| window.location.hostname === 'gemini.google.com') {
    return;
  }
  
  // 檢查是否已經存在按鈕，避免重複創建
  if (document.getElementById('claude-ocr-btn')) {
    return;
  }

  const button = document.createElement('button');
  button.id = 'claude-ocr-btn';
  button.className = 'claude-ocr-button';
  button.title = '截圖並用 Claude AI 進行OCR文字識別 | 右鍵隱藏/顯示';
  
  // 從localStorage讀取按鈕位置和狀態
  const savedPosition = localStorage.getItem('claude-ocr-position');
  const savedHidden = localStorage.getItem('claude-ocr-hidden') === 'true';
  
  if (savedPosition) {
    const pos = JSON.parse(savedPosition);
    button.style.left = pos.x + 'px';
    button.style.top = pos.y + 'px';
    button.style.right = 'auto';
  }
  
  if (savedHidden) {
    button.classList.add('hidden');
  }
  
  // 拖拽功能變量
  let isDragging = false;
  let dragStartX, dragStartY, buttonStartX, buttonStartY;
  let dragStartTime;
  
  // 鼠標按下事件
  button.addEventListener('mousedown', function(e) {
    if (e.button === 2) return; // 右鍵不觸發拖拽
    
    dragStartTime = Date.now();
    isDragging = false;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    
    const rect = button.getBoundingClientRect();
    buttonStartX = rect.left;
    buttonStartY = rect.top;
    
    button.classList.add('dragging');
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    e.preventDefault();
  });
  
  // 鼠標移動事件
  function handleMouseMove(e) {
    const deltaX = e.clientX - dragStartX;
    const deltaY = e.clientY - dragStartY;
    
    // 如果移動距離超過5px，開始拖拽
    if (!isDragging && (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)) {
      isDragging = true;
    }
    
    if (isDragging) {
      const newX = buttonStartX + deltaX;
      const newY = buttonStartY + deltaY;
      
      // 確保按鈕不會超出視窗邊界
      const maxX = window.innerWidth - 60;
      const maxY = window.innerHeight - 60;
      
      const constrainedX = Math.max(0, Math.min(newX, maxX));
      const constrainedY = Math.max(0, Math.min(newY, maxY));
      
      button.style.left = constrainedX + 'px';
      button.style.top = constrainedY + 'px';
      button.style.right = 'auto';
    }
  }
  
  // 鼠標放開事件
  function handleMouseUp(e) {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    
    button.classList.remove('dragging');
    
    // 如果是拖拽，保存位置
    if (isDragging) {
      const rect = button.getBoundingClientRect();
      localStorage.setItem('claude-ocr-position', JSON.stringify({
        x: rect.left,
        y: rect.top
      }));
    }
    
    // 如果是點擊（不是拖拽且時間短），觸發OCR功能
    if (!isDragging && Date.now() - dragStartTime < 200) {
      handleOCRCapture();
    }
    
    isDragging = false;
  }
  
  // 右鍵菜單事件（隱藏/顯示功能）
  button.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    
    button.classList.toggle('hidden');
    const isHidden = button.classList.contains('hidden');
    localStorage.setItem('claude-ocr-hidden', isHidden);
    
    button.title = isHidden ? 
      '點擊顯示 | 拖拽移動 | 右鍵切換' : 
      '截圖並用 Claude AI 進行OCR文字識別 | 拖拽移動 | 右鍵隱藏';
  });

  // 將按鈕添加到頁面
  document.body.appendChild(button);
}

// OCR截圖處理函數
async function handleOCRCapture() {
  const button = document.getElementById('claude-ocr-btn');
  
  // 顯示載入狀態
  button.classList.add('capturing');
  
  try {
    // 使用Chrome API截圖
    const success = await captureTabScreenshot();
    
    if (success) {
      console.log('截圖成功，準備開啟Claude AI');
      
      // 設置本地標記
      localStorage.setItem('claude-ocr-task', 'true');
      console.log('本地OCR任務標記已設置');
      
      // 獲取AI URL
      const aiUrl = await generateAIUrl('ocr', '');
      
      // 對於Gemini，OCR提示會自動輸入，無需額外提示
      if (getCurrentAIEngine() === 'gemini') {
        console.log('Gemini OCR: 圖片已複製，提示將自動輸入');
      }
      
      // 計算右側位置
      const rightPosition = window.screen.width - 800 - 100; // 螢幕寬度 - 視窗寬度 - 邊距
      const topPosition = window.screenY + 50; // 當前視窗頂部 + 小邊距
      
      window.open(aiUrl, '_blank', `width=800,height=1200,left=${rightPosition},top=${topPosition},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`);
      
      console.log('OCR任務已啟動，URL參數已設置');
      
    } else {
      alert('截圖失敗，請檢查權限設定');
    }
  } catch (error) {
    console.error('OCR處理失敗:', error);
    alert('OCR功能出現錯誤，請重試');
  } finally {
    // 移除載入狀態
    setTimeout(() => {
      button.classList.remove('capturing');
    }, 2000);
  }
}

// 截圖函數
async function captureTabScreenshot() {
  return new Promise((resolve) => {
    // 發送消息給background script要求截圖
    chrome.runtime.sendMessage({action: 'captureTab'}, async (response) => {
      if (response && response.success) {
        try {
          // 將base64圖片複製到剪貼簿
          const success = await copyImageToClipboard(response.dataUrl);
          resolve(success);
        } catch (error) {
          console.error('複製圖片失敗:', error);
          resolve(false);
        }
      } else {
        console.error('截圖失敗:', response?.error);
        resolve(false);
      }
    });
  });
}

// 將base64圖片複製到剪貼簿
async function copyImageToClipboard(dataUrl) {
  try {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    
    await navigator.clipboard.write([
      new ClipboardItem({
        'image/png': blob
      })
    ]);
    
    console.log('截圖已複製到剪貼簿');
    return true;
  } catch (error) {
    console.error('複製圖片到剪貼簿失敗:', error);
    return false;
  }
}

// 手動框選OCR功能
async function handleSelectAreaOCR() {
  console.log('開始手動框選OCR');
  
  return new Promise((resolve, reject) => {
    // 創建選擇覆蓋層
    const overlay = createSelectionOverlay();
    document.body.appendChild(overlay);
    
    let isSelecting = false;
    let startX, startY, endX, endY;
    let selectionBox = null;
    
    // 鼠標按下事件
    overlay.addEventListener('mousedown', (e) => {
      isSelecting = true;
      startX = e.clientX;
      startY = e.clientY;
      
      // 創建選擇框
      selectionBox = document.createElement('div');
      selectionBox.className = 'claude-selection-box';
      selectionBox.style.cssText = `
        position: fixed;
        border: 2px dashed #f59e0b;
        background: rgba(245, 158, 11, 0.1);
        z-index: 10002;
        pointer-events: none;
        left: ${startX}px;
        top: ${startY}px;
        width: 0px;
        height: 0px;
      `;
      document.body.appendChild(selectionBox);
      
      e.preventDefault();
    });
    
    // 鼠標移動事件
    overlay.addEventListener('mousemove', (e) => {
      if (!isSelecting || !selectionBox) return;
      
      endX = e.clientX;
      endY = e.clientY;
      
      const left = Math.min(startX, endX);
      const top = Math.min(startY, endY);
      const width = Math.abs(endX - startX);
      const height = Math.abs(endY - startY);
      
      selectionBox.style.left = left + 'px';
      selectionBox.style.top = top + 'px';
      selectionBox.style.width = width + 'px';
      selectionBox.style.height = height + 'px';
    });
    
    // 鼠標放開事件
    overlay.addEventListener('mouseup', async (e) => {
      if (!isSelecting) return;
      
      isSelecting = false;
      endX = e.clientX;
      endY = e.clientY;
      
      // 計算選擇區域
      const left = Math.min(startX, endX);
      const top = Math.min(startY, endY);
      const width = Math.abs(endX - startX);
      const height = Math.abs(endY - startY);
      
      // 清理UI
      document.body.removeChild(overlay);
      if (selectionBox) {
        document.body.removeChild(selectionBox);
      }
      
      // 檢查選擇區域大小
      if (width < 10 || height < 10) {
        console.log('選擇區域太小，取消截圖');
        reject(new Error('選擇區域太小'));
        return;
      }
      
      console.log('選擇區域:', { left, top, width, height });
      
      try {
        console.log('開始處理區域截圖...');
        
        // 使用區域截圖
        const success = await captureSelectedArea(left, top, width, height);
        console.log('區域截圖結果:', success);
        
        if (success) {
          console.log('截圖成功，準備開啟Claude AI');
          
          // 開啟AI網站
          localStorage.setItem('claude-ocr-task', 'true');
          const aiUrl = await generateAIUrl('ocr', '');
          console.log('開啟AI URL:', aiUrl);
          
          // 對於Gemini，OCR提示會自動輸入
          if (getCurrentAIEngine() === 'gemini') {
            console.log('Gemini區域OCR: 圖片已複製，提示將自動輸入');
          }
          
          // 計算右側位置
          const rightPosition = window.screen.width - 800 - 100; // 螢幕寬度 - 視窗寬度 - 邊距
          const topPosition = window.screenY + 50; // 當前視窗頂部 + 小邊距
          
          window.open(aiUrl, '_blank', `width=800,height=1200,left=${rightPosition},top=${topPosition},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`);
          
          resolve();
        } else {
          console.error('區域截圖失敗');
          alert('區域截圖失敗，請重試');
          reject(new Error('區域截圖失敗'));
        }
      } catch (error) {
        console.error('處理區域截圖時發生錯誤:', error);
        alert('處理截圖時發生錯誤: ' + error.message);
        reject(error);
      }
    });
    
    // ESC鍵取消
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        document.body.removeChild(overlay);
        if (selectionBox) {
          document.body.removeChild(selectionBox);
        }
        document.removeEventListener('keydown', handleKeyDown);
        reject(new Error('用戶取消選擇'));
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
  });
}

// 創建選擇覆蓋層
function createSelectionOverlay() {
  const overlay = document.createElement('div');
  overlay.className = 'claude-selection-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.3);
    z-index: 10001;
    cursor: crosshair;
  `;
  
  // 添加提示文字
  const hint = document.createElement('div');
  hint.style.cssText = `
    position: absolute;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 10px 20px;
    border-radius: 8px;
    font-size: 14px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    pointer-events: none;
  `;
  hint.textContent = '拖拽選擇要OCR的區域，按ESC取消';
  overlay.appendChild(hint);
  
  return overlay;
}

// 區域截圖功能
async function captureSelectedArea(left, top, width, height) {
  return new Promise((resolve) => {
    console.log('請求區域截圖:', { left, top, width, height });
    
    // 發送消息給background script要求全頁截圖
    chrome.runtime.sendMessage({
      action: 'captureArea',
      area: { left, top, width, height }
    }, async (response) => {
      if (response && response.success) {
        try {
          console.log('收到全頁截圖，開始裁切區域');
          
          // 在content script中裁切圖片
          const croppedDataUrl = await cropImageInContent(response.dataUrl, response.area);
          
          if (croppedDataUrl) {
            // 將裁切後的圖片複製到剪貼簿
            const success = await copyImageToClipboard(croppedDataUrl);
            console.log('區域截圖處理完成:', success);
            resolve(success);
          } else {
            console.error('圖片裁切失敗');
            resolve(false);
          }
        } catch (error) {
          console.error('處理區域截圖失敗:', error);
          resolve(false);
        }
      } else {
        console.error('區域截圖失敗:', response?.error);
        resolve(false);
      }
    });
  });
}

// 在content script中裁切圖片
function cropImageInContent(dataUrl, area) {
  return new Promise((resolve, reject) => {
    console.log('開始在content script中裁切圖片，區域:', area);
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // 設置畫布大小為選擇區域大小
    canvas.width = area.width;
    canvas.height = area.height;
    
    const img = new Image();
    img.onload = function() {
      console.log('圖片載入成功，原始尺寸:', img.width, 'x', img.height);
      console.log('裁切區域:', area);
      
      try {
        // 裁切並繪製圖片
        ctx.drawImage(
          img,
          area.left, area.top, area.width, area.height, // 源區域
          0, 0, area.width, area.height // 目標區域
        );
        
        // 轉換為dataURL
        const croppedDataUrl = canvas.toDataURL('image/png');
        console.log('裁切完成，新圖片大小:', area.width, 'x', area.height);
        resolve(croppedDataUrl);
      } catch (error) {
        console.error('裁切過程出錯:', error);
        reject(error);
      }
    };
    
    img.onerror = function() {
      console.error('圖片載入失敗');
      reject(new Error('圖片載入失敗'));
    };
    
    img.src = dataUrl;
  });
}

// 切換所有懸浮按鈕的顯示/隱藏狀態
function toggleAllFloatingButtons() {
  const buttons = [
    document.getElementById('claude-summary-btn'),
    document.getElementById('claude-translate-btn'),
    document.getElementById('claude-search-btn'),
    document.getElementById('claude-ocr-btn')
  ];
  
  // 檢查目前狀態，如果有任何一個按鈕是隱藏的，就全部顯示；否則全部隱藏
  const anyHidden = buttons.some(btn => btn && btn.classList.contains('hidden'));
  
  buttons.forEach(btn => {
    if (btn) {
      if (anyHidden) {
        // 顯示按鈕
        btn.classList.remove('hidden');
        // 更新各按鈕的localStorage狀態
        if (btn.id === 'claude-summary-btn') {
          localStorage.setItem('claude-button-hidden', 'false');
          btn.title = '用 Claude AI 總結此頁面 | 拖拽移動 | 右鍵隱藏';
        } else if (btn.id === 'claude-translate-btn') {
          localStorage.setItem('claude-translate-hidden', 'false');
          btn.title = '用 Claude AI 翻譯此頁面為中文 | 拖拽移動 | 右鍵隱藏';
        } else if (btn.id === 'claude-search-btn') {
          localStorage.setItem('claude-search-hidden', 'false');
          btn.title = '自定義搜尋功能 | 拖拽移動 | 右鍵隱藏';
        } else if (btn.id === 'claude-ocr-btn') {
          localStorage.setItem('claude-ocr-hidden', 'false');
          btn.title = '截圖並用 Claude AI 進行OCR文字識別 | 拖拽移動 | 右鍵隱藏';
        }
      } else {
        // 隱藏按鈕
        btn.classList.add('hidden');
        // 更新各按鈕的localStorage狀態
        if (btn.id === 'claude-summary-btn') {
          localStorage.setItem('claude-button-hidden', 'true');
          btn.title = '點擊顯示 | 拖拽移動 | 右鍵切換';
        } else if (btn.id === 'claude-translate-btn') {
          localStorage.setItem('claude-translate-hidden', 'true');
          btn.title = '點擊顯示 | 拖拽移動 | 右鍵切換';
        } else if (btn.id === 'claude-search-btn') {
          localStorage.setItem('claude-search-hidden', 'true');
          btn.title = '點擊顯示 | 拖拽移動 | 右鍵切換';
        } else if (btn.id === 'claude-ocr-btn') {
          localStorage.setItem('claude-ocr-hidden', 'true');
          btn.title = '點擊顯示 | 拖拽移動 | 右鍵切換';
        }
      }
    }
  });
  
  return !anyHidden; // 返回操作後是否為隱藏狀態
}

// 獲取懸浮按鈕的顯示狀態
function getFloatingButtonsState() {
  const buttons = [
    document.getElementById('claude-summary-btn'),
    document.getElementById('claude-translate-btn'),
    document.getElementById('claude-search-btn'),
    document.getElementById('claude-ocr-btn')
  ];
  
  // 如果所有按鈕都隱藏，返回true；否則返回false
  return buttons.every(btn => btn && btn.classList.contains('hidden'));
}

// 等待頁面載入完成後創建按鈕
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    createSummaryButton();
    createTranslateButton();
    createSearchButton();
    createOCRButton();
  });
} else {
  createSummaryButton();
  createTranslateButton();
  createSearchButton();
  createOCRButton();
}

// 監聽頁面變化（適用於單頁應用）
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    // 頁面URL改變時，確保按鈕存在
    setTimeout(() => {
      createSummaryButton();
      createTranslateButton();
      createSearchButton();
      createOCRButton();
    }, 1000);
  }
}).observe(document, { subtree: true, childList: true });

// 監聽來自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'performOCR') {
    const ocrType = request.type || 'fullPage';
    console.log('收到OCR請求，類型:', ocrType);
    
    if (ocrType === 'selectArea') {
      handleSelectAreaOCR().then(() => {
        sendResponse({success: true});
      }).catch((error) => {
        console.error('手動框選OCR失敗:', error);
        sendResponse({success: false, error: error.message});
      });
    } else {
      handleOCRCapture().then(() => {
        sendResponse({success: true});
      }).catch((error) => {
        console.error('整頁OCR執行失敗:', error);
        sendResponse({success: false, error: error.message});
      });
    }
    return true; // 保持消息通道開放
  }
  
  // 處理顯示/隱藏懸浮視窗請求
  if (request.action === 'toggleFloatingButtons') {
    const allHidden = toggleAllFloatingButtons();
    sendResponse({success: true, hidden: allHidden});
    return true;
  }
  
  // 獲取懸浮視窗狀態
  if (request.action === 'getFloatingButtonsState') {
    const hidden = getFloatingButtonsState();
    sendResponse({success: true, hidden: hidden});
    return true;
  }
});