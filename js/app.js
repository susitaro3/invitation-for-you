/**
 * 結婚式Web招待状 メインアプリケーションロジック
 */

// ⚡ 【超高速化】DOMContentLoadedイベントを待たず、スクリプト読み込み直後にバックグラウンドでデータ通信を並行スタート！
const initialToken = (
  new URLSearchParams(window.location.search).get("token") ||
  (window.location.hash ? new URLSearchParams(window.location.hash.substring(1)).get("token") : "") ||
  ""
).trim();

let earlyFetchPromise = null;
if (initialToken && typeof CONFIG !== "undefined" && CONFIG.GAS_WEB_APP_URL && !CONFIG.GAS_WEB_APP_URL.includes("YOUR_GAS_WEB_APP_URL")) {
  const earlyUrl = `${CONFIG.GAS_WEB_APP_URL}?token=${encodeURIComponent(initialToken)}`;
  earlyFetchPromise = fetch(earlyUrl, { method: "GET", credentials: "omit", redirect: "follow" })
    .then((res) => (res.ok ? res.json() : null))
    .catch((err) => null);
}

document.addEventListener("DOMContentLoaded", () => {
  // ブラウザのスクロール位置自動復元を無効化し、常に最上部から表示
  if ("scrollRestoration" in history) {
    history.scrollRestoration = "manual";
  }
  window.scrollTo(0, 0);

  // DOM Elements
  const loadingContainer = document.getElementById("loadingContainer");
  const errorCard = document.getElementById("errorCard");
  const errorMessageText = document.getElementById("errorMessageText");
  const successCard = document.getElementById("successCard");
  const submittedSummaryBox = document.getElementById("submittedSummaryBox");
  const rsvpForm = document.getElementById("rsvpForm");
  const heroSuccessNotice = document.getElementById("heroSuccessNotice");
  const heroPhotoFrame = document.getElementById("heroPhotoFrame");
  const heroEndingFrame = document.getElementById("heroEndingFrame");

  // Sections
  const guestInfoSection = document.getElementById("guestInfoSection");
  const guestMetaFields = document.getElementById("guestMetaFields");
  const contactSection = document.getElementById("contactSection");
  const allergySection = document.getElementById("allergySection");
  const proxySection = document.getElementById("proxySection");
  const predefinedProxyWrapper = document.getElementById("predefinedProxyWrapper");
  const predefinedProxyContainer = document.getElementById("predefinedProxyContainer");

  // Inputs
  const lastNameInput = document.getElementById("lastName");
  const firstNameInput = document.getElementById("firstName");
  const kanaLastNameInput = document.getElementById("kanaLastName");
  const kanaFirstNameInput = document.getElementById("kanaFirstName");
  const ageCategorySelect = document.getElementById("ageCategory");
  const emailInput = document.getElementById("email");
  const phoneInput = document.getElementById("phone");
  const allergiesInput = document.getElementById("allergies");
  const messageInput = document.getElementById("message");

  // Buttons & Modal
  const btnConfirm = document.getElementById("btnConfirm");
  const confirmModal = document.getElementById("confirmModal");
  const modalSummaryList = document.getElementById("modalSummaryList");
  const btnModalBack = document.getElementById("btnModalBack");
  const btnModalSubmit = document.getElementById("btnModalSubmit");
  const btnAddProxy = document.getElementById("btnAddProxy");

  let currentToken = "";
  let guestData = null;
  let predefinedProxiesList = [];

  // 1. 全画面オープニング起動、CONFIG情報でヘッダーテキストを初期化、全画像プリロード & ヒーローフォトギャラリー起動
  initOpeningOverlay();
  initHeaderInfo();
  initHeroSlider();
  preloadGalleryImages();

  // 2. URLパラメータからトークンを取得
  currentToken = initialToken || getTokenFromURL();

  if (!currentToken) {
    showError("招待状URLにトークンが含まれていません。お送りしたURLを再度ご確認ください。");
    return;
  }

  // 3. GAS APIからトークンに紐づく招待客情報を取得
  fetchGuestData(currentToken);

  // --------------------------------------------------------------------------
  // イベントリスナーの登録
  // --------------------------------------------------------------------------

  // 出欠ラジオボタン切り替え
  document.querySelectorAll('input[name="attendance"]').forEach((radio) => {
    radio.addEventListener("change", (e) => {
      toggleAttendanceSections(e.target.value);
    });
  });

  // 同伴者様追加ボタン
  if (btnAddProxy) {
    btnAddProxy.addEventListener("click", handleAddDynamicProxy);
  }

  // 送信内容確認ボタン
  btnConfirm.addEventListener("click", handleConfirmClick);

  // モーダル戻るボタン
  btnModalBack.addEventListener("click", () => {
    confirmModal.classList.remove("active");
  });

  // モーダル送信実行ボタン
  btnModalSubmit.addEventListener("click", handleFormSubmit);


  // ==========================================================================
  // 関数定義
  // ==========================================================================

  /**
   * 全画面オープニング アニメーション (3ステップ・シームレス全画面拡大モーフィング)
   */
  function initOpeningOverlay() {
    const overlay = document.getElementById("openingOverlay");
    const container = document.getElementById("envelopeContainer");
    const btnOpen = document.getElementById("btnOpenInvitation");
    const waxSeal = document.getElementById("waxSeal") || document.querySelector(".wax-seal");
    if (!overlay || !container) return;

    let isOpening = false;

    function openEnvelope(e) {
      if (e) e.stopPropagation();
      if (isOpening) return;
      isOpening = true;

      // 開封処理開始時に最上部へスクロール
      window.scrollTo(0, 0);

      // ステップ1: 封筒フラップが開き、手紙カードが飛び出す (0ms)
      container.classList.add("open");

      // ステップ2: 0.7秒後、手紙カードが全画面へ向けてスムーズに拡大モーフィング (700ms)
      setTimeout(() => {
        container.classList.add("expanding");
      }, 700);

      // ステップ3: 1.8秒後、手紙カードが画面全体を覆った状態でオーバーレイをフェード接続 (1800ms)
      setTimeout(() => {
        overlay.classList.add("closed");
        setTimeout(() => {
          overlay.style.display = "none";
        }, 1200);
        window.scrollTo(0, 0);
      }, 1800);
    }

    // ★ ボタン押下、シーリングワックス、または封筒コンテナ全体のタップで開封アニメーションを起動
    if (btnOpen) btnOpen.addEventListener("click", openEnvelope);
    if (waxSeal) waxSeal.addEventListener("click", openEnvelope);
    container.addEventListener("click", openEnvelope);
  }

  /**
   * ヘッダーの式情報の自動挿入
   */
  function initHeaderInfo() {
    if (typeof CONFIG === "undefined") return;

    if (CONFIG.GROOM_NAME && CONFIG.BRIDE_NAME) {
      const coupleElem = document.getElementById("coupleNamesDisplay");
      if (coupleElem) coupleElem.textContent = `${CONFIG.GROOM_NAME} & ${CONFIG.BRIDE_NAME}`;
      const openingCouple = document.getElementById("openingCoupleDisplay");
      if (openingCouple) openingCouple.textContent = `${CONFIG.GROOM_NAME} & ${CONFIG.BRIDE_NAME}`;
    }
    if (CONFIG.WEDDING_DATE) {
      const dateElem = document.getElementById("weddingDateDisplay");
      if (dateElem) dateElem.textContent = CONFIG.WEDDING_DATE;
      const openingDate = document.getElementById("openingDateDisplay");
      if (openingDate) openingDate.textContent = CONFIG.WEDDING_DATE;
    }
    if (CONFIG.RECEPTION_TIME) {
      const timeElem = document.getElementById("receptionTimeDisplay");
      if (timeElem) timeElem.textContent = CONFIG.RECEPTION_TIME;
    }
    if (CONFIG.VENUE_NAME) {
      const venueElem = document.getElementById("venueNameDisplay");
      if (venueElem) venueElem.textContent = CONFIG.VENUE_NAME;
      const openingVenue = document.getElementById("openingVenueDisplay");
      if (openingVenue) openingVenue.textContent = CONFIG.VENUE_NAME;
    }
    if (CONFIG.VENUE_ADDRESS) {
      const addrElem = document.getElementById("venueAddressDisplay");
      if (addrElem) addrElem.textContent = CONFIG.VENUE_ADDRESS;
      const mapLink = document.getElementById("venueMapLink");
      if (mapLink) {
        const query = encodeURIComponent((CONFIG.VENUE_NAME || "") + " " + CONFIG.VENUE_ADDRESS);
        mapLink.href = CONFIG.VENUE_MAP_URL || `https://www.google.com/maps/search/?api=1&query=${query}`;
      }
    }
    if (CONFIG.VENUE_PHONE) {
      const phoneLink = document.getElementById("venuePhoneLink");
      if (phoneLink) {
        phoneLink.href = `tel:${CONFIG.VENUE_PHONE.replace(/[^0-9+]/g, "")}`;
        phoneLink.textContent = CONFIG.VENUE_PHONE;
      }
    }
    if (CONFIG.RESPONSE_DEADLINE) {
      const deadlineElem = document.getElementById("responseDeadlineDisplay");
      if (deadlineElem) deadlineElem.textContent = `${CONFIG.RESPONSE_DEADLINE} まで`;
    }
  }

  /**
   * 未回答状態の画面表示（3枚スライドショーを表示し、ending.jpgおよび完了通知を隠す）
   */
  function switchToInitialState() {
    if (heroSuccessNotice) heroSuccessNotice.classList.add("hidden");
    if (heroPhotoFrame) heroPhotoFrame.classList.remove("hidden");
    if (heroEndingFrame) heroEndingFrame.classList.add("hidden");
  }

  /**
   * 画面上でフォーム送信が完了した瞬間の画面表示切り替え（スライドショーを隠し、ending.jpgおよび完了通知を表示）
   */
  function switchToCompletedState() {
    if (heroSuccessNotice) heroSuccessNotice.classList.remove("hidden");
    if (heroPhotoFrame) heroPhotoFrame.classList.add("hidden");
    if (heroEndingFrame) heroEndingFrame.classList.remove("hidden");
  }

  /**
   * ヒーローフォトギャラリー（3枚の画像のフェードスライドショー）制御
   */
  function initHeroSlider() {
    const slides = document.querySelectorAll(".hero-slide");
    const dots = document.querySelectorAll(".slider-dots .dot");
    if (!slides || slides.length === 0) return;

    let currentSlide = 0;
    let slideTimer = null;

    function goToSlide(index) {
      slides.forEach((slide, i) => {
        if (i === index) {
          slide.classList.add("active");
        } else {
          slide.classList.remove("active");
        }
      });
      dots.forEach((dot, i) => {
        if (i === index) {
          dot.classList.add("active");
        } else {
          dot.classList.remove("active");
        }
      });
      currentSlide = index;
    }

    function nextSlide() {
      const nextIndex = (currentSlide + 1) % slides.length;
      goToSlide(nextIndex);
    }

    function startTimer() {
      stopTimer();
      slideTimer = setInterval(nextSlide, 4500); // 4.5秒ごとに自動切替
    }

    function stopTimer() {
      if (slideTimer) clearInterval(slideTimer);
    }

    dots.forEach((dot) => {
      dot.addEventListener("click", (e) => {
        const index = parseInt(e.target.getAttribute("data-index"), 10);
        if (!isNaN(index)) {
          goToSlide(index);
          startTimer();
        }
      });
    });

    startTimer();
  }

  /**
   * ギャラリー全画像およびお礼画像の全画面バックグラウンド・プリロード関数
   */
  function preloadGalleryImages() {
    const imagesToPreload = [
      "images/FJI_6409.jpg",
      "images/FJI_6424.jpg",
      "images/FJI_6456.jpg",
      "images/ending.jpg",
      "images/wax-seal.svg",
      "images/wedding-icon.svg"
    ];
    imagesToPreload.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }

  /**
   * URLからトークンを取得 (クエリパラメータ `?token=xxx` または ハッシュ `#token=xxx`)
   */
  function getTokenFromURL() {
    const searchParams = new URLSearchParams(window.location.search);
    let token = searchParams.get("token");

    if (!token && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      token = hashParams.get("token");
    }

    return token ? token.trim() : "";
  }

  /**
   * JSONPリクエストヘルパー (CORS回避用)
   */
  function fetchJSONP(url) {
    return new Promise((resolve, reject) => {
      const callbackName = "gasCallback_" + Math.round(1000000 * Math.random());
      const script = document.createElement("script");
      const separator = url.includes("?") ? "&" : "?";

      window[callbackName] = (data) => {
        delete window[callbackName];
        if (script.parentNode) script.parentNode.removeChild(script);
        resolve(data);
      };

      script.src = `${url}${separator}callback=${callbackName}`;
      script.onerror = () => {
        delete window[callbackName];
        if (script.parentNode) script.parentNode.removeChild(script);
        reject(new Error("JSONP Script Load Error"));
      };

      document.body.appendChild(script);
    });
  }

  /**
   * タイムアウト保護付き fetch ヘルパー関数
   */
  async function fetchWithTimeout(url, timeoutMs = 3000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { method: "GET", credentials: "omit", redirect: "follow", signal: controller.signal });
      clearTimeout(timer);
      if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
      return await response.json();
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  }

  /**
   * GAS APIよりデータ取得 (並行通信Promise / fetch & JSONPフォールバック)
   */
  async function fetchGuestData(token) {
    if (!CONFIG || !CONFIG.GAS_WEB_APP_URL || CONFIG.GAS_WEB_APP_URL.includes("YOUR_GAS_WEB_APP_URL")) {
      showError("設定ファイル (js/config.js) に GAS の Web App URL が設定されていません。管理者にお問い合わせください。");
      return;
    }

    let result = null;

    // 1. ⚡ スクリプト読み込み直後にバックグラウンドで開始された早割り通信Promise結果を優先活用！
    if (earlyFetchPromise) {
      try {
        result = await earlyFetchPromise;
      } catch (e) {
        result = null;
      }
    }

    // 2. 早割り通信で取得できなかった場合は標準 fetch (4秒タイムアウト保護付き) を試行
    if (!result) {
      const baseUrl = `${CONFIG.GAS_WEB_APP_URL}?token=${encodeURIComponent(token)}`;
      try {
        result = await fetchWithTimeout(baseUrl, 4000);
      } catch (e) {
        console.warn("Standard fetch failed or timed out (CORS block), trying JSONP fallback...", e);
      }
    }

    // 3. それでも取得できない場合は JSONP でフォールバック試行
    if (!result) {
      try {
        result = await fetchJSONP(`${CONFIG.GAS_WEB_APP_URL}?token=${encodeURIComponent(token)}`);
      } catch (jsonpErr) {
        console.error("JSONP fetch error:", jsonpErr);
        showError(
          "通信エラーが発生しました。\n" +
          "Google Apps Scriptのデプロイ設定で「アクセスできるユーザー」が「全員 (Anyone)」になっているか、新しいバージョンでデプロイされているかご確認ください。"
        );
        return;
      }
    }

    if (!result || !result.success) {
      showError((result && result.error) ? result.error : "データ取得に失敗しました。無効なトークンです。");
      return;
    }

    guestData = result.data.guest;
    predefinedProxiesList = result.data.predefinedProxies || [];
    const existingResponse = result.data.existingResponse;

    // 取得したスプレッドシートデータでフォームを初期化
    populateForm(guestData, predefinedProxiesList, existingResponse);

    // 画面表示切り替え
    loadingContainer.classList.add("hidden");
    rsvpForm.classList.remove("hidden");
  }

  /**
   * 同伴者様の動的追加処理 (一意なProxyIdの自動採番)
   */
  function handleAddDynamicProxy() {
    // 一意なProxyIdを自動生成 (タイムスタンプ + 乱数)
    const uniqueProxyId = "proxy_dyn_" + Date.now() + "_" + Math.floor(Math.random() * 1000);

    const newProxyObj = {
      proxyId: uniqueProxyId,
      token: currentToken,
      lastName: "",
      firstName: "",
      kanaLastName: "",
      kanaFirstName: "",
      side: (guestData && guestData.side) ? guestData.side : "新郎側",
      ageCategory: "大人",
      status: "出席",
      allergies: "",
      sameAddress: true
    };

    const card = renderPredefinedProxyAccordionCard(newProxyObj);
    predefinedProxyWrapper.classList.remove("hidden");

    if (card) {
      card.classList.add("open");
      const lastNameIn = card.querySelector(".proxy-last-name");
      if (lastNameIn) {
        lastNameIn.focus();
      }
    }
  }

  /**
   * フォームへのデータ反映・初期描画
   */
  function populateForm(guest, proxies, existingResp) {
    // 招待客区分に応じた挨拶文の切り替え
    const invitationTextElem = document.getElementById("invitationText");
    if (invitationTextElem) {
      const cat = (guest && guest.guestCategory ? guest.guestCategory : "-").trim();
      if (cat === "受付") {
        invitationTextElem.innerHTML =
          "皆様におかれましては ますますご清祥のこととお慶び申し上げます<br>" +
          "このたび 私たちは結婚式を挙げることとなりました<br>" +
          "日頃お世話になっております皆様をお招きして<br>" +
          "ささやかな宴を催したく存じます<br>" +
          "ご多用中　大変恐縮ですが<br>" +
          "私共の受付係をお願いしたく　当日はお支度完了の上　12時30分までに　お越しくださいますようお願い申し上げます";
      } else if (cat === "親族") {
        invitationTextElem.innerHTML =
          "皆様におかれましては ますますご清祥のこととお慶び申し上げます<br>" +
          "このたび 私たちは結婚式を挙げることとなりました<br>" +
          "日頃お世話になっております皆様をお招きして<br>" +
          "ささやかな宴を催したく存じます<br>" +
          "ご多用中　恐縮でございますが<br>" +
          "親族様におかれましては　親族紹介にご参加賜りたく<br>" +
          "当日はお支度完了の上　12時30分までにお越しいただきますよう　お願い申し上げます";
      } else {
        // デフォルト (-)
        invitationTextElem.innerHTML =
          "皆様におかれましては ますますご清祥のこととお慶び申し上げます<br>" +
          "このたび 私たちは結婚式を挙げることとなりました<br>" +
          "日頃お世話になっております皆様をお招きして<br>" +
          "ささやかな宴を催したく存じます<br>" +
          "ご多用中　大変恐縮ですが<br>" +
          "挙式にもご参列賜りたく　当日は　午後1時までにお越しくださいますようお願い申し上げます";
      }
    }

    // 氏名・フリガナ (Tokensシートの事前定義値)
    lastNameInput.value = guest.lastName || "";
    firstNameInput.value = guest.firstName || "";
    kanaLastNameInput.value = guest.kanaLastName || "";
    kanaFirstNameInput.value = guest.kanaFirstName || "";

    // 新郎側/新婦側
    const sideValue = guest.side || "新郎側";
    const sideRadio = document.querySelector(`input[name="side"][value="${sideValue}"]`);
    if (sideRadio) sideRadio.checked = true;

    // 年齢区分
    if (guest.ageCategory) {
      ageCategorySelect.value = guest.ageCategory;
    }

    // メールアドレス (事前設定があれば)
    if (guest.email) {
      emailInput.value = guest.email;
    }

    if (guest.phone) phoneInput.value = formatPhoneNumber(guest.phone);

    // 事前定義代理出席者アコーディオンカード群の生成 (PredefinedProxiesシート)
    if (proxies && proxies.length > 0) {
      predefinedProxyContainer.innerHTML = "";
      proxies.forEach((proxy) => {
        renderPredefinedProxyAccordionCard(proxy);
      });
      predefinedProxyWrapper.classList.remove("hidden");
    } else {
      predefinedProxyWrapper.classList.add("hidden");
    }

    // 初期画面表示: 過去回答データの有無に関わらず、初期読み込み時は常にスライドショーを表示！ (ending.jpgは送信完了時のみ)
    switchToInitialState();

    // もし過去の回答データが存在する場合、フォームに値を復元セット
    if (existingResp) {
      if (existingResp.attendance) {
        const attendanceRadio = document.querySelector(`input[name="attendance"][value="${existingResp.attendance}"]`);
        if (attendanceRadio) {
          attendanceRadio.checked = true;
          toggleAttendanceSections(existingResp.attendance);
        }
      }

      if (existingResp.lastName) lastNameInput.value = existingResp.lastName;
      if (existingResp.firstName) firstNameInput.value = existingResp.firstName;
      if (existingResp.kanaLastName) kanaLastNameInput.value = existingResp.kanaLastName;
      if (existingResp.kanaFirstName) kanaFirstNameInput.value = existingResp.kanaFirstName;
      if (existingResp.email) emailInput.value = existingResp.email;
      if (existingResp.phone) phoneInput.value = formatPhoneNumber(existingResp.phone);
      if (existingResp.allergies) allergiesInput.value = existingResp.allergies;
      if (existingResp.message) messageInput.value = existingResp.message;

      // 事前定義代理出席者の復元 (ProxyId または 名前による照合)
      if (existingResp.predefinedProxiesResponse) {
        restorePredefinedProxiesResponse(existingResp.predefinedProxiesResponse);
      }
    } else {
      toggleAttendanceSections("出席");
    }
  }

  /**
   * 事前定義および新規動的代理出席者の編集用アコーディオンカード描画関数
   */
  function renderPredefinedProxyAccordionCard(proxy) {
    const isInitiallyAttending = proxy.status !== "欠席";

    const card = document.createElement("div");
    card.className = "accordion-card";
    card.setAttribute("data-proxy-id", proxy.proxyId || "");

    const proxyName = `${proxy.lastName || ""} ${proxy.firstName || ""}`.trim();
    const ageCategory = proxy.ageCategory || "大人";

    card.innerHTML = `
      <div class="accordion-header">
        <div class="accordion-title-group">
          <input type="checkbox" class="accordion-checkbox proxy-attend-cb" id="cb_${proxy.proxyId}" ${isInitiallyAttending ? "checked" : ""}>
          <span class="accordion-title">${escapeHtml(proxyName || "新規同伴者様")}（${escapeHtml(ageCategory)}）</span>
          <span class="accordion-badge">タップして詳細を修正</span>
        </div>
        <span class="accordion-toggle-icon">▼</span>
      </div>
      <div class="accordion-body">
        <div class="input-row">
          <div class="form-group">
            <label class="form-label">姓 <span class="required-badge">必須</span></label>
            <input type="text" class="proxy-last-name" value="${escapeHtml(proxy.lastName || "")}">
          </div>
          <div class="form-group">
            <label class="form-label">名 <span class="required-badge">必須</span></label>
            <input type="text" class="proxy-first-name" value="${escapeHtml(proxy.firstName || "")}">
          </div>
        </div>
        <div class="input-row">
          <div class="form-group">
            <label class="form-label">せい（よみがな） <span class="required-badge">必須</span></label>
            <input type="text" class="proxy-kana-last" value="${escapeHtml(proxy.kanaLastName || "")}">
          </div>
          <div class="form-group">
            <label class="form-label">めい（よみがな） <span class="required-badge">必須</span></label>
            <input type="text" class="proxy-kana-first" value="${escapeHtml(proxy.kanaFirstName || "")}">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">年齢区分</label>
          <select class="proxy-age-category">
            <option value="大人" ${ageCategory === "大人" ? "selected" : ""}>大人</option>
            <option value="子供" ${ageCategory === "子供" ? "selected" : ""}>子供（小学生以下）</option>
            <option value="幼児" ${ageCategory === "幼児" ? "selected" : ""}>幼児（座席・食事なし）</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">アレルギー・食事制限（任意）</label>
          <input type="text" class="proxy-allergies" value="${escapeHtml(proxy.allergies || "")}" placeholder="例: えびアレルギー など">
        </div>

        <!-- 同伴者様の削除ボタン -->
        <div class="accordion-actions">
          <button type="button" class="btn-delete-proxy">この同伴者様を削除</button>
        </div>
      </div>
    `;

    // DOM参照
    const header = card.querySelector(".accordion-header");
    const cb = card.querySelector(".proxy-attend-cb");
    const title = card.querySelector(".accordion-title");
    const lastNameIn = card.querySelector(".proxy-last-name");
    const firstNameIn = card.querySelector(".proxy-first-name");
    const ageSelect = card.querySelector(".proxy-age-category");
    const deleteBtn = card.querySelector(".btn-delete-proxy");

    // ヘッダータイトル更新
    const updateTitle = () => {
      const ln = lastNameIn.value.trim();
      const fn = firstNameIn.value.trim();
      const age = ageSelect.value;
      const isAttending = cb.checked;
      const displayName = (ln || fn) ? `${ln} ${fn}` : "同伴者名未入力";

      if (isAttending) {
        title.textContent = `${displayName} 様（${age}）`;
        card.style.opacity = "1";
      } else {
        title.textContent = `${displayName} 様（ご欠席）`;
        card.style.opacity = "0.7";
      }
    };

    // 削除ボタンイベント
    if (deleteBtn) {
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const displayName = (lastNameIn.value.trim() || firstNameIn.value.trim()) ? `${lastNameIn.value.trim()} ${firstNameIn.value.trim()}`.trim() : "同伴者様";
        if (confirm(`${displayName} を削除してもよろしいですか？`)) {
          card.remove();
          const remainingCards = predefinedProxyContainer.querySelectorAll(".accordion-card");
          if (remainingCards.length === 0) {
            predefinedProxyWrapper.classList.add("hidden");
          }
        }
      });
    }

    // チェックボックスイベント
    cb.addEventListener("change", (e) => {
      e.stopPropagation();
      updateTitle();
      if (cb.checked) {
        card.classList.add("open");
      } else {
        card.classList.remove("open");
      }
    });

    cb.addEventListener("click", (e) => {
      e.stopPropagation();
    });

    // アコーディオン開閉
    header.addEventListener("click", () => {
      card.classList.toggle("open");
    });

    // リアルタイム編集イベント
    lastNameIn.addEventListener("input", updateTitle);
    firstNameIn.addEventListener("input", updateTitle);
    ageSelect.addEventListener("change", updateTitle);

    updateTitle();
    predefinedProxyContainer.appendChild(card);
    return card;
  }

  /**
   * 画面上の全事前定義代理出席者の編集データを抽出する関数
   */
  function getPredefinedProxiesData() {
    const cards = predefinedProxyContainer.querySelectorAll(".accordion-card");
    const result = [];

    cards.forEach((card) => {
      const proxyId = card.getAttribute("data-proxy-id");
      const cb = card.querySelector(".proxy-attend-cb");
      const isAttending = cb ? cb.checked : false;

      const ln = card.querySelector(".proxy-last-name").value.trim();
      const fn = card.querySelector(".proxy-first-name").value.trim();
      const kln = card.querySelector(".proxy-kana-last").value.trim();
      const kfn = card.querySelector(".proxy-kana-first").value.trim();
      const age = card.querySelector(".proxy-age-category").value;
      const alg = card.querySelector(".proxy-allergies").value.trim();

      result.push({
        proxyId: proxyId,
        attending: isAttending,
        lastName: ln,
        firstName: fn,
        kanaLastName: kln,
        kanaFirstName: kfn,
        ageCategory: age,
        allergies: alg,
        fullName: `${ln} ${fn}`.trim()
      });
    });

    return result;
  }

  /**
   * 過去の事前定義代理出席者回答の復元処理
   */
  function restorePredefinedProxiesResponse(rawResp) {
    if (!rawResp) return;
    try {
      let parsed = rawResp;
      if (typeof rawResp === "string") {
        try {
          parsed = JSON.parse(rawResp);
        } catch (jsonErr) {
          return;
        }
      }

      if (Array.isArray(parsed)) {
        parsed.forEach((item) => {
          let card = null;
          if (item.proxyId) {
            card = predefinedProxyContainer.querySelector(`.accordion-card[data-proxy-id="${item.proxyId}"]`);
          }

          if (card) {
            const cb = card.querySelector(".proxy-attend-cb");
            if (cb) cb.checked = item.attending !== false;

            if (item.lastName) card.querySelector(".proxy-last-name").value = item.lastName;
            if (item.firstName) card.querySelector(".proxy-first-name").value = item.firstName;
            if (item.kanaLastName) card.querySelector(".proxy-kana-last").value = item.kanaLastName;
            if (item.kanaFirstName) card.querySelector(".proxy-kana-first").value = item.kanaFirstName;
            if (item.ageCategory) card.querySelector(".proxy-age-category").value = item.ageCategory;
            if (item.allergies) card.querySelector(".proxy-allergies").value = item.allergies;

            // タイトル更新発火
            card.querySelector(".proxy-last-name").dispatchEvent(new Event("input"));
          }
        });
      }
    } catch (e) {
      console.warn("Could not parse predefinedProxiesResponse for restoration:", e);
    }
  }

  /**
   * 出欠選択に応じたセクションの表示/非表示切り替え
   */
  function toggleAttendanceSections(attendance) {
    if (attendance === "欠席") {
      contactSection.classList.add("hidden");
      allergySection.classList.add("hidden");
      proxySection.classList.add("hidden");
      guestMetaFields.classList.add("hidden");

      // 主出席者が「欠席」の場合、同伴者カードの出欠チェックをすべてOFFにする
      const cards = predefinedProxyContainer.querySelectorAll(".accordion-card");
      cards.forEach((card) => {
        const cb = card.querySelector(".proxy-attend-cb");
        if (cb) {
          cb.checked = false;
          cb.dispatchEvent(new Event("change"));
        }
      });
    } else {
      contactSection.classList.remove("hidden");
      allergySection.classList.remove("hidden");
      proxySection.classList.remove("hidden");
      guestMetaFields.classList.remove("hidden");
    }
  }

  /**
   * 確認ボタンクリック時処理
   */
  function handleConfirmClick() {
    const selectedAttendance = document.querySelector('input[name="attendance"]:checked');
    if (!selectedAttendance) {
      alert("ご出欠（ご出席 / ご欠席）を選択してください。");
      return;
    }

    const attendance = selectedAttendance.value;

    // 氏名・フリガナバリデーション
    if (!lastNameInput.value.trim() || !firstNameInput.value.trim()) {
      alert("お名前（姓・名）を入力してください。");
      return;
    }
    if (!kanaLastNameInput.value.trim() || !kanaFirstNameInput.value.trim()) {
      alert("お名前のふりがな（せい・めい）を入力してください。");
      return;
    }

    // 出席時の必須項目バリデーション
    if (attendance === "出席") {
      if (!emailInput.value.trim() || !validateEmail(emailInput.value.trim())) {
        alert("有効なメールアドレスをご入力ください。");
        emailInput.focus();
        return;
      }
      if (!phoneInput.value.trim() || !validatePhone(phoneInput.value.trim())) {
        alert("有効なお電話番号をご入力ください（例: 09012345678 または 090-1234-5678）。");
        phoneInput.focus();
        return;
      }

      // 出席フラグがオンの代理出席者カードの入力チェック
      const cards = predefinedProxyContainer.querySelectorAll(".accordion-card");
      for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        const cb = card.querySelector(".proxy-attend-cb");
        if (cb && cb.checked) {
          const ln = card.querySelector(".proxy-last-name").value.trim();
          const fn = card.querySelector(".proxy-first-name").value.trim();
          const kln = card.querySelector(".proxy-kana-last").value.trim();
          const kfn = card.querySelector(".proxy-kana-first").value.trim();
          if (!ln || !fn) {
            alert(`ご出席される同伴者様のお名前（姓・名）をご入力ください。`);
            card.classList.add("open");
            card.querySelector(!ln ? ".proxy-last-name" : ".proxy-first-name").focus();
            return;
          }
          if (!kln || !kfn) {
            alert(`ご出席される同伴者様のお名前のよみがな（せい・めい）をご入力ください。`);
            card.classList.add("open");
            card.querySelector(!kln ? ".proxy-kana-last" : ".proxy-kana-first").focus();
            return;
          }
        }
      }
    }

    // 送信確認モーダルの概要リスト構築
    buildModalSummary(attendance);
    confirmModal.classList.add("active");
  }

  /**
   * モーダル用確認サマリーのHTML構築
   */
  function buildModalSummary(attendance) {
    const selectedSide = document.querySelector('input[name="side"]:checked');
    const sideValue = selectedSide ? selectedSide.value : "未選択";

    let html = `
      <div class="summary-item">
        <span class="summary-label">ご出欠</span>
        <span class="summary-value" style="font-weight: bold; color: var(--primary-color);">${escapeHtml(attendance)}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">お名前</span>
        <span class="summary-value">${escapeHtml(lastNameInput.value.trim())} ${escapeHtml(firstNameInput.value.trim())} （${escapeHtml(kanaLastNameInput.value.trim())} ${escapeHtml(kanaFirstNameInput.value.trim())}）</span>
      </div>
    `;

    if (attendance === "出席") {
      html += `
        <div class="summary-item">
          <span class="summary-label">ご区分</span>
          <span class="summary-value">${escapeHtml(sideValue)} / ${escapeHtml(ageCategorySelect.value)}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">メールアドレス</span>
          <span class="summary-value">${escapeHtml(emailInput.value.trim())}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">電話番号</span>
          <span class="summary-value">${escapeHtml(phoneInput.value.trim())}</span>
        </div>
      `;

      if (allergiesInput.value.trim()) {
        html += `
          <div class="summary-item">
            <span class="summary-label">アレルギー等</span>
            <span class="summary-value">${escapeHtml(allergiesInput.value.trim())}</span>
          </div>
        `;
      }

      // 事前定義代理出席者の編集後状態
      const proxiesData = getPredefinedProxiesData();
      if (proxiesData.length > 0) {
        const proxySummaryText = proxiesData.map(p => {
          if (!p.attending) {
            return `<span style="color:#888;">${escapeHtml(p.fullName)} 様（ご欠席）</span>`;
          }
          let str = `${escapeHtml(p.fullName)} 様（${escapeHtml(p.ageCategory)}）`;
          if (p.allergies) str += ` [アレルギー: ${escapeHtml(p.allergies)}]`;
          return str;
        }).join("<br>");

        html += `
          <div class="summary-item">
            <span class="summary-label">同伴者様</span>
            <span class="summary-value">${proxySummaryText}</span>
          </div>
        `;
      }
    }

    if (messageInput.value.trim()) {
      html += `
        <div class="summary-item">
          <span class="summary-label">メッセージ</span>
          <span class="summary-value">${escapeHtml(messageInput.value.trim())}</span>
        </div>
      `;
    }

    modalSummaryList.innerHTML = html;
  }

  /**
   * フォーム送信処理 (GAS doPostへデータ送信)
   */
  async function handleFormSubmit() {
    btnModalSubmit.disabled = true;
    btnModalSubmit.textContent = "送信中...";

    const selectedAttendance = document.querySelector('input[name="attendance"]:checked').value;
    const selectedSide = document.querySelector('input[name="side"]:checked');

    // 事前定義代理出席者の編集後データのリスト (ProxyId & 住所情報付き)
    const proxiesData = getPredefinedProxiesData();

    const payload = {
      token: currentToken,
      attendance: selectedAttendance,
      lastName: lastNameInput.value.trim(),
      firstName: firstNameInput.value.trim(),
      kanaLastName: kanaLastNameInput.value.trim(),
      kanaFirstName: kanaFirstNameInput.value.trim(),
      side: selectedSide ? selectedSide.value : "新郎側",
      ageCategory: ageCategorySelect.value,
      email: emailInput.value.trim(),
      phone: phoneInput.value.trim(),
      allergies: allergiesInput.value.trim(),
      predefinedProxiesResponse: proxiesData,
      additionalProxies: "",
      message: messageInput.value.trim()
    };

    try {
      // タイムアウト保護付き fetch (15秒)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(CONFIG.GAS_WEB_APP_URL, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify(payload),
        credentials: "omit",
        redirect: "follow",
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      let result = null;
      try {
        result = await response.json();
      } catch (jsonErr) {
        console.warn("Could not parse JSON response from GAS, assuming success if HTTP 200:", jsonErr);
        if (response.ok) {
          result = { success: true };
        }
      }

      if (result && result.success !== false) {
        confirmModal.classList.remove("active");
        rsvpForm.classList.add("hidden");

        // 🚀 ★【改修点】画面上で実際にフォーム送信ボタンが押された瞬間のみ switchToCompletedState() を実行！
        switchToCompletedState();

        // 完了画面へ切り替え
        submittedSummaryBox.innerHTML = modalSummaryList.innerHTML;
        successCard.classList.remove("hidden");
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        alert("送信中にエラーが発生しました: " + (result ? result.error : "詳細不明"));
        btnModalSubmit.disabled = false;
        btnModalSubmit.textContent = "送信する";
      }
    } catch (err) {
      console.error("Submit error:", err);
      if (err.name === "AbortError") {
        console.warn("Fetch timed out, but POST request reached GAS. Transitioning to success view...");
        confirmModal.classList.remove("active");
        rsvpForm.classList.add("hidden");

        switchToCompletedState();

        submittedSummaryBox.innerHTML = modalSummaryList.innerHTML;
        successCard.classList.remove("hidden");
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        alert("送信処理中にエラーが発生いたしました。通信環境をご確認のうえ再度お試しください。");
        btnModalSubmit.disabled = false;
        btnModalSubmit.textContent = "送信する";
      }
    }
  }

  /**
   * エラー画面の表示
   */
  function showError(msg) {
    loadingContainer.classList.add("hidden");
    rsvpForm.classList.add("hidden");
    errorMessageText.innerHTML = msg.replace(/\n/g, "<br>");
    errorCard.classList.remove("hidden");
  }

  /**
   * メールアドレス形式検証
   */
  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  /**
   * 電話番号形式検証 (ハイフンあり/なし両対応, 10桁または11桁)
   */
  function validatePhone(phone) {
    if (!phone) return false;
    const cleaned = phone.replace(/[-\s]/g, "");
    return /^0\d{9,10}$/.test(cleaned);
  }

  /**
   * HTMLエスケープヘルパー
   */
  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /**
   * iOS LINE内蔵ブラウザ判定ヘルパー
   */
  function isIosLineBrowser() {
    const ua = navigator.userAgent || "";
    return /iPhone|iPad|iPod/i.test(ua) && /Line/i.test(ua);
  }

  /**
   * Googleカレンダー追加リンク生成
   */
  function handleGoogleCalendarClick() {
    if (typeof CONFIG === "undefined") return;
    const title = encodeURIComponent(`${CONFIG.GROOM_NAME || "新郎"} & ${CONFIG.BRIDE_NAME || "新婦"} 結婚式・披露宴`);

    function toUtcIso(isoStr) {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return "20270211T040000Z";
      return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    }

    const start = toUtcIso(CONFIG.EVENT_START || "2027-02-11T13:00:00+09:00");
    const end = toUtcIso(CONFIG.EVENT_END || "2027-02-11T17:00:00+09:00");
    const details = encodeURIComponent(`【結婚式のご案内】\n日時: ${CONFIG.WEDDING_DATE} ${CONFIG.RECEPTION_TIME}\n場所: ${CONFIG.VENUE_NAME}\n住所: ${CONFIG.VENUE_ADDRESS}`);
    const location = encodeURIComponent(`${CONFIG.VENUE_NAME} ${CONFIG.VENUE_ADDRESS}`);

    const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${location}`;

    // iOS LINE内蔵ブラウザの場合は LINE公式スキームで Safari へ受け渡し (ブロック回避)
    if (isIosLineBrowser()) {
      window.location.href = `https://line.me/R/app/browser/open?url=${encodeURIComponent(gcalUrl)}`;
    } else {
      window.open(gcalUrl, "_blank");
    }
  }

  /**
   * Apple / Outlook カレンダー (.ics) ファイルダウンロード (iOS LINE内蔵ブラウザ完全対応)
   */
  function handleAppleCalendarClick() {
    if (typeof CONFIG !== "undefined" && CONFIG.GAS_WEB_APP_URL && !CONFIG.GAS_WEB_APP_URL.includes("YOUR_SCRIPT_ID")) {
      const icsUrl = `${CONFIG.GAS_WEB_APP_URL}?action=ics`;

      // iOS LINE内蔵ブラウザの場合は LINE公式スキームで Safari へ受け渡して標準カレンダー起動
      if (isIosLineBrowser()) {
        window.location.href = `https://line.me/R/app/browser/open?url=${encodeURIComponent(icsUrl)}`;
      } else {
        window.location.href = icsUrl;
      }
      return;
    }

    // フォールバック: クライアントサイド Blob 生成
    const title = `${CONFIG.GROOM_NAME || "新郎"} & ${CONFIG.BRIDE_NAME || "新婦"} 結婚式・披露宴`;
    const start = CONFIG.EVENT_START || "2027-02-11T13:00:00+09:00";
    const end = CONFIG.EVENT_END || "2027-02-11T17:00:00+09:00";
    const venue = CONFIG.VENUE_NAME || "";
    const address = CONFIG.VENUE_ADDRESS || "";
    const details = `【結婚式のご案内】\\n日時: ${CONFIG.WEDDING_DATE} ${CONFIG.RECEPTION_TIME}\\n場所: ${venue}\\n住所: ${address}`;

    function formatIcsDate(isoStr) {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return "20270211T040000Z";
      return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    }

    const startStr = formatIcsDate(start);
    const endStr = formatIcsDate(end);
    const nowStr = formatIcsDate(new Date().toISOString());

    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Wedding Invitation//JA",
      "BEGIN:VEVENT",
      `UID:wedding-${Date.now()}@invitation`,
      `DTSTAMP:${nowStr}`,
      `DTSTART:${startStr}`,
      `DTEND:${endStr}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${details}`,
      `LOCATION:${venue} ${address}`,
      "END:VEVENT",
      "END:VCALENDAR"
    ].join("\r\n");

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "wedding-invitation.ics";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }
});
