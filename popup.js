// popup.js - 處理彈出式選單的邏輯

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

document.addEventListener('DOMContentLoaded', function() {
  const summaryBtn = document.getElementById('summaryBtn');
  const translateBtn = document.getElementById('translateBtn');
  const searchBtn = document.getElementById('searchBtn');
  const ocrBtn = document.getElementById('ocrBtn');
  const ocrSubmenu = document.getElementById('ocrSubmenu');
  const ocrFullPageBtn = document.getElementById('ocrFullPageBtn');
  const ocrSelectAreaBtn = document.getElementById('ocrSelectAreaBtn');
  const toggleFloatingBtn = document.getElementById('toggleFloatingBtn');
  const toggleFloatingText = document.getElementById('toggleFloatingText');
  const aiEngineSelect = document.getElementById('aiEngineSelect');
  
  // 初始化AI引擎選擇
  initializeAIEngineSelector();
  
  // AI引擎選擇變更事件
  aiEngineSelect.addEventListener('change', function() {
    const selectedEngine = aiEngineSelect.value;
    localStorage.setItem('ai-engine', selectedEngine);
    console.log('AI引擎已切換至:', AI_ENGINES[selectedEngine].name);
  });
  
  // 總結按鈕點擊事件
  summaryBtn.addEventListener('click', async function() {
    chrome.tabs.query({active: true, currentWindow: true}, async function(tabs) {
      const currentUrl = tabs[0].url;
      const prompt = '我希望你扮演一個摘要助手。我將向你提供文章、報告、會議記錄、學術論文或其他長篇文本內容，你需要提取關鍵資訊並產生簡潔明了的摘要。請確保摘要文章原文的核心觀點、重要數據、主要結論和關鍵細節，同時保持邏輯清晰和結構合理。摘要應探究中性，不添加個人觀點或解釋。請根據內容的複雜程度和重要性調整摘要的長度，通常會控制在原文的10-30%。如果是技術性或專業性的內容，請保留必要的專業術語。';
      const aiUrl = await generateAIUrl('summary', prompt, currentUrl);
      
      // 獲取當前視窗資訊並計算右側位置
      chrome.windows.getCurrent(function(currentWindow) {
        const newLeft = currentWindow.left + currentWindow.width;
        const newTop = currentWindow.top;
        
        // 開啟小視窗在右側
        chrome.windows.create({
          url: aiUrl,
          type: 'popup',
          width: 800,
          height: 1200,
          left: newLeft,
          top: newTop
        });
      });
      
      // 關閉彈出視窗
      window.close();
    });
  });
  
  // 自定義搜尋按鈕點擊事件
  searchBtn.addEventListener('click', async function() {
    const keyword = prompt('請輸入搜尋關鍵字：');
    if (keyword && keyword.trim()) {
      chrome.tabs.query({active: true, currentWindow: true}, async function(tabs) {
        const searchPrompt = `請收集「${keyword.trim()}」的最新相關資訊，並遵守以下指引：只根據你實際使用搜尋工具檢索到的公開數據回答，不得依賴內建知識或推測內容。所有重要數據與事實，務必標明明確資料來源（如新聞、官方公告、專業網站），並於每點附上來源說明。若某項資訊未於檢索工具或外部資料中獲得，請明確回覆「查無此資料」或「資訊不足」，嚴禁自行假設或補足內容。`;
        const aiUrl = await generateAIUrl('search', searchPrompt);
        
        // 獲取當前視窗資訊並計算右側位置
        chrome.windows.getCurrent(function(currentWindow) {
          const newLeft = currentWindow.left + currentWindow.width;
          const newTop = currentWindow.top;
          
          // 開啟小視窗在右側
          chrome.windows.create({
            url: aiUrl,
            type: 'popup',
            width: 800,
            height: 1200,
            left: newLeft,
            top: newTop
          });
        });
        
        // 關閉彈出視窗
        window.close();
      });
    }
  });

  // 翻譯按鈕點擊事件
  translateBtn.addEventListener('click', async function() {
    chrome.tabs.query({active: true, currentWindow: true}, async function(tabs) {
      const currentUrl = tabs[0].url;
      const prompt = '我希望您選擇一個專業的翻譯助理。我將向您提供需要翻譯的文字內容或網頁，請您提供準確、流暢且符合目標語言表達習慣的翻譯。請保持原文的語調、風格和內涵，確保翻譯的專業性和準確性。對於專業術語、慣用語或文化特定的表達，請選擇最適合的對應翻譯。如果遇到模糊或有多種理解的情況，請提供最合理的內容翻譯版本。請只提供翻譯結果，無需額外的解釋或說明。';
      const aiUrl = await generateAIUrl('translate', prompt, currentUrl);
      
      // 獲取當前視窗資訊並計算右側位置
      chrome.windows.getCurrent(function(currentWindow) {
        const newLeft = currentWindow.left + currentWindow.width;
        const newTop = currentWindow.top;
        
        // 開啟小視窗在右側
        chrome.windows.create({
          url: aiUrl,
          type: 'popup',
          width: 800,
          height: 1200,
          left: newLeft,
          top: newTop
        });
      });
      
      // 關閉彈出視窗
      window.close();
    });
  });
  
  // OCR按鈕點擊事件 - 顯示子選單
  ocrBtn.addEventListener('click', function() {
    if (ocrSubmenu.style.display === 'none') {
      ocrSubmenu.style.display = 'block';
      ocrBtn.querySelector('.btn-arrow').textContent = '↓';
    } else {
      ocrSubmenu.style.display = 'none';
      ocrBtn.querySelector('.btn-arrow').textContent = '→';
    }
  });
  
  // OCR整個畫面按鈕
  ocrFullPageBtn.addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'performOCR',
        type: 'fullPage'
      }, function(response) {
        window.close();
      });
    });
  });
  
  // OCR手動框選按鈕
  ocrSelectAreaBtn.addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'performOCR',
        type: 'selectArea'
      }, function(response) {
        window.close();
      });
    });
  });
  
  // 初始化懸浮視窗顯示狀態
  updateToggleButtonText();
  
  // 顯示/隱藏懸浮視窗按鈕事件
  toggleFloatingBtn.addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'toggleFloatingButtons'
      }, function(response) {
        // 更新按鈕文字
        updateToggleButtonText();
        window.close();
      });
    });
  });
  
  // 更新切換按鈕的文字
  function updateToggleButtonText() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'getFloatingButtonsState'
      }, function(response) {
        if (response && response.hidden) {
          toggleFloatingText.textContent = '顯示 懸浮視窗';
        } else {
          toggleFloatingText.textContent = '隱藏 懸浮視窗';
        }
      });
    });
  }
  
  // 初始化AI引擎選擇器
  function initializeAIEngineSelector() {
    const savedEngine = localStorage.getItem('ai-engine') || 'claude';
    aiEngineSelect.value = savedEngine;
    console.log('當前AI引擎:', AI_ENGINES[savedEngine].name);
  }
  
  // 獲取當前選擇的AI引擎
  function getCurrentAIEngine() {
    return aiEngineSelect.value || 'claude';
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
          fullPrompt += `：${currentUrl}`;
        }
        return `${engineConfig.baseUrl}?q=${encodeURIComponent(fullPrompt)}`;
      }
    } else {
      // Google Gemini - 使用localStorage儲存prompt，然後開啟網站
      let fullPrompt = prompt;
      let alertMessage = 'Prompt將自動輸入到Gemini！';
      
      if (actionType === 'ocr') {
        fullPrompt = '請幫我識別這張圖片中的文字內容，並將其轉換為可編輯的文本格式。請保持原有的排版結構。';
        alertMessage = '圖片已複製到剪貼簿，OCR提示將自動輸入！\n請先在Gemini頁面中上傳圖片。';
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
        
        // 顯示提示訊息
        setTimeout(() => {
          alert(alertMessage);
        }, 300);
        
      } catch (error) {
        console.error('處理prompt失敗:', error);
        alert('無法處理prompt，請手動複製以下內容：\n\n' + fullPrompt);
      }
      
      return engineConfig.baseUrl;
    }
  }
});