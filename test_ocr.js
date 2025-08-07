// 簡化的OCR測試腳本
console.log('OCR測試腳本已載入 - Claude頁面');

// 檢查OCR任務 - 增加更多檢查方式
setTimeout(() => {
  const sessionTask = sessionStorage.getItem('claude-ocr-task') === 'true';
  const localTask = localStorage.getItem('claude-ocr-task') === 'true';
  const urlTask = window.location.search.includes('ocr=true');
  const urlParams = new URLSearchParams(window.location.search);
  const hasOcrParam = urlParams.get('ocr') === 'true';
  
  console.log('檢查OCR任務標記:');
  console.log('- sessionStorage:', sessionTask);
  console.log('- localStorage:', localTask);  
  console.log('- URL參數(includes):', urlTask);
  console.log('- URL參數(URLSearchParams):', hasOcrParam);
  console.log('- 完整URL:', window.location.href);
  
  const isOCRTask = sessionTask || localTask || urlTask || hasOcrParam;
  
  if (isOCRTask) {
    console.log('=== 檢測到OCR任務，開始自動化 ===');
    
    // 清除標記
    sessionStorage.removeItem('claude-ocr-task');
    localStorage.removeItem('claude-ocr-task');
    
    // 延遲執行，確保頁面完全載入
    setTimeout(() => {
      performOCRAutomation();
    }, 1500);
  } else {
    console.log('沒有OCR任務，等待手動觸發');
    console.log('=== 手動測試說明 ===');
    console.log('如要手動測試OCR功能，請在Console執行:');
    console.log('performOCRAutomation()');
    console.log('');
    console.log('如要測試自動觸發，請執行:');
    console.log('localStorage.setItem("claude-ocr-task", "true"); location.reload();');
  }
}, 500);

async function performOCRAutomation() {
  console.log('=== 開始完整OCR自動化流程 ===');
  
  // 步驟1: 尋找輸入框
  console.log('1. 開始尋找輸入框...');
  
  let inputElement = null;
  const selectors = [
    'div[contenteditable="true"]',
    'textarea',
    '[role="textbox"]'
  ];
  
  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    console.log(`嘗試選擇器 ${selector}, 找到 ${elements.length} 個元素`);
    
    for (const element of elements) {
      if (element.offsetParent !== null) {
        inputElement = element;
        console.log('找到可見的輸入框:', element);
        break;
      }
    }
    if (inputElement) break;
  }
  
  if (!inputElement) {
    console.error('找不到輸入框');
    alert('找不到輸入框，OCR自動化失敗');
    return;
  }
  
  // 步驟2: 聚焦輸入框
  console.log('2. 聚焦輸入框...');
  inputElement.focus();
  inputElement.click();
  await sleep(200);
  
  // 步驟3: 嘗試貼上截圖
  console.log('3. 嘗試貼上截圖...');
  await attemptPasteImage(inputElement);
  
  // 步驟4: 輸入OCR提示文字
  console.log('4. 輸入OCR提示文字...');
  
  const prompt = "請將圖片中的文字提取出來並保留其原本的格式";
  
  // 清空現有內容
  if (inputElement.contentEditable === 'true') {
    inputElement.innerHTML = '';
    inputElement.textContent = '';
  } else {
    inputElement.value = '';
  }
  
  // 輸入文字
  if (inputElement.contentEditable === 'true') {
    inputElement.textContent = prompt;
    inputElement.innerHTML = prompt;
  } else {
    inputElement.value = prompt;
  }
  
  // 觸發輸入事件
  inputElement.dispatchEvent(new Event('input', { bubbles: true }));
  inputElement.dispatchEvent(new Event('change', { bubbles: true }));
  
  console.log('5. 文字輸入完成，內容:', inputElement.textContent || inputElement.value);
  
  // 步驟5: 等待然後自動發送
  console.log('6. 等待800ms後自動發送...');
  setTimeout(() => {
    console.log('7. 開始尋找發送按鈕...');
    // 使用詳細的日誌功能
    const success = findAndClickSendButton();
    if (success) {
      console.log('🎉 OCR自動化完全成功！');
    } else {
      console.error('⚠️ 自動發送失敗，請檢查上面的診斷信息');
      alert('自動發送失敗，請查看Console的詳細日誌，然後手動點擊發送按鈕');
    }
  }, 800);
}

// 嘗試貼上圖片的函數
async function attemptPasteImage(element) {
  console.log('開始嘗試貼上圖片...');
  
  try {
    // 方法1: 使用Clipboard API讀取剪貼簿
    if (navigator.clipboard && navigator.clipboard.read) {
      console.log('嘗試使用Clipboard API讀取剪貼簿...');
      
      const clipboardItems = await navigator.clipboard.read();
      console.log('剪貼簿項目數量:', clipboardItems.length);
      
      for (const clipboardItem of clipboardItems) {
        console.log('剪貼簿項目類型:', clipboardItem.types);
        
        for (const type of clipboardItem.types) {
          if (type.startsWith('image/')) {
            console.log('找到圖片類型:', type);
            const blob = await clipboardItem.getType(type);
            console.log('圖片大小:', blob.size, 'bytes');
            
            // 創建DataTransfer並觸發paste事件
            const dataTransfer = new DataTransfer();
            const file = new File([blob], 'screenshot.png', { type: blob.type });
            dataTransfer.items.add(file);
            
            const pasteEvent = new ClipboardEvent('paste', {
              bubbles: true,
              cancelable: true,
              clipboardData: dataTransfer
            });
            
            element.dispatchEvent(pasteEvent);
            console.log('已觸發paste事件，包含圖片數據');
            return true;
          }
        }
      }
    }
  } catch (error) {
    console.log('Clipboard API方法失敗:', error.message);
  }
  
  // 方法2: 模擬Ctrl+V按鍵
  console.log('嘗試模擬Ctrl+V按鍵...');
  
  const keydownEvent = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    key: 'v',
    code: 'KeyV',
    keyCode: 86,
    which: 86,
    ctrlKey: true,
    metaKey: false
  });
  
  const keyupEvent = new KeyboardEvent('keyup', {
    bubbles: true,
    cancelable: true,
    key: 'v',
    code: 'KeyV',
    keyCode: 86,
    which: 86,
    ctrlKey: true,
    metaKey: false
  });
  
  element.dispatchEvent(keydownEvent);
  await sleep(50);
  element.dispatchEvent(keyupEvent);
  
  // 方法3: 直接觸發paste事件
  console.log('嘗試直接觸發paste事件...');
  
  const pasteEvent = new ClipboardEvent('paste', {
    bubbles: true,
    cancelable: true
  });
  
  element.dispatchEvent(pasteEvent);
  document.dispatchEvent(pasteEvent);
  
  console.log('已嘗試所有貼上方法');
  return false;
}

// 輔助函數
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function findAndClickSendButton() {
  console.log('開始尋找發送按鈕...');
  
  // 策略1: 精確匹配aria-label
  let sendButton = document.querySelector('button[aria-label="Send message"]');
  if (sendButton && !sendButton.disabled && sendButton.offsetParent !== null) {
    console.log('找到發送按鈕 (aria-label):', sendButton);
    sendButton.click();
    console.log('發送按鈕已點擊！');
    return true;
  }
  
  // 策略2: 根據你提供的SVG路徑查找
  const specificPath = 'M208.49,120.49a12,12,0,0,1-17,0L140,69V216a12,12,0,0,1-24,0V69L64.49,120.49a12,12,0,0,1-17-17l72-72a12,12,0,0,1,17,0l72,72A12,12,0,0,1,208.49,120.49Z';
  sendButton = document.querySelector(`button svg path[d="${specificPath}"]`);
  if (sendButton) {
    sendButton = sendButton.closest('button');
    if (sendButton && !sendButton.disabled && sendButton.offsetParent !== null) {
      console.log('找到發送按鈕 (精確SVG路徑):', sendButton);
      sendButton.click();
      console.log('發送按鈕已點擊！');
      return true;
    }
  }
  
  // 策略3: 根據你提供的CSS class組合查找
  const classSelectors = [
    'button.inline-flex.items-center.justify-center.relative.shrink-0.can-focus.select-none.bg-accent-main-000.text-oncolor-100.font-base-bold.transition-colors.h-8.w-8.rounded-md',
    'button.bg-accent-main-000.text-oncolor-100.h-8.w-8.rounded-md',
    'button[class*="bg-accent-main-000"][class*="h-8"][class*="w-8"]'
  ];
  
  for (const selector of classSelectors) {
    sendButton = document.querySelector(selector);
    if (sendButton && !sendButton.disabled && sendButton.offsetParent !== null) {
      console.log('找到發送按鈕 (CSS class):', sendButton);
      sendButton.click();
      console.log('發送按鈕已點擊！');
      return true;
    }
  }
  
  // 策略4: 查找所有8x8的圓角按鈕，檢查是否包含向上箭頭SVG
  const buttons = document.querySelectorAll('button.h-8.w-8.rounded-md, button[style*="width: 32px"][style*="height: 32px"]');
  console.log(`找到 ${buttons.length} 個候選按鈕`);
  
  for (const button of buttons) {
    if (button.disabled || button.offsetParent === null) continue;
    
    const svg = button.querySelector('svg');
    if (svg) {
      const paths = svg.querySelectorAll('path');
      for (const path of paths) {
        const d = path.getAttribute('d');
        // 檢查是否為向上箭頭的路徑 (包含關鍵點: 208.49,120.49 或 L140,69V216)
        if (d && (d.includes('208.49,120.49') || d.includes('L140,69V216') || d.includes('120.49'))) {
          console.log('找到發送按鈕 (SVG模式匹配):', button);
          button.click();
          console.log('發送按鈕已點擊！');
          return true;
        }
      }
    }
  }
  
  // 策略5: 備用方案 - 查找任何可能的發送按鈕
  const allButtons = document.querySelectorAll('button');
  console.log(`檢查所有 ${allButtons.length} 個按鈕作為備用方案`);
  
  for (const button of allButtons) {
    if (button.disabled || button.offsetParent === null) continue;
    
    // 檢查按鈕是否有SVG且可能是發送按鈕
    const svg = button.querySelector('svg');
    if (svg && button.classList.contains('h-8') && button.classList.contains('w-8')) {
      console.log('找到潛在發送按鈕 (備用方案):', button);
      button.click();
      console.log('備用發送按鈕已點擊！');
      return true;
    }
  }
  
  console.error('所有策略都失敗，找不到發送按鈕');
  console.log('可用按鈕列表:', Array.from(allButtons).map((btn, index) => ({
    index,
    text: btn.textContent.trim(),
    ariaLabel: btn.getAttribute('aria-label'),
    classes: btn.className,
    disabled: btn.disabled,
    visible: btn.offsetParent !== null,
    hasSvg: !!btn.querySelector('svg')
  })));
  
  alert('找不到發送按鈕，請手動點擊發送');
  return false;
}

// 創建一個專門的診斷函數
function diagnoseSendButton() {
  console.log('🔍 開始診斷發送按鈕...');
  console.log('📍 當前頁面:', window.location.href);
  console.log('📍 頁面標題:', document.title);
  
  // 調用詳細的查找函數
  const success = findAndClickSendButton();
  
  if (!success) {
    console.log('❌ 自動點擊失敗');
    console.log('💡 建議: 請查看上面的詳細診斷信息，找出發送按鈕的實際特徵');
    console.log('💡 建議: 你可以手動檢查按鈕元素，然後告訴我實際的HTML結構');
  }
  
  return success;
}

// 創建一個快速測試自動發送的函數
function testAutoSend() {
  console.log('🚀 開始測試自動發送功能...');
  
  // 先檢查是否有輸入內容
  const inputElements = document.querySelectorAll('div[contenteditable="true"], textarea, [role="textbox"]');
  console.log(`找到 ${inputElements.length} 個輸入框`);
  
  let hasContent = false;
  inputElements.forEach((element, index) => {
    const content = element.textContent || element.value;
    console.log(`輸入框 ${index + 1} 內容: "${content}"`);
    if (content && content.trim().length > 0) {
      hasContent = true;
    }
  });
  
  if (!hasContent) {
    console.log('⚠️ 沒有發現輸入內容，建議先輸入一些文字再測試');
    return false;
  }
  
  // 執行診斷
  return diagnoseSendButton();
}

// 讓函數全域可用，方便手動測試
window.performOCRAutomation = performOCRAutomation;
window.findAndClickSendButton = findAndClickSendButton;
window.attemptPasteImage = attemptPasteImage;
window.diagnoseSendButton = diagnoseSendButton;
window.testAutoSend = testAutoSend;

console.log('全域函數已註冊: performOCRAutomation, findAndClickSendButton, attemptPasteImage, diagnoseSendButton, testAutoSend');
console.log('💡 使用方法:');
console.log('   - diagnoseSendButton() // 診斷發送按鈕');  
console.log('   - testAutoSend() // 測試自動發送功能');
console.log('   - performOCRAutomation() // 完整OCR自動化');