// gemini_final.js - 自動剪貼簿版本
console.log('🚀 Gemini Handler 启动 (自動剪貼簿模式)');

// 核心功能函數
function findGeminiInput() {
  var selectors = [
    'rich-textarea .ql-editor[contenteditable="true"]',
    '.ql-editor[contenteditable="true"]',
    '[contenteditable="true"]'
  ];
  
  for (var i = 0; i < selectors.length; i++) {
    var elements = document.querySelectorAll(selectors[i]);
    for (var j = 0; j < elements.length; j++) {
      var elem = elements[j];
      var rect = elem.getBoundingClientRect();
      if (rect.width > 100 && rect.height > 20) {
        return elem;
      }
    }
  }
  return null;
}

function inputToGemini(text) {
  console.log('📝 開始輸入:', text);
  var input = findGeminiInput();
  if (!input) {
    console.log('❌ 找不到輸入框');
    return false;
  }
  
  try {
    input.focus();
    console.log('🎯 已聚焦輸入框');
    
    // 清空並設置內容
    input.innerHTML = '';
    input.textContent = '';
    
    setTimeout(function() {
      input.innerHTML = '<p>' + text + '</p>';
      input.textContent = text;
      
      if (input.className && input.className.indexOf('ql-blank') >= 0) {
        input.className = input.className.replace('ql-blank', '');
      }
      
      // 觸發事件
      var events = ['input', 'change', 'keyup'];
      for (var i = 0; i < events.length; i++) {
        try {
          var evt = document.createEvent('Event');
          evt.initEvent(events[i], true, true);
          input.dispatchEvent(evt);
        } catch (evtError) {
          console.log('⚠️ 事件失敗:', events[i]);
        }
      }
      
      console.log('✅ 輸入完成:', input.textContent);
    }, 100);
    
    return true;
  } catch (e) {
    console.log('❌ 輸入失敗:', e);
    return false;
  }
}

function sendGeminiMessage() {
  console.log('📤 嘗試發送...');
  
  var buttons = document.getElementsByTagName('button');
  var candidates = [];
  
  for (var i = 0; i < buttons.length; i++) {
    var btn = buttons[i];
    var rect = btn.getBoundingClientRect();
    var hasSvg = btn.getElementsByTagName('svg').length > 0;
    
    if (hasSvg && rect.width > 15 && rect.height > 15) {
      candidates.push({
        button: btn,
        size: rect.width + 'x' + rect.height,
        visible: rect.width > 0 && rect.height > 0,
        enabled: !btn.disabled
      });
    }
  }
  
  console.log('📊 找到', candidates.length, '個候選發送按鈕');
  
  candidates.sort(function(a, b) {
    var aSize = parseFloat(a.size.split('x')[0]);
    var bSize = parseFloat(b.size.split('x')[0]);
    return aSize - bSize;
  });
  
  for (var j = 0; j < candidates.length; j++) {
    var candidate = candidates[j];
    if (candidate.visible && candidate.enabled) {
      try {
        console.log('🎯 嘗試按鈕', j + 1, '尺寸:', candidate.size);
        candidate.button.click();
        console.log('✅ 成功點擊發送按鈕!');
        return true;
      } catch (e) {
        console.log('⚠️ 按鈕', j + 1, '點擊失敗:', e.message);
      }
    }
  }
  
  // 嘗試鍵盤發送 - 使用現代事件API
  console.log('🎹 嘗試鍵盤發送...');
  var input = findGeminiInput();
  if (input) {
    try {
      input.focus();
      console.log('🎯 輸入框已聚焦，嘗試Ctrl+Enter');
      
      var modernEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        ctrlKey: true,
        bubbles: true,
        cancelable: true
      });
      input.dispatchEvent(modernEvent);
      console.log('✅ 發送現代Ctrl+Enter事件');
      
      setTimeout(function() {
        var keyupEvent = new KeyboardEvent('keyup', {
          key: 'Enter',
          code: 'Enter', 
          ctrlKey: true,
          bubbles: true,
          cancelable: true
        });
        input.dispatchEvent(keyupEvent);
        console.log('✅ 發送Ctrl+Enter keyup事件');
      }, 50);
      
      return true;
      
    } catch (modernError) {
      console.log('⚠️ 現代事件API失敗:', modernError.message);
    }
  }
  
  console.log('❌ 所有發送方法都失敗了');
  return false;
}

// 設置事件系統
function setupEventSystem() {
  document.addEventListener('gemini-action', function(event) {
    var action = event.detail.action;
    var data = event.detail.data;
    
    console.log('📨 收到動作:', action, data);
    
    if (action === 'input') {
      inputToGemini(data.text);
    } else if (action === 'send') {
      sendGeminiMessage();
    } else if (action === 'test') {
      var success = inputToGemini(data.text);
      if (success) {
        setTimeout(function() {
          sendGeminiMessage();
        }, 2000);
      }
    }
  });
  
  console.log('✅ 事件系統設置完成');
}

