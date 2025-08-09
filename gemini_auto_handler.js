// gemini_auto_handler.js - 處理Google Gemini頁面的自動化操作

(function() {
  'use strict';
  
  console.log('🚀 Gemini Auto Handler 開始載入...');
  console.log('📍 當前URL:', window.location.href);
  console.log('📍 頁面載入狀態:', document.readyState);

  // 檢查是否在正確的域名
  if (!window.location.href.includes('gemini.google.com')) {
    console.warn('⚠️ 非Gemini域名，跳過初始化');
    return;
  }

  // 等待頁面完全載入
  function safeInit() {
    try {
      initGeminiHandler();
    } catch (error) {
      console.error('❌ 初始化過程中發生錯誤:', error);
      // 3秒後重試
      setTimeout(() => {
        console.log('🔄 重試初始化...');
        try {
          initGeminiHandler();
        } catch (retryError) {
          console.error('❌ 重試初始化失敗:', retryError);
        }
      }, 3000);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', safeInit);
  } else {
    // 延遲一點時間讓Angular應用完全載入
    setTimeout(safeInit, 1000);
  }

function initGeminiHandler() {
  console.log('🎯 Gemini頁面初始化開始');
  
  try {
    // 檢查是否需要自動輸入prompt
    checkForAutoPrompt();
    
    // 監聽頁面變化，處理SPA路由
    observePageChanges();
    
    console.log('✅ Gemini Handler 初始化成功');
  } catch (error) {
    console.error('❌ Gemini Handler 初始化失敗:', error);
  }
}

// 檢查localStorage中的prompt並自動輸入
async function checkForAutoPrompt() {
  try {
    // 檢查localStorage中是否有自動prompt請求
    const autoPrompt = localStorage.getItem('gemini-auto-prompt');
    const promptTime = localStorage.getItem('gemini-auto-prompt-time');
    const actionType = localStorage.getItem('gemini-auto-prompt-action');
    
    if (autoPrompt && promptTime) {
      const timeDiff = Date.now() - parseInt(promptTime);
      
      // 檢查prompt是否在5分鐘內創建（避免處理過期的prompt）
      if (timeDiff < 5 * 60 * 1000) {
        console.log('檢測到localStorage中的自動prompt:', autoPrompt);
        console.log('動作類型:', actionType);
        
        // 清除localStorage中的prompt（避免重複處理）
        localStorage.removeItem('gemini-auto-prompt');
        localStorage.removeItem('gemini-auto-prompt-time');
        localStorage.removeItem('gemini-auto-prompt-action');
        
        // 等待頁面載入完成
        await waitForGeminiReady();
        
        // 自動輸入prompt
        const inputSuccess = await autoInputPrompt(autoPrompt, actionType);
        
        if (inputSuccess) {
          console.log('✅ 自動輸入成功');
        } else {
          console.log('❌ 自動輸入失敗，請手動輸入以下內容:');
          console.log(autoPrompt);
          
          // 顯示備用提示
          setTimeout(() => {
            alert(`自動輸入失敗，請手動複製以下內容到Gemini輸入框:\n\n${autoPrompt}`);
          }, 1000);
        }
        
      } else {
        console.log('自動prompt已過期，清除localStorage');
        localStorage.removeItem('gemini-auto-prompt');
        localStorage.removeItem('gemini-auto-prompt-time');
        localStorage.removeItem('gemini-auto-prompt-action');
      }
    } else {
      console.log('未找到localStorage中的自動prompt');
    }
  } catch (error) {
    console.error('自動prompt處理失敗:', error);
  }
}

// 等待Gemini頁面準備就緒
function waitForGeminiReady() {
  return new Promise((resolve) => {
    let attempts = 0;
    const maxAttempts = 60; // 最多等待30秒
    
    const checkReady = () => {
      attempts++;
      console.log(`嘗試檢查Gemini準備狀態 (第${attempts}次)`);
      
      // 檢查頁面是否完全載入
      const isPageReady = document.readyState === 'complete';
      console.log('頁面載入狀態:', document.readyState);
      
      // 檢查是否有Angular應用載入完成的跡象
      const hasAngularElements = document.querySelectorAll('[_ngcontent], rich-textarea').length > 0;
      console.log('Angular元素檢測:', hasAngularElements);
      
      // 檢查輸入框是否存在
      const inputBox = findGeminiInputBox();
      
      if (inputBox && isPageReady) {
        console.log('✅ Gemini頁面已準備就緒');
        resolve();
      } else if (attempts < maxAttempts) {
        console.log(`⏳ 等待中... (${attempts}/${maxAttempts})`);
        setTimeout(checkReady, 500);
      } else {
        console.log('⚠️ 等待Gemini準備就緒超時，但繼續嘗試操作');
        resolve();
      }
    };
    
    // 先等待一秒讓頁面穩定
    setTimeout(checkReady, 1000);
  });
}

// 查找Gemini的輸入框
function findGeminiInputBox() {
  console.log('🔍 開始搜索Gemini輸入框...');
  
  // 根據實際HTML結構，使用最直接的方法
  const selectors = [
    // 基於你提供的HTML結構
    'rich-textarea div.ql-editor[contenteditable="true"]',
    'div.ql-editor.textarea.new-input-ui[contenteditable="true"]',
    'div.ql-editor[role="textbox"][contenteditable="true"]',
    'div.ql-editor[aria-label*="提示"][contenteditable="true"]',
    
    // 更廣泛的搜索
    'div.ql-editor[contenteditable="true"]',
    'rich-textarea [contenteditable="true"]',
    '[role="textbox"][contenteditable="true"]',
    'div[contenteditable="true"]'
  ];
  
  for (const selector of selectors) {
    try {
      console.log('嘗試選擇器:', selector);
      const elements = document.querySelectorAll(selector);
      console.log('找到元素數量:', elements.length);
      
      for (const element of elements) {
        console.log('檢查元素:', element, {
          visible: isElementVisible(element),
          disabled: element.disabled,
          readOnly: element.readOnly,
          className: element.className,
          ariaLabel: element.getAttribute('aria-label'),
          dataPlaceholder: element.getAttribute('data-placeholder')
        });
        
        // 檢查元素是否可見且可編輯
        if (isElementVisible(element) && !element.disabled && !element.readOnly) {
          // 檢查是否確實是Gemini的輸入框
          const rect = element.getBoundingClientRect();
          const hasReasonableSize = rect.height > 15 && rect.width > 100;
          
          // 額外驗證：檢查是否包含Gemini相關的特徵
          const ariaLabel = element.getAttribute('aria-label') || '';
          const dataPlaceholder = element.getAttribute('data-placeholder') || '';
          const className = element.className || '';
          const parentClasses = element.parentElement?.className || '';
          
          const isGeminiInput = 
            ariaLabel.includes('提示') || 
            ariaLabel.includes('輸入') || 
            dataPlaceholder.includes('Gemini') ||
            className.includes('ql-editor') ||
            parentClasses.includes('rich-textarea') ||
            selector.includes('rich-textarea');
          
          if (hasReasonableSize && (isGeminiInput || selector.includes('ql-editor'))) {
            console.log('✅ 成功找到Gemini輸入框:', {
              selector,
              element,
              rect,
              ariaLabel,
              dataPlaceholder,
              className
            });
            return element;
          }
        }
      }
    } catch (error) {
      console.warn('選擇器檢查失敗:', selector, error);
    }
  }
  
  console.log('❌ 未找到合適的Gemini輸入框');
  return null;
}

// 查找發送按鈕
function findGeminiSendButton() {
  console.log('開始搜索Gemini發送按鈕...');
  
  const selectors = [
    // 基於Gemini UI結構的精確選擇器
    'button[aria-label*="Send message"]', // 發送消息按鈕
    'button[aria-label*="傳送訊息"]', // 中文發送消息
    'button[data-testid*="send"]', // 測試ID包含send
    'button[title*="Send"]', // title包含Send
    'button[title*="傳送"]', // 中文傳送
    
    // SVG圖標相關
    'button svg[viewBox="0 0 24 24"]', // 常見的24x24 SVG圖標
    'button:has(svg[data-testid*="send"])', // 包含發送SVG的按鈕
    'button:has(svg)', // 包含任何SVG的按鈕
    
    // 位置和類名相關
    'button[class*="send"]', // 類名包含send
    'button[class*="submit"]', // 類名包含submit
    'div[role="button"][aria-label*="Send"]', // div角色為按鈕
    'div[role="button"][aria-label*="傳送"]', // 中文div按鈕
    
    // 通用按鈕（會進一步篩選）
    'button[type="submit"]', // 提交按鈕
    'button' // 所有按鈕（最後備用）
  ];
  
  // 首先嘗試精確匹配
  for (const selector of selectors) {
    try {
      console.log('嘗試發送按鈕選擇器:', selector);
      const elements = document.querySelectorAll(selector);
      console.log('找到按鈕數量:', elements.length);
      
      for (const button of elements) {
        if (button && isElementVisible(button) && !button.disabled) {
          // 檢查按鈕內容和屬性
          const buttonText = button.textContent?.toLowerCase() || '';
          const ariaLabel = button.getAttribute('aria-label')?.toLowerCase() || '';
          const title = button.getAttribute('title')?.toLowerCase() || '';
          const className = button.className || '';
          
          console.log('檢查按鈕:', {
            button,
            buttonText,
            ariaLabel,
            title,
            className,
            hasIcon: !!button.querySelector('svg')
          });
          
          // 檢查是否為發送按鈕
          const isSendButton = 
            buttonText.includes('send') || buttonText.includes('傳送') ||
            ariaLabel.includes('send') || ariaLabel.includes('傳送') || ariaLabel.includes('submit') ||
            title.includes('send') || title.includes('傳送') ||
            className.includes('send') || className.includes('submit');
          
          if (isSendButton) {
            console.log('✅ 找到發送按鈕 (文本匹配):', button);
            return button;
          }
          
          // 如果是包含圖標的小按鈕，可能是發送按鈕
          const rect = button.getBoundingClientRect();
          const hasIcon = !!button.querySelector('svg, mat-icon, i[class*="icon"]');
          const isSmallButton = rect.width < 80 && rect.height < 80 && rect.width > 20 && rect.height > 20;
          
          if (hasIcon && isSmallButton && selector.includes('svg')) {
            console.log('✅ 找到發送按鈕 (圖標特徵):', button);
            return button;
          }
        }
      }
    } catch (error) {
      console.warn('發送按鈕選擇器檢查失敗:', selector, error);
    }
  }
  
  // 嘗試通過位置關係查找發送按鈕
  console.log('嘗試通過位置關係查找發送按鈕...');
  const inputBox = findGeminiInputBox();
  if (inputBox) {
    // 查找輸入框的容器
    const containers = [
      inputBox.closest('div[class*="text-input"]'),
      inputBox.closest('div[class*="input-field"]'),
      inputBox.closest('div[class*="chat"]'),
      inputBox.closest('form'),
      inputBox.parentElement,
      inputBox.parentElement?.parentElement,
      inputBox.parentElement?.parentElement?.parentElement
    ].filter(Boolean);
    
    for (const container of containers) {
      const buttons = container.querySelectorAll('button');
      console.log(`在容器中找到 ${buttons.length} 個按鈕`);
      
      for (const button of buttons) {
        if (isElementVisible(button) && !button.disabled) {
          const buttonRect = button.getBoundingClientRect();
          const inputRect = inputBox.getBoundingClientRect();
          
          // 檢查按鈕是否在輸入框附近（右側或下方）
          const isNearInput = 
            (buttonRect.left >= inputRect.right - 100 && buttonRect.top >= inputRect.top - 50 && buttonRect.bottom <= inputRect.bottom + 50) ||
            (Math.abs(buttonRect.top - inputRect.bottom) < 60 && buttonRect.left >= inputRect.left);
          
          const hasIcon = !!button.querySelector('svg, mat-icon');
          const isSmallButton = buttonRect.width < 100 && buttonRect.height < 100;
          
          if (isNearInput && (hasIcon || isSmallButton)) {
            console.log('✅ 找到位置相關的發送按鈕:', button);
            return button;
          }
        }
      }
    }
  }
  
  console.log('❌ 未找到Gemini發送按鈕');
  return null;
}

// 檢查元素是否可見
function isElementVisible(element) {
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0'
  );
}

// 自動輸入prompt
async function autoInputPrompt(promptText, actionType = 'default') {
  try {
    const inputBox = findGeminiInputBox();
    
    if (!inputBox) {
      console.error('找不到輸入框');
      return false;
    }
    
    console.log('開始自動輸入prompt，動作類型:', actionType);
    console.log('輸入框詳細信息:', {
      tagName: inputBox.tagName,
      className: inputBox.className,
      contentEditable: inputBox.contentEditable,
      innerHTML: inputBox.innerHTML,
      textContent: inputBox.textContent
    });
    
    // 聚焦輸入框
    inputBox.focus();
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // 使用最簡單直接的方法輸入文字
    console.log('🎯 使用直接輸入方法');
    
    try {
      // 1. 聚焦輸入框
      inputBox.focus();
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // 2. 清空現有內容
      if (inputBox.classList.contains('ql-editor')) {
        // Quill編輯器特殊處理
        inputBox.innerHTML = '<p><br></p>';
      } else {
        inputBox.innerHTML = '';
      }
      inputBox.textContent = '';
      
      // 3. 使用最直接的方式設置文本
      inputBox.textContent = promptText;
      inputBox.classList.remove('ql-blank');
      
      console.log('📝 文本已設置:', inputBox.textContent);
      
      // 4. 嘗試使用剪貼簿方式（更可靠）
      try {
        // 先選中所有內容
        const range = document.createRange();
        range.selectNodeContents(inputBox);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        
        // 嘗試直接貼上
        await navigator.clipboard.writeText(promptText);
        document.execCommand('paste');
        
        console.log('📋 剪貼簿貼上完成');
      } catch (clipboardError) {
        console.warn('剪貼簿方法失敗，使用備用方法');
        
        // 備用方法：直接插入文本
        document.execCommand('selectAll');
        document.execCommand('delete');
        document.execCommand('insertText', false, promptText);
      }
      
      // 5. 移除空白樣式並觸發事件
      inputBox.classList.remove('ql-blank');
      
      // 觸發必要的事件
      const events = [
        new Event('input', { bubbles: true }),
        new Event('change', { bubbles: true }),
        new InputEvent('input', { 
          bubbles: true, 
          inputType: 'insertText', 
          data: promptText 
        })
      ];
      
      events.forEach(event => {
        inputBox.dispatchEvent(event);
      });
      
      // 觸發父級組件事件
      const richTextarea = inputBox.closest('rich-textarea');
      if (richTextarea) {
        richTextarea.dispatchEvent(new Event('input', { bubbles: true }));
        
        // 嘗試觸發Angular的ngModel更新
        const ngModel = richTextarea.querySelector('[ng-reflect-model]');
        if (ngModel) {
          ngModel.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
      
      console.log('✅ 輸入完成，最終內容:', inputBox.textContent);
      
    } catch (error) {
      console.error('❌ 直接輸入方法失敗:', error);
      
      // 終極備用方案：顯示提示讓用戶手動操作
      setTimeout(() => {
        alert(`自動輸入失敗，請手動輸入以下內容：\n\n${promptText}`);
      }, 500);
      
      return false;
    } else if (inputBox.contentEditable === 'true') {
      // 普通的contenteditable div
      console.log('普通contenteditable處理方式');
      inputBox.innerHTML = '';
      inputBox.textContent = promptText;
      
      // 觸發input事件
      inputBox.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
      inputBox.dispatchEvent(new Event('change', { bubbles: true }));
    } 
    // 如果是textarea或input
    else {
      console.log('Textarea/input處理方式');
      inputBox.value = promptText;
      
      // 觸發事件
      inputBox.dispatchEvent(new InputEvent('input', { bubbles: true }));
      inputBox.dispatchEvent(new Event('change', { bubbles: true }));
    }
    
    console.log('Prompt輸入完成，當前內容:', {
      innerHTML: inputBox.innerHTML,
      textContent: inputBox.textContent,
      value: inputBox.value
    });
    
    // 等待一下讓頁面反應
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // OCR動作需要用戶先上傳圖片，不自動發送
    if (actionType === 'ocr') {
      console.log('OCR動作，不自動發送，等待用戶上傳圖片');
      
      // 顯示提示
      setTimeout(() => {
        alert('OCR提示已自動輸入！\n請現在上傳要識別的圖片，然後手動點擊發送按鈕。');
      }, 500);
      
      return true;
    }
    
    // 其他動作自動發送
    await autoSendPrompt();
    
    return true;
  } catch (error) {
    console.error('自動輸入prompt失敗:', error);
    return false;
  }
}

// 自動發送prompt
async function autoSendPrompt() {
  try {
    console.log('開始嘗試自動發送...');
    
    // 等待一下確保輸入完成
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 方法1: 查找並點擊發送按鈕
    const sendButton = findGeminiSendButton();
    
    if (sendButton) {
      console.log('✅ 找到發送按鈕，嘗試點擊:', sendButton);
      
      // 確保按鈕可見且可點擊
      sendButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await new Promise(resolve => setTimeout(resolve, 200));
      
      try {
        // 嘗試多種點擊方式
        sendButton.focus();
        sendButton.click();
        console.log('方法1: 直接click()完成');
        
        // 備用點擊方式
        setTimeout(() => {
          const clickEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window
          });
          sendButton.dispatchEvent(clickEvent);
          console.log('方法1備用: MouseEvent click完成');
        }, 100);
        
        return true;
        
      } catch (error) {
        console.warn('發送按鈕點擊失敗:', error);
      }
    }
    
    // 方法2: 鍵盤快捷鍵發送
    console.log('⏳ 嘗試鍵盤快捷鍵發送...');
    const inputBox = findGeminiInputBox();
    if (inputBox) {
      inputBox.focus();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 嘗試多種鍵盤組合
      const keyboardMethods = [
        { key: 'Enter', ctrlKey: true },  // Ctrl+Enter
        { key: 'Enter', metaKey: true },  // Cmd+Enter (Mac)
        { key: 'Enter', shiftKey: false } // 單純Enter
      ];
      
      for (const method of keyboardMethods) {
        try {
          console.log(`嘗試鍵盤快捷鍵:`, method);
          
          const keydownEvent = new KeyboardEvent('keydown', {
            key: method.key,
            code: method.key === 'Enter' ? 'Enter' : method.key,
            ctrlKey: method.ctrlKey || false,
            metaKey: method.metaKey || false,
            shiftKey: method.shiftKey || false,
            bubbles: true,
            cancelable: true
          });
          
          const keyupEvent = new KeyboardEvent('keyup', {
            key: method.key,
            code: method.key === 'Enter' ? 'Enter' : method.key,
            ctrlKey: method.ctrlKey || false,
            metaKey: method.metaKey || false,
            shiftKey: method.shiftKey || false,
            bubbles: true,
            cancelable: true
          });
          
          inputBox.dispatchEvent(keydownEvent);
          inputBox.dispatchEvent(keyupEvent);
          
          await new Promise(resolve => setTimeout(resolve, 300));
          console.log(`鍵盤方法 ${JSON.stringify(method)} 已執行`);
          
        } catch (error) {
          console.warn(`鍵盤方法 ${JSON.stringify(method)} 失敗:`, error);
        }
      }
      
      return true;
    }
    
    // 方法3: 尋找任何可能的提交按鈕或表單
    console.log('⏳ 嘗試查找表單提交...');
    const forms = document.querySelectorAll('form');
    for (const form of forms) {
      const submitButtons = form.querySelectorAll('button[type="submit"], input[type="submit"]');
      for (const btn of submitButtons) {
        if (isElementVisible(btn)) {
          console.log('找到表單提交按鈕:', btn);
          btn.click();
          return true;
        }
      }
    }
    
    console.log('❌ 所有自動發送方法都已嘗試');
    return false;
    
  } catch (error) {
    console.error('自動發送過程中發生錯誤:', error);
    return false;
  }
}

// 從剪貼簿讀取文本
async function readFromClipboard() {
  try {
    if (navigator.clipboard && navigator.clipboard.readText) {
      const text = await navigator.clipboard.readText();
      return text;
    }
  } catch (error) {
    console.error('讀取剪貼簿失敗:', error);
  }
  return null;
}

// 監聽頁面變化，處理SPA路由變化
function observePageChanges() {
  // 監聽URL變化
  let lastUrl = location.href;
  
  const observer = new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      console.log('Gemini頁面URL變化:', url);
      
      // 頁面變化後重新檢查是否需要自動處理
      setTimeout(() => {
        checkForAutoPrompt();
      }, 2000);
    }
  });
  
  observer.observe(document, {
    subtree: true,
    childList: true
  });
}

// 監聽來自擴展的消息
if (typeof chrome !== 'undefined' && chrome.runtime) {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'autoInputPrompt') {
      console.log('收到自動輸入prompt請求:', request.prompt);
      
      autoInputPrompt(request.prompt).then(success => {
        sendResponse({ success: success });
      });
      
      return true; // 保持消息通道開放
    }
  });
}

// 安全地添加全局調試功能
function setupDebugTools() {
  try {
    // 確保window對象存在
    if (typeof window === 'undefined') {
      console.warn('⚠️ Window對象不存在，跳過調試工具設置');
      return;
    }

    // 添加全局調試功能（可在控制台手動調用）
    window.debugGeminiHandler = {
      // 基本檢測功能
      findInput: findGeminiInputBox,
      findSendButton: findGeminiSendButton,
      
      // 測試輸入功能
      testInput: async (text) => {
        console.log('🧪 開始測試輸入功能...');
        const inputBox = findGeminiInputBox();
        if (inputBox) {
          console.log('找到輸入框:', inputBox);
          
          // 嘗試多種輸入方法
          const testText = text || '測試文本';
          
          // 方法1: 基本方法
          const success1 = await autoInputPrompt(testText, 'test');
          if (success1) {
            return '✅ 方法1輸入測試成功';
          }
          
          // 方法2: 強制方法
          try {
            console.log('🔧 嘗試強制輸入方法...');
            inputBox.focus();
            await new Promise(r => setTimeout(r, 500));
            
            // 直接設置innerHTML
            inputBox.innerHTML = `<p>${testText}</p>`;
            inputBox.classList.remove('ql-blank');
            
            // 強制觸發事件
            inputBox.dispatchEvent(new Event('input', { bubbles: true }));
            inputBox.dispatchEvent(new Event('change', { bubbles: true }));
            
            // 檢查Quill實例
            const richTextarea = inputBox.closest('rich-textarea');
            if (richTextarea && richTextarea.__quill) {
              console.log('🎯 找到Quill實例，直接設置');
              richTextarea.__quill.setText(testText);
            }
            
            console.log('當前輸入框內容:', inputBox.textContent);
            return inputBox.textContent.includes(testText) ? '✅ 強制輸入成功' : '⚠️ 輸入可能失敗';
            
          } catch (error) {
            console.error('強制輸入失敗:', error);
            return '❌ 所有輸入方法都失敗';
          }
        }
        return '❌ 未找到輸入框';
      },
      
      // 測試發送功能
      testSend: async () => {
        console.log('🧪 開始測試發送功能...');
        const success = await autoSendPrompt();
        return success ? '✅ 發送測試成功' : '❌ 發送測試失敗';
      },
      
      // 完整流程測試
      testFullFlow: async (text) => {
        console.log('🧪 開始測試完整流程...');
        const testText = text || '這是一個完整流程測試';
        
        // 1. 檢測輸入框
        const inputBox = findGeminiInputBox();
        if (!inputBox) {
          return '❌ 未找到輸入框';
        }
        console.log('✅ 找到輸入框');
        
        // 2. 測試輸入
        const inputSuccess = await autoInputPrompt(testText, 'test');
        if (!inputSuccess) {
          return '❌ 輸入測試失敗';
        }
        console.log('✅ 輸入測試成功');
        
        // 3. 等待一下
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 4. 測試發送
        const sendSuccess = await autoSendPrompt();
        console.log('✅ 完整流程測試完成');
        return sendSuccess ? '✅ 完整流程測試成功' : '⚠️ 輸入成功但發送可能失敗';
      },
      
      // 模擬真實場景
      simulateAutoPrompt: async (text, actionType) => {
        console.log('🧪 模擬自動提示場景...');
        localStorage.setItem('gemini-auto-prompt', text || '測試提示內容');
        localStorage.setItem('gemini-auto-prompt-time', Date.now().toString());
        localStorage.setItem('gemini-auto-prompt-action', actionType || 'test');
        await checkForAutoPrompt();
        return '✅ 自動提示模擬完成';
      },
      
      // 檢查頁面狀態
      checkPageStatus: () => {
        const status = {
          readyState: document.readyState,
          hasAngular: document.querySelectorAll('[_ngcontent]').length > 0,
          hasRichTextarea: document.querySelectorAll('rich-textarea').length > 0,
          hasQuillEditor: document.querySelectorAll('.ql-editor').length > 0,
          inputBoxFound: !!findGeminiInputBox(),
          sendButtonFound: !!findGeminiSendButton()
        };
        console.table(status);
        return status;
      },
      
      // 清理測試數據
      cleanup: () => {
        localStorage.removeItem('gemini-auto-prompt');
        localStorage.removeItem('gemini-auto-prompt-time');
        localStorage.removeItem('gemini-auto-prompt-action');
        console.log('✅ 測試數據已清理');
        return '清理完成';
      },
      
      // 終極輸入測試
      ultimateTest: async (text) => {
        console.log('🚀 開始終極輸入測試...');
        const testText = text || '終極測試內容';
        
        // 1. 尋找所有可能的編輯器
        const editors = [];
        
        // Quill編輯器
        document.querySelectorAll('.ql-editor').forEach(el => {
          if (el.getAttribute('contenteditable') === 'true') {
            editors.push({ type: 'quill', element: el });
          }
        });
        
        // Rich textarea
        document.querySelectorAll('rich-textarea').forEach(el => {
          const editor = el.querySelector('[contenteditable="true"]');
          if (editor) {
            editors.push({ type: 'rich-textarea', element: editor, parent: el });
          }
        });
        
        // 通用contenteditable
        document.querySelectorAll('[contenteditable="true"]').forEach(el => {
          const rect = el.getBoundingClientRect();
          if (rect.width > 100 && rect.height > 20) {
            editors.push({ type: 'contenteditable', element: el });
          }
        });
        
        console.log('找到編輯器數量:', editors.length);
        
        for (const editor of editors) {
          try {
            console.log('🎯 測試編輯器:', editor.type, editor.element);
            
            // 聚焦
            editor.element.focus();
            await new Promise(r => setTimeout(r, 200));
            
            // 清空
            editor.element.innerHTML = '';
            editor.element.textContent = '';
            
            // 設置內容
            if (editor.type === 'quill') {
              editor.element.innerHTML = `<p>${testText}</p>`;
            } else {
              editor.element.textContent = testText;
            }
            
            editor.element.classList.remove('ql-blank');
            
            // 事件觸發
            editor.element.dispatchEvent(new Event('input', { bubbles: true }));
            editor.element.dispatchEvent(new Event('change', { bubbles: true }));
            
            // 檢查父級
            if (editor.parent) {
              editor.parent.dispatchEvent(new Event('input', { bubbles: true }));
              
              // 嘗試Quill API
              if (editor.parent.__quill) {
                console.log('使用Quill API設置文本');
                editor.parent.__quill.setText(testText);
              }
              
              // 嘗試其他可能的API
              if (editor.parent._quill) {
                console.log('使用_quill API設置文本');
                editor.parent._quill.setText(testText);
              }
            }
            
            await new Promise(r => setTimeout(r, 300));
            
            const currentContent = editor.element.textContent || editor.element.innerText || '';
            console.log('編輯器當前內容:', currentContent);
            
            if (currentContent.includes(testText)) {
              console.log('✅ 編輯器測試成功!');
              return `✅ ${editor.type} 編輯器測試成功`;
            }
            
          } catch (error) {
            console.warn('編輯器測試失敗:', error);
          }
        }
        
        return '❌ 所有編輯器測試都失敗';
      }
    };

    console.log('🎯 調試工具設置完成');
    console.log('💡 調試工具可通過 window.debugGeminiHandler 訪問');
    console.log('📝 例如：window.debugGeminiHandler.testInput("hello world")');
    console.log('📝 檢查頁面狀態：window.debugGeminiHandler.checkPageStatus()');
    
  } catch (error) {
    console.error('❌ 調試工具設置失敗:', error);
  }
}

// 在DOM載入完成後設置調試工具
if (document.readyState === 'complete') {
  setupDebugTools();
} else {
  document.addEventListener('DOMContentLoaded', setupDebugTools);
  window.addEventListener('load', setupDebugTools);
}

console.log('🎯 Gemini Auto Handler 初始化完成');

})(); // 結束IIFE