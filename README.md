# MyToDoList - 多人協作待辦清單網頁應用程式

專為團隊與多人協作設計的待辦清單 Web 應用程式，使用 Firebase Authentication（Google 登入）與 Cloud Firestore 達成秒級即時雙向資料同步。

---

## 🌟 功能特色

1. **Google 帳號快速登入**
   - 使用 Firebase Auth 整合 Google Sign-In，免記密碼一鍵登入。
   - 自動同步使用者個人頭像與暱稱。

2. **多人即時協作待辦清單**
   - **建立與管理清單**：支援建立多個清單群組（如「工作專案」、「家庭採買」、「活動籌辦」）。
   - **邀請協作成員**：輸入對方的 Google Email 即可將其加入清單，對方登入後立即可見並共同編輯。
   - **權限與角色分工**：區分「👑 擁有者」與「👥 協作者」，擁有者具備刪除清單與移除成員權限。
   - **即時任務同步**：任何成員新增、勾選完成、修改或刪除任務，所有成員畫面即時秒級更新（Firestore `onSnapshot`）。

3. **豐富的任務管理工具**
   - **優先級設定**：高（🔥）、中、低（☕）優先級標記。
   - **截止日期**：直覺式日期選擇器。
   - **成員指派**：可將特定任務指派給清單內的協作成員。
   - **進度追蹤**：自動計算清單任務完成百分比與進度條。
   - **篩選與即時搜尋**：支援依照「全部」、「進行中」、「已完成」、「指派給我」及關鍵字即時過濾。

4. **安全防護**
   - 包含專門設計的 `firestore.rules` 規則，嚴格限制只有清單成員能存取該清單與子集合任務，杜絕越權風險。

---

## 🚀 專案結構

```
MyToDoList/
├── index.html          # 主頁面 (Tailwind CSS + 現代化響應式 UI)
├── app.js              # 核心邏輯 (Firebase v11 模組化 SDK, Auth, Firestore 即時監聽)
├── config.js           # Firebase 專案設定
├── styles.css          # 自訂 CSS 樣式與動態效果
├── firestore.rules     # 生產級安全規則 (由專門 subagent 嚴格驗證)
├── firebase.json       # Firebase Hosting & Firestore 部署設定
├── start-server.ps1    # 輕量級本機 HTTP 伺服器 (PowerShell 內建)
├── start-server.bat    # Windows 快速啟動批次檔 (滑鼠雙擊即可執行)
└── README.md           # 說明文件
```

---

## ⚙️ Firebase 專案設定指南 (my-to-do-list-fd68c)

在使用前，請至 [Firebase Console](https://console.firebase.google.com/project/my-to-do-list-fd68c/overview) 完成以下 3 個步驟：

### 1. 啟用 Google 登入
1. 前往 **Build** > **Authentication** > **Sign-in method**。
2. 點擊 **Google** 提供者，點選「啟用 (Enable)」。
3. 設定專案支援電子郵件，然後點擊「儲存」。

### 2. 建立 Firestore 資料庫並部署安全規則
1. 前往 **Build** > **Firestore Database**。
2. 點擊「建立資料庫 (Create database)」，選擇地區（例如 `asia-east1`）並依預設建立。
3. 切換至 **Rules (規則)** 分頁，將本專案目錄中的 `firestore.rules` 內容貼上並點擊「發布 (Publish)」。

### 3. 取得 Web API Key 並填入設定
1. 進入 **Project Settings (專案設定)** > **General (一般)**。
2. 若尚未建立 Web 應用程式，請滑到最下方點擊 `</>` (新增網頁應用程式)，名稱填寫 `MyToDoList`。
3. 取得 SDK 配置物件中的 `apiKey` 與 `appId`。
4. **設定方式二選一**：
   - **方式 A（推薦）**：啟動應用程式後，點擊網頁右上角的 ⚙️ **設定** 圖示，直接在畫面上貼上 `apiKey` 儲存即可！
   - **方式 B**：直接編輯 `config.js` 檔案，填入您的 `apiKey`。

---

## 💻 本機啟動方式

因為 Google 登入需要執行於 Web 來源（如 `http://localhost:8080`），本專案已附帶即用伺服器：

### 方法一：滑鼠雙擊啟動 (最簡單)
在檔案總管中，直接滑鼠雙擊 `start-server.bat`，即可自動啟動伺服器並在預設瀏覽器中開啟 `http://localhost:8080`！

### 方法二：PowerShell 執行
```powershell
cd "C:\Users\Peter\.gemini\antigravity\scratch\MyToDoList"
.\start-server.ps1
```

### 方法三：VS Code Live Server 或其他伺服器
若您使用 VS Code，可直接透過 Live Server 套件開啟 `index.html`。

---

## 🌐 部署至 Firebase Hosting (選填)

若未來安裝了 Firebase CLI，只需在專案資料夾執行：
```bash
firebase deploy
```
即可將整個應用程式及安全規則發布至全世界可存取的 `https://my-to-do-list-fd68c.web.app`！