// 檢查自動提示 - 支持localStorage和剪貼簿
function checkAutoPrompt() {
  try {
    // 首先檢查localStorage
    var prompt = localStorage.getItem('gemini-auto-prompt');
    var time = localStorage.getItem('gemini-auto-prompt-time');
    var action = localStorage.getItem('gemini-auto-prompt-action');
    
    if (prompt && time) {
      var diff = Date.now() - parseInt(time);
      if (diff < 300000) { // 5分鐘內有效
        console.log('🔄 檢測到localStorage自動提示，長度:', prompt.length);
        console.log('📋 動作類型:', action);
        console.log('⏰ 時間差:', Math.floor(diff / 1000), '秒前');
        
        // 清除localStorage避免重複處理
        localStorage.removeItem('gemini-auto-prompt');
        localStorage.removeItem('gemini-auto-prompt-time');
        localStorage.removeItem('gemini-auto-prompt-action');
        
        executeAutoAction(prompt, action);
        return;
      } else {
        console.log('⏰ localStorage自動提示已過期，清除緩存');
        localStorage.removeItem('gemini-auto-prompt');
        localStorage.removeItem('gemini-auto-prompt-time');
        localStorage.removeItem('gemini-auto-prompt-action');
      }
    }
    
    // 如果localStorage沒有，嘗試讀取剪貼簿
    console.log('📋 檢查剪貼簿內容...');
    checkClipboardForPrompt();
    
  } catch (e) {
    console.log('⚠️ 自動提示檢查失敗:', e);
  }
}

// 檢查剪貼簿內容
async function checkClipboardForPrompt() {
  try {
    // 讀取剪貼簿內容
    var clipboardText = await navigator.clipboard.readText();
    
    if (clipboardText && clipboardText.length > 50) {
      console.log('📋 檢測到剪貼簿內容，長度:', clipboardText.length);
      
      // 檢查是否包含AI助手相關關鍵詞
      var aiKeywords = [
        '我希望你扮演', '請總結', '請翻譯', '摘要助手', '翻譯助理',
        '總結以下內容', '翻譯以下內容', '搜尋', '識別這張圖片',
        '標題：', '來源：', '內容：'
      ];
      
      var containsAIPrompt = aiKeywords.some(function(keyword) {
        return clipboardText.includes(keyword);
      });
      
      if (containsAIPrompt) {
        console.log('✅ 剪貼簿包含AI提示，自動執行');
        
        // 判斷動作類型
        var detectedAction = 'summary'; // 默認
        if (clipboardText.includes('翻譯') || clipboardText.includes('翻译')) {
          detectedAction = 'translate';
        } else if (clipboardText.includes('搜尋') || clipboardText.includes('搜索')) {
          detectedAction = 'search';
        } else if (clipboardText.includes('識別') || clipboardText.includes('OCR')) {
          detectedAction = 'ocr';
        }
        
        executeAutoAction(clipboardText, detectedAction);
        
        // 清空剪貼簿避免重複處理
        try {
          await navigator.clipboard.writeText('');
          console.log('✅ 已清空剪貼簿');
        } catch (clearError) {
          console.log('⚠️ 無法清空剪貼簿:', clearError);
        }
        
      } else {
        console.log('ℹ️ 剪貼簿內容不包含AI提示關鍵詞');
      }
    } else {
      console.log('ℹ️ 剪貼簿內容為空或過短');
    }
    
  } catch (clipboardError) {
    console.log('⚠️ 無法讀取剪貼簿:', clipboardError);
    console.log('ℹ️ 沒有找到待處理的自動提示');
  }
}

// 執行自動動作
function executeAutoAction(prompt, action) {
  setTimeout(function() {
    console.log('🤖 自動執行document.dispatchEvent...');
    console.log('📋 動作類型:', action);
    
    // 根據不同動作類型決定事件類型
    if (action === 'ocr') {
      console.log('📸 OCR模式：僅輸入，不自動發送');
      document.dispatchEvent(new CustomEvent('gemini-action', {
        detail: {
          action: 'input',
          data: { text: prompt }
        }
      }));
      
      setTimeout(function() {
        alert('OCR提示已輸入！請上傳圖片後手動按 Ctrl+Enter 發送。');
      }, 1000);
      
    } else {
      console.log('📤 自動模式：輸入並發送 -', action);
      document.dispatchEvent(new CustomEvent('gemini-action', {
        detail: {
          action: 'test',
          data: { text: prompt }
        }
      }));
    }
    
  }, 1000); // 等待3秒確保頁面完全載入
}

// 初始化
function init() {
  console.log('🛠️ 開始初始化...');
  
  setupEventSystem();
  checkAutoPrompt();
  
  console.log('');
  console.log('🔧 智能剪貼簿事件系統已啟用！');
  console.log('');
  console.log('📋 支持的操作:');
  console.log('  • localStorage自動檢測');
  console.log('  • 剪貼簿自動檢測和執行');
  console.log('  • 智能關鍵詞識別');  
  console.log('  • 自動清空剪貼簿');
  console.log('');
  console.log('🎮 手動測試命令:');
  console.log('document.dispatchEvent(new CustomEvent("gemini-action", {detail: {action: "test", data: {text: "Hello!"}}}));');
  console.log('');
  
  console.log('🎉 Gemini Handler 初始化完成!');
}

// 延迟初始化
setTimeout(init, 1000);