// gemini_auto_handler_simple.js - 簡化版Gemini自動化處理

(function() {
  'use strict';
  
  console.log('🚀 Gemini Simple Handler 開始載入...');

  // 檢查是否在正確的域名
  if (!window.location.href.includes('gemini.google.com')) {
    console.warn('⚠️ 非Gemini域名，跳過初始化');
    return;
  }

  // 簡單的輸入框查找
  function findInputBox() {
    const selectors = [
      'rich-textarea .ql-editor[contenteditable="true"]',
      '.ql-editor[contenteditable="true"]',
      '[contenteditable="true"]'
    ];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.getBoundingClientRect().width > 100) {
        console.log('找到輸入框:', element);
        return element;
      }
    }
    return null;
  }

  // 簡單的發送按鈕查找
  function findSendButton() {
    const buttons = document.querySelectorAll('button');
    for (const button of buttons) {
      const rect = button.getBoundingClientRect();
      if (rect.width < 100 && rect.height < 100 && button.querySelector('svg')) {
        console.log('找到發送按鈕:', button);
        return button;
      }
    }
    return null;
  }

  // 簡單的文本輸入
  async function inputText(text) {
    const inputBox = findInputBox();
    if (!inputBox) {
      console.error('未找到輸入框');
      return false;
    }

    try {
      // 聚焦
      inputBox.focus();
      await new Promise(r => setTimeout(r, 300));

      // 清空並設置文本
      inputBox.innerHTML = '';
      inputBox.textContent = text;
      inputBox.classList.remove('ql-blank');

      // 嘗試使用execCommand
      document.execCommand('selectAll');
      document.execCommand('insertText', false, text);

      // 觸發事件
      inputBox.dispatchEvent(new Event('input', { bubbles: true }));
      inputBox.dispatchEvent(new Event('change', { bubbles: true }));

      const richTextarea = inputBox.closest('rich-textarea');
      if (richTextarea) {
        richTextarea.dispatchEvent(new Event('input', { bubbles: true }));
      }

      console.log('文本輸入完成:', inputBox.textContent);
      return inputBox.textContent.includes(text);

    } catch (error) {
      console.error('輸入失敗:', error);
      return false;
    }
  }

  // 簡單的發送
  async function sendMessage() {
    const sendButton = findSendButton();
    if (sendButton) {
      sendButton.click();
      console.log('消息已發送');
      return true;
    }

    // 嘗試鍵盤發送
    const inputBox = findInputBox();
    if (inputBox) {
      inputBox.focus();
      const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        ctrlKey: true,
        bubbles: true
      });
      inputBox.dispatchEvent(enterEvent);
      console.log('嘗試鍵盤發送');
      return true;
    }

    return false;
  }

  // 檢查自動prompt
  async function checkAutoPrompt() {
    const autoPrompt = localStorage.getItem('gemini-auto-prompt');
    const promptTime = localStorage.getItem('gemini-auto-prompt-time');
    const actionType = localStorage.getItem('gemini-auto-prompt-action');

    if (autoPrompt && promptTime) {
      const timeDiff = Date.now() - parseInt(promptTime);
      
      if (timeDiff < 5 * 60 * 1000) {
        console.log('檢測到自動prompt:', autoPrompt);
        
        // 清除localStorage
        localStorage.removeItem('gemini-auto-prompt');
        localStorage.removeItem('gemini-auto-prompt-time');
        localStorage.removeItem('gemini-auto-prompt-action');

        // 等待頁面準備
        await new Promise(r => setTimeout(r, 2000));

        // 輸入文本
        const success = await inputText(autoPrompt);
        
        if (success && actionType !== 'ocr') {
          await new Promise(r => setTimeout(r, 1000));
          await sendMessage();
        } else if (actionType === 'ocr') {
          alert('OCR提示已輸入，請上傳圖片後手動發送。');
        }
      }
    }
  }

  // 設置調試工具
  function setupDebugTools() {
    window.geminiSimpleDebug = {
      findInput: findInputBox,
      findSend: findSendButton,
      testInput: (text) => inputText(text || '測試'),
      testSend: sendMessage,
      fullTest: async (text) => {
        const testText = text || '完整測試';
        const inputSuccess = await inputText(testText);
        if (inputSuccess) {
          await new Promise(r => setTimeout(r, 1000));
          const sendSuccess = await sendMessage();
          return inputSuccess && sendSuccess ? '✅ 完整測試成功' : '⚠️ 部分成功';
        }
        return '❌ 輸入失敗';
      }
    };
    
    console.log('🎯 簡化版調試工具已設置: window.geminiSimpleDebug');
  }

  // 初始化
  function init() {
    console.log('🎯 開始初始化...');
    checkAutoPrompt();
    setupDebugTools();
  }

  // 延遲初始化
  if (document.readyState === 'complete') {
    setTimeout(init, 1000);
  } else {
    window.addEventListener('load', () => setTimeout(init, 1000));
  }

})();