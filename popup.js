// popup.js - 處理彈出式選單的邏輯

document.addEventListener('DOMContentLoaded', function() {
  const summaryBtn = document.getElementById('summaryBtn');
  const translateBtn = document.getElementById('translateBtn');
  const searchBtn = document.getElementById('searchBtn');
  const ocrBtn = document.getElementById('ocrBtn');
  const ocrSubmenu = document.getElementById('ocrSubmenu');
  const ocrFullPageBtn = document.getElementById('ocrFullPageBtn');
  const ocrSelectAreaBtn = document.getElementById('ocrSelectAreaBtn');
  
  // 總結按鈕點擊事件
  summaryBtn.addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      const currentUrl = tabs[0].url;
      const claudeUrl = `https://claude.ai/new?q=請濃縮以下網頁重點在500字內並適當分點：${currentUrl}`;
      
      // 獲取當前視窗資訊並計算右側位置
      chrome.windows.getCurrent(function(currentWindow) {
        const newLeft = currentWindow.left + currentWindow.width;
        const newTop = currentWindow.top;
        
        // 開啟小視窗在右側
        chrome.windows.create({
          url: claudeUrl,
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
  searchBtn.addEventListener('click', function() {
    const keyword = prompt('請輸入搜尋關鍵字：');
    if (keyword && keyword.trim()) {
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        const searchPrompt = `請收集「${keyword.trim()}」的最新相關資訊，並遵守以下指引：只根據你實際使用搜尋工具檢索到的公開數據回答，不得依賴內建知識或推測內容。所有重要數據與事實，務必標明明確資料來源（如新聞、官方公告、專業網站），並於每點附上來源說明。若某項資訊未於檢索工具或外部資料中獲得，請明確回覆「查無此資料」或「資訊不足」，嚴禁自行假設或補足內容。`;
        const claudeUrl = `https://claude.ai/new?q=${encodeURIComponent(searchPrompt)}`;
        
        // 獲取當前視窗資訊並計算右側位置
        chrome.windows.getCurrent(function(currentWindow) {
          const newLeft = currentWindow.left + currentWindow.width;
          const newTop = currentWindow.top;
          
          // 開啟小視窗在右側
          chrome.windows.create({
            url: claudeUrl,
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
  translateBtn.addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      const currentUrl = tabs[0].url;
      const claudeUrl = `https://claude.ai/new?q=請為我將網頁內容翻譯為中文：${currentUrl}`;
      
      // 獲取當前視窗資訊並計算右側位置
      chrome.windows.getCurrent(function(currentWindow) {
        const newLeft = currentWindow.left + currentWindow.width;
        const newTop = currentWindow.top;
        
        // 開啟小視窗在右側
        chrome.windows.create({
          url: claudeUrl,
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
});