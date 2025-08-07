// Claude AI 自動處理腳本 - 統一處理所有類型的自動發送
(function() {
  'use strict';
  
  console.log('Claude AI 自動處理腳本已載入');
  
  // 檢查是否在Claude AI頁面
  if (window.location.hostname !== 'claude.ai') {
    console.log('不在Claude AI頁面，跳過自動處理');
    return;
  }
  
  console.log('檢測到Claude AI頁面，準備分析自動處理需求');
  
  // 等待頁面載入完成後執行檢查
  setTimeout(() => {
    checkAndExecuteAutoActions();
  }, 1000);
  
  function checkAndExecuteAutoActions() {
    console.log('=== 開始檢查自動處理需求 ===');
    
    // 檢查OCR任務標記
    const sessionOCR = sessionStorage.getItem('claude-ocr-task') === 'true';
    const localOCR = localStorage.getItem('claude-ocr-task') === 'true';
    const urlOCR = window.location.search.includes('ocr=true');
    
    // 檢查URL查詢參數（總結和翻譯功能）
    const urlParams = new URLSearchParams(window.location.search);
    const hasQuery = urlParams.has('q');
    const queryContent = urlParams.get('q');
    
    console.log('任務檢查結果:');
    console.log('- SessionStorage OCR:', sessionOCR);
    console.log('- LocalStorage OCR:', localOCR);
    console.log('- URL OCR參數:', urlOCR);
    console.log('- URL查詢參數:', hasQuery);
    console.log('- 查詢內容:', queryContent);
    
    const isOCRTask = sessionOCR || localOCR || urlOCR;
    
    if (isOCRTask) {
      console.log('🖼️ 檢測到OCR任務，執行OCR自動化');
      handleOCRTask();
    } else if (hasQuery && queryContent) {
      console.log('📝 檢測到查詢任務，執行自動發送');
      handleQueryTask(queryContent);
    } else {
      console.log('ℹ️ 沒有檢測到自動處理任務');
    }
  }
  
  // 處理OCR任務
  async function handleOCRTask() {
    console.log('開始處理OCR任務');
    
    // 清除任務標記
    sessionStorage.removeItem('claude-ocr-task');
    localStorage.removeItem('claude-ocr-task');
    
    try {
      // 等待頁面完全載入
      await waitForPageReady();
      
      // 尋找輸入框
      const inputElement = await findInputElement();
      if (!inputElement) {
        console.error('找不到輸入框');
        return;
      }
      
      // 聚焦輸入框
      focusInput(inputElement);
      
      // 輸入OCR提示文字
      const ocrPrompt = "請將圖片中的文字提取出來並保留其原本的格式";
      await inputText(inputElement, ocrPrompt);
      
      // 嘗試貼上圖片
      await attemptPasteImage(inputElement);
      
      // 等待然後自動發送
      setTimeout(() => {
        autoClickSendButton();
      }, 2000);
      
    } catch (error) {
      console.error('OCR任務處理失敗:', error);
    }
  }
  
  // 處理查詢任務（總結、翻譯等）
  async function handleQueryTask(queryContent) {
    console.log('開始處理查詢任務:', queryContent);
    
    try {
      // 等待頁面完全載入
      await waitForPageReady();
      
      // 檢查輸入框是否已經有內容
      const inputElement = await findInputElement();
      if (!inputElement) {
        console.error('找不到輸入框');
        return;
      }
      
      const currentContent = inputElement.textContent || inputElement.value || '';
      console.log('輸入框當前內容:', currentContent);
      
      // 如果輸入框已經有查詢內容，直接自動發送
      if (currentContent.includes('請濃縮以下網頁重點') || 
          currentContent.includes('請為我將網頁內容翻譯') ||
          currentContent.trim().length > 10) {
        console.log('檢測到輸入框已有內容，準備自動發送');
        
        setTimeout(() => {
          autoClickSendButton();
        }, 1500);
      } else {
        console.log('輸入框內容不足，等待手動輸入或頁面更新');
        // 設置監聽器，當內容出現時自動發送
        setupAutoSendOnContent(inputElement);
      }
      
    } catch (error) {
      console.error('查詢任務處理失敗:', error);
    }
  }
  
  // 設置內容監聽器，當檢測到內容時自動發送
  function setupAutoSendOnContent(inputElement) {
    console.log('設置自動發送監聽器');
    
    let checkCount = 0;
    const maxChecks = 30; // 最多檢查30次（15秒）
    
    const contentChecker = setInterval(() => {
      checkCount++;
      const content = inputElement.textContent || inputElement.value || '';
      
      console.log(`內容檢查 ${checkCount}/${maxChecks}: "${content.substring(0, 50)}..."`);
      
      if (content.includes('請濃縮以下網頁重點') || 
          content.includes('請為我將網頁內容翻譯') ||
          content.trim().length > 20) {
        console.log('✅ 檢測到查詢內容，觸發自動發送');
        clearInterval(contentChecker);
        
        setTimeout(() => {
          autoClickSendButton();
        }, 1000);
        
      } else if (checkCount >= maxChecks) {
        console.log('⏰ 內容檢查超時，停止監聽');
        clearInterval(contentChecker);
      }
    }, 500);
  }
  
  // 等待頁面準備就緒
  function waitForPageReady() {
    return new Promise((resolve) => {
      if (document.readyState === 'complete') {
        resolve();
      } else {
        window.addEventListener('load', resolve);
      }
    });
  }
  
  // 尋找輸入元素
  async function findInputElement() {
    const selectors = [
      'div[contenteditable="true"]',
      'textarea',
      '[role="textbox"]',
      'div[data-testid="chat-input"]'
    ];
    
    for (let attempt = 0; attempt < 20; attempt++) {
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
          if (element.offsetParent !== null) {
            console.log('找到輸入元素:', selector);
            return element;
          }
        }
      }
      
      await sleep(200);
    }
    
    return null;
  }
  
  // 聚焦輸入框
  function focusInput(element) {
    element.focus();
    element.click();
  }
  
  // 輸入文字
  async function inputText(element, text) {
    // 清空現有內容
    if (element.contentEditable === 'true') {
      element.innerHTML = '';
      element.textContent = '';
    } else {
      element.value = '';
    }
    
    // 輸入新文字
    if (element.contentEditable === 'true') {
      element.textContent = text;
      element.innerHTML = text;
    } else {
      element.value = text;
    }
    
    // 觸發輸入事件
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }
  
  // 嘗試貼上圖片
  async function attemptPasteImage(element) {
    console.log('嘗試貼上圖片...');
    
    // 模擬Ctrl+V
    const pasteEvent = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'v',
      ctrlKey: true
    });
    
    element.dispatchEvent(pasteEvent);
    
    // 也嘗試直接觸發paste事件
    const clipboardEvent = new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true
    });
    
    element.dispatchEvent(clipboardEvent);
  }
  
  // 自動點擊發送按鈕 - 使用改進的查找邏輯
  function autoClickSendButton() {
    console.log('=== 開始自動點擊發送按鈕 ===');
    
    // 策略1: aria-label
    let sendButton = document.querySelector('button[aria-label="Send message"]');
    if (sendButton && !sendButton.disabled && sendButton.offsetParent !== null) {
      console.log('✅ 找到發送按鈕 (aria-label)');
      sendButton.click();
      return true;
    }
    
    // 策略2: 精確SVG路徑
    const specificPath = 'M208.49,120.49a12,12,0,0,1-17,0L140,69V216a12,12,0,0,1-24,0V69L64.49,120.49a12,12,0,0,1-17-17l72-72a12,12,0,0,1,17,0l72,72A12,12,0,0,1,208.49,120.49Z';
    sendButton = document.querySelector(`button svg path[d="${specificPath}"]`);
    if (sendButton) {
      sendButton = sendButton.closest('button');
      if (sendButton && !sendButton.disabled && sendButton.offsetParent !== null) {
        console.log('✅ 找到發送按鈕 (精確SVG路徑)');
        sendButton.click();
        return true;
      }
    }
    
    // 策略3: 查找所有小按鈕並檢查SVG
    const buttons = document.querySelectorAll('button');
    for (const button of buttons) {
      if (button.disabled || button.offsetParent === null) continue;
      
      const rect = button.getBoundingClientRect();
      const isSmallButton = rect.width >= 28 && rect.width <= 40 && rect.height >= 28 && rect.height <= 40;
      
      if (isSmallButton) {
        const svg = button.querySelector('svg');
        if (svg) {
          const paths = svg.querySelectorAll('path');
          for (const path of paths) {
            const d = path.getAttribute('d');
            if (d && (d.includes('208.49') || d.includes('120.49') || d.includes('L140,69V216'))) {
              console.log('✅ 找到發送按鈕 (SVG模式匹配)');
              button.click();
              return true;
            }
          }
        }
      }
    }
    
    // 策略4: 最後手段 - 點擊任何看起來像發送按鈕的元素
    for (const button of buttons) {
      if (button.disabled || button.offsetParent === null) continue;
      
      const rect = button.getBoundingClientRect();
      const svg = button.querySelector('svg');
      
      if (svg && rect.width <= 40 && rect.height <= 40 && rect.width >= 28 && rect.height >= 28) {
        console.log('⚠️ 嘗試點擊可能的發送按鈕 (最後手段)');
        button.click();
        return true;
      }
    }
    
    console.log('❌ 未能找到發送按鈕');
    return false;
  }
  
  // 延遲函數
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // 全域測試函數
  window.testAutoSend = function() {
    console.log('🧪 手動測試自動發送');
    return autoClickSendButton();
  };
  
  window.diagnoseButtons = function() {
    console.log('🔍 診斷所有按鈕');
    const buttons = document.querySelectorAll('button');
    const buttonInfo = Array.from(buttons).map((btn, index) => {
      const rect = btn.getBoundingClientRect();
      const svg = btn.querySelector('svg');
      let svgPaths = [];
      
      if (svg) {
        const paths = svg.querySelectorAll('path');
        svgPaths = Array.from(paths).map(p => p.getAttribute('d'));
      }
      
      return {
        index,
        text: btn.textContent.trim(),
        ariaLabel: btn.getAttribute('aria-label'),
        classes: btn.className,
        disabled: btn.disabled,
        visible: btn.offsetParent !== null,
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        hasSvg: !!svg,
        svgPaths: svgPaths
      };
    });
    
    console.table(buttonInfo);
    return buttonInfo;
  };
  
  console.log('Claude AI 自動處理腳本載入完成');
  console.log('💡 測試指令: testAutoSend() 或 diagnoseButtons()');
  
})();