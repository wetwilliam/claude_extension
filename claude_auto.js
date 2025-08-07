// 自動執行Claude指令的腳本
(function() {
  'use strict';
  
  // 檢查是否在Claude AI頁面
  if (window.location.hostname === 'claude.ai') {
    console.log('檢測到Claude AI頁面');
    
    // 檢查是否有OCR任務標記
    const isOCRTask = sessionStorage.getItem('claude-ocr-task') === 'true';
    // 檢查是否有查詢參數
    const hasQuery = window.location.search.includes('q=');
    
    if (isOCRTask) {
      console.log('檢測到OCR任務，準備自動處理');
      handleOCRTask();
    } else if (hasQuery) {
      console.log('檢測到查詢參數，準備自動發送');
      handleQueryTask();
    }
  }
  
  // 處理OCR任務
  async function handleOCRTask() {
    console.log('開始處理OCR任務');
    
    // 清除任務標記
    sessionStorage.removeItem('claude-ocr-task');
    
    try {
      // 等待頁面載入完成
      console.log('等待頁面載入...');
      await waitForPageLoad();
      await sleep(3000); // 額外等待確保頁面完全準備好
      
      // 尋找輸入框
      console.log('尋找輸入框...');
      const textArea = await waitForElement('textarea, [contenteditable="true"], div[data-testid="chat-input"]', 15000);
      if (!textArea) {
        console.error('找不到輸入框');
        alert('找不到Claude AI輸入框，請手動操作');
        return;
      }
      
      console.log('找到輸入框:', textArea);
      
      // 先輸入文字
      const ocrPrompt = "請將圖片中的文字提取出來並保留其原本的格式";
      console.log('輸入OCR提示文字...');
      
      // 聚焦輸入框
      textArea.focus();
      textArea.click();
      await sleep(500);
      
      // 清空現有內容
      if (textArea.contentEditable === 'true') {
        textArea.innerHTML = '';
        textArea.textContent = '';
      } else {
        textArea.value = '';
      }
      
      // 輸入文字 - 模擬真實打字
      for (let i = 0; i < ocrPrompt.length; i++) {
        const char = ocrPrompt[i];
        
        if (textArea.contentEditable === 'true') {
          textArea.textContent += char;
          textArea.innerHTML = textArea.textContent;
        } else {
          textArea.value += char;
        }
        
        // 觸發事件
        textArea.dispatchEvent(new Event('input', { bubbles: true }));
        textArea.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: char }));
        textArea.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: char }));
        
        await sleep(50); // 模擬打字速度
      }
      
      console.log('文字輸入完成');
      
      // 等待一下然後嘗試貼上圖片
      await sleep(1000);
      
      console.log('準備貼上圖片...');
      
      // 模擬Ctrl+V - 使用多種方法
      const pasteViaKeyboard = () => {
        const event = new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          key: 'v',
          code: 'KeyV',
          keyCode: 86,
          which: 86,
          ctrlKey: true,
          metaKey: false
        });
        textArea.dispatchEvent(event);
        
        const upEvent = new KeyboardEvent('keyup', {
          bubbles: true,
          cancelable: true,
          key: 'v',
          code: 'KeyV',
          keyCode: 86,
          which: 86,
          ctrlKey: true,
          metaKey: false
        });
        textArea.dispatchEvent(upEvent);
      };
      
      const pasteViaClipboard = () => {
        const pasteEvent = new ClipboardEvent('paste', {
          bubbles: true,
          cancelable: true
        });
        textArea.dispatchEvent(pasteEvent);
        document.dispatchEvent(pasteEvent);
      };
      
      // 嘗試多種貼上方法
      pasteViaKeyboard();
      await sleep(500);
      pasteViaClipboard();
      
      console.log('已嘗試貼上圖片');
      
      // 等待圖片上傳
      await sleep(3000);
      
      // 自動發送
      console.log('準備自動發送...');
      await tryAutoSend();
      
    } catch (error) {
      console.error('OCR自動處理失敗:', error);
      alert('OCR自動處理失敗: ' + error.message);
    }
  }
  
  // 處理查詢任務
  async function handleQueryTask() {
    await tryAutoSend();
  }
  
  // 等待頁面載入
  function waitForPageLoad() {
    return new Promise((resolve) => {
      if (document.readyState === 'complete') {
        resolve();
      } else {
        window.addEventListener('load', resolve);
      }
    });
  }
  
  // 等待元素出現
  function waitForElement(selector, timeout = 10000) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      function check() {
        const element = document.querySelector(selector);
        if (element) {
          resolve(element);
        } else if (Date.now() - startTime > timeout) {
          resolve(null);
        } else {
          setTimeout(check, 100);
        }
      }
      
      check();
    });
  }
  
  // 延遲函數
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // 尋找並點擊發送按鈕
  function findAndClickSendButton() {
    console.log('開始尋找發送按鈕...');
    
    // 策略1: 根據實際HTML結構尋找發送按鈕
    let sendButton = document.querySelector('button[aria-label="Send message"]');
    if (sendButton && !sendButton.disabled) {
      console.log('找到發送按鈕 (aria-label):', sendButton);
      sendButton.click();
      console.log('策略1成功: 通過aria-label找到發送按鈕');
      return true;
    }
    
    // 策略2: 尋找包含特定SVG路徑的按鈕（向上箭頭）
    const buttons = document.querySelectorAll('button');
    console.log('找到', buttons.length, '個按鈕');
    
    for (let btn of buttons) {
      const svg = btn.querySelector('svg');
      if (svg) {
        const path = svg.querySelector('path[d*="208.49,120.49"]') || 
                    svg.querySelector('path[d*="L140,69V216"]') ||
                    svg.querySelector('path[d*="120.49"]');
        if (path && !btn.disabled) {
          console.log('找到SVG發送按鈕:', btn);
          btn.click();
          console.log('策略2成功: 通過SVG路徑找到發送按鈕');
          return true;
        }
      }
    }
    
    // 策略3: 尋找具有特定class組合的按鈕
    sendButton = document.querySelector('button.bg-accent-main-000, button[class*="bg-accent-main"]');
    if (sendButton && !sendButton.disabled) {
      console.log('找到CSS class發送按鈕:', sendButton);
      sendButton.click();
      console.log('策略3成功: 通過CSS class找到發送按鈕');
      return true;
    }
    
    // 策略4: 尋找8x8尺寸的圓角按鈕
    for (let btn of buttons) {
      if (btn.classList.contains('h-8') && btn.classList.contains('w-8') && 
          btn.classList.contains('rounded-md') && btn.querySelector('svg')) {
        if (!btn.disabled) {
          console.log('找到尺寸匹配的發送按鈕:', btn);
          btn.click();
          console.log('策略4成功: 通過尺寸和樣式找到發送按鈕');
          return true;
        }
      }
    }
    
    // 策略5: 尋找任何有SVG的未disabled按鈕（最後手段）
    for (let btn of buttons) {
      if (btn.querySelector('svg') && !btn.disabled && btn.offsetParent !== null) {
        console.log('嘗試點擊SVG按鈕:', btn);
        btn.click();
        console.log('策略5: 點擊了SVG按鈕');
        return true;
      }
    }
    
    console.log('所有策略都失敗了');
    return false;
  }
  
  // 嘗試自動發送
  async function tryAutoSend() {
    let attempts = 0;
    const maxAttempts = 20;
    
    function tryClickSend() {
      attempts++;
      console.log(`嘗試發送 ${attempts}/${maxAttempts}`);
      
      if (findAndClickSendButton()) {
        console.log('自動發送成功!');
        return;
      }
      
      if (attempts < maxAttempts) {
        setTimeout(tryClickSend, 500);
      } else {
        console.log('無法找到發送按鈕，請手動點擊');
      }
    }
    
    // 等待2秒後開始嘗試
    setTimeout(tryClickSend, 2000);
  }
  
})();