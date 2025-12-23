// background.js - 處理截圖請求

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'captureTab') {
    // 截取當前分頁
    chrome.tabs.captureVisibleTab(null, {format: 'png'}, (dataUrl) => {
      if (chrome.runtime.lastError) {
        console.error('截圖失敗:', chrome.runtime.lastError);
        sendResponse({success: false, error: chrome.runtime.lastError.message});
      } else {
        console.log('截圖成功');
        sendResponse({success: true, dataUrl: dataUrl});
      }
    });
    return true; // 保持消息通道開放
  }
  
  if (request.action === 'captureArea') {
    // 截取整個頁面，讓content script處理裁切
    chrome.tabs.captureVisibleTab(null, {format: 'png'}, (dataUrl) => {
      if (chrome.runtime.lastError) {
        console.error('區域截圖失敗:', chrome.runtime.lastError);
        sendResponse({success: false, error: chrome.runtime.lastError.message});
      } else {
        console.log('全頁截圖成功，返回給content script處理裁切');
        sendResponse({success: true, dataUrl: dataUrl, area: request.area});
      }
    });
    return true; // 保持消息通道開放
  }

  // ✅ FIX: Handle Gemini auto-prompt via Chrome messaging
  if (request.action === 'openGeminiWithPrompt') {
    console.log('📨 Background: Received request to open Gemini with prompt');

    const geminiUrl = request.url || 'https://gemini.google.com/app';

    // Get current window to calculate position
    chrome.windows.getCurrent((currentWindow) => {
      // Calculate right-side position
      const windowWidth = 800;
      const windowHeight = 1200;
      const screenWidth = currentWindow.left + currentWindow.width + windowWidth + 100;
      const rightPosition = Math.max(screenWidth - windowWidth - 100, currentWindow.left + currentWindow.width + 50);
      const topPosition = currentWindow.top + 50;

      // Create new Gemini window on the right side
      chrome.windows.create({
        url: geminiUrl,
        type: 'popup',
        width: windowWidth,
        height: windowHeight,
        left: rightPosition,
        top: topPosition
      }, (newWindow) => {
        console.log('✅ Gemini window created:', newWindow.id);

        const tabId = newWindow.tabs[0].id;

        // Wait for tab to load
        const checkTabReady = setInterval(() => {
          chrome.tabs.get(tabId, (tabInfo) => {
            if (tabInfo.status === 'complete') {
              clearInterval(checkTabReady);

              // Wait a bit more for content scripts to initialize
              setTimeout(() => {
                console.log('📤 Sending prompt to Gemini window:', tabId);

                // Send message to Gemini tab
                chrome.tabs.sendMessage(tabId, {
                  action: 'autoInputPrompt',
                  prompt: request.prompt,
                  actionType: request.actionType || 'default',
                  imageData: request.imageData  // ✅ FIX: 傳遞圖片數據到 Gemini
                }, (response) => {
                  if (chrome.runtime.lastError) {
                    console.error('❌ Failed to send message:', chrome.runtime.lastError);
                    sendResponse({ success: false, error: chrome.runtime.lastError.message });
                  } else {
                    console.log('✅ Message sent successfully:', response);
                    sendResponse({ success: true });
                  }
                });
              }, 2000); // Wait 2 seconds for content scripts to load
            }
          });
        }, 500); // Check every 500ms
      });
    });

    return true; // Keep message channel open
  }
});