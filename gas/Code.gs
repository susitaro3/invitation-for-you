/**
 * 結婚式Web招待状 Google Apps Script (GAS) バックエンド処理
 *
 * 【スプレッドシートの構造】
 * 1. シート名: "Tokens" （招待主ゲストデータ）
 *    列構成: A:Token, B:LastName, C:FirstName, D:KanaLastName, E:KanaFirstName, F:Side, G:AgeCategory, H:Email, I:Status, J:PostalCode, K:Address, L:Building, M:Phone
 *
 * 2. シート名: "PredefinedProxies" （事前定義代理出席者テーブル）
 *    列構成: A:ProxyId, B:Token, C:LastName, D:FirstName, E:KanaLastName, F:KanaFirstName, G:Side, H:AgeCategory, I:Email, J:Status, K:Allergies, L:SameAddress, M:PostalCode, N:Address, O:Building, P:Phone
 *
 * 3. シート名: "Responses" （回答履歴データ保存用）
 *    列構成: A:Timestamp, B:Token, C:Attendance, D:LastName, E:FirstName, F:KanaLastName, G:KanaFirstName, H:Side, I:AgeCategory, J:Email, K:PostalCode, L:Address, M:Building, N:Phone, O:Allergies, P:PredefinedProxiesResponse, Q:AdditionalProxies, R:Message
 */

/**
 * 🚀 スプレッドシート自動初期化・シート生成関数
 */
function createWeddingSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Tokens シートの生成・初期化
  var tokensSheet = ss.getSheetByName('Tokens') || ss.getSheetByName('tokens');
  if (!tokensSheet) {
    tokensSheet = ss.insertSheet('Tokens');
  } else {
    tokensSheet.clear();
  }
  var tokensHeaders = [
    'Token', 'LastName', 'FirstName', 'KanaLastName', 'KanaFirstName',
    'Side', 'AgeCategory', 'Email', 'Status', 'Phone', 'GuestCategory'
  ];
  tokensSheet.appendRow(tokensHeaders);
  formatHeaderRow(tokensSheet, tokensHeaders.length, '#3a506b');

  // サンプル主ゲストデータ
  tokensSheet.appendRow([
    'sample-guest-01', '山田', '太郎', 'やまだ', 'たろう',
    '新郎側', '大人', 'yamada@example.com', '未回答', '09012345678', '-'
  ]);
  tokensSheet.appendRow([
    'sample-guest-reception', '鈴木', '一郎', 'すずき', 'いちろう',
    '新郎側', '大人', 'suzuki@example.com', '未回答', '09087654321', '受付'
  ]);
  tokensSheet.appendRow([
    'sample-guest-relative', '高橋', '次郎', 'たかはし', 'じろう',
    '新婦側', '大人', 'takahashi@example.com', '未回答', '09011112222', '親族'
  ]);

  // 2. PredefinedProxies シートの生成・初期化
  var proxySheet = ss.getSheetByName('PredefinedProxies') || ss.getSheetByName('predefinedproxies');
  if (!proxySheet) {
    proxySheet = ss.insertSheet('PredefinedProxies');
  } else {
    proxySheet.clear();
  }
  var proxyHeaders = [
    'ProxyId', 'Token', 'LastName', 'FirstName', 'KanaLastName', 'KanaFirstName',
    'Side', 'AgeCategory', 'Email', 'Status', 'Allergies', 'Phone'
  ];
  proxySheet.appendRow(proxyHeaders);
  formatHeaderRow(proxySheet, proxyHeaders.length, '#5bc0be');

  // サンプル事前定義代理出席者データ
  proxySheet.appendRow([
    'proxy-sample-01', 'sample-guest-01', '山田', '花子', 'やまだ', 'はなこ',
    '新郎側', '大人', 'hanako@example.com', '未回答', '', ''
  ]);
  proxySheet.appendRow([
    'proxy-sample-02', 'sample-guest-01', '山田', '一郎', 'やまだ', 'いちろう',
    '新郎側', '子供', '', '未回答', '', ''
  ]);
  proxySheet.appendRow([
    'proxy-relative-01', 'sample-guest-relative', '高橋', '美子', 'たかはし', 'よしこ',
    '新婦側', '大人', 'yoshiko@example.com', '未回答', '卵アレルギー', ''
  ]);

  // 3. Responses シートの生成・初期化
  var responseSheet = ss.getSheetByName('Responses') || ss.getSheetByName('responses');
  if (!responseSheet) {
    responseSheet = ss.insertSheet('Responses');
  } else {
    responseSheet.clear();
  }
  var responseHeaders = [
    'Timestamp', 'Token', 'Attendance', 'LastName', 'FirstName',
    'KanaLastName', 'KanaFirstName', 'Side', 'AgeCategory', 'Email',
    'Phone', 'Allergies', 'PredefinedProxiesResponse', 'AdditionalProxies', 'Message'
  ];
  responseSheet.appendRow(responseHeaders);
  formatHeaderRow(responseSheet, responseHeaders.length, '#6fffe9');

  // 不要なデフォルトシートの削除
  var defaultSheet = ss.getSheetByName('シート1') || ss.getSheetByName('Sheet1');
  if (defaultSheet && ss.getSheets().length > 1) {
    try {
      ss.deleteSheet(defaultSheet);
    } catch (e) {
      // 無視
    }
  }

  Logger.log('スプレッドシートの生成と初期化が完了いたしました。');
}

/**
 * 📧 メール送信機能のテスト・承認用関数 (MailApp.sendEmail 利用)
 */
function testSendEmail() {
  var sendto = '';
  try {
    sendto = Session.getEffectiveUser().getEmail();
  } catch (e) {
    sendto = '';
  }

  var ui;
  try {
    ui = SpreadsheetApp.getUi();
  } catch (e2) {
    ui = null;
  }

  if (ui) {
    try {
      var promptResult = ui.prompt(
        'テストメール送信',
        'テストメールの送信先アドレスを入力してください（ご自身のメールアドレス）:',
        ui.ButtonSet.OK_CANCEL
      );

      if (promptResult.getSelectedButton() === ui.Button.OK) {
        var inputEmail = promptResult.getResponseText().trim();
        if (inputEmail) {
          sendto = inputEmail;
        }
      } else {
        return; // キャンセルされた場合
      }
    } catch (e3) {
      // UIが利用できない環境
    }
  }

  if (!sendto) {
    sendto = 'yamada@example.com';
  }

  var title = '【送信テスト】結婚式招待状 メール機能テスト';
  var body = 'これは結婚式Web招待状の自動返信メール送信機能のテストです。\nこのメールが届いていれば、GASのメール送信権限設定は正常に完了しています。';

  try {
    MailApp.sendEmail(sendto, title, body);
    Logger.log('MailApp.sendEmail success: ' + sendto);
    if (ui) ui.alert('【送信成功】\n' + sendto + ' 宛てにテストメールを送信いたしました。\n受信トレイ（または迷惑メールフォルダ）をご確認ください。');
  } catch (err) {
    Logger.log('送信エラー: ' + err.toString());
    if (ui) ui.alert('【送信エラー】メール送信に失敗しました:\n' + err.toString());
  }
}

/**
 * 🔑 【マクロ】Tokensシートの苗字・名前から一意なハッシュトークンを自動生成する関数
 *
 * 苗字（LastName）および名前（FirstName）が両方入力されている行に限って処理を行います。
 */
function generateTokensFromNames() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tokenSheet = getSheetByNameLoose(ss, 'Tokens');

  var ui;
  try {
    ui = SpreadsheetApp.getUi();
  } catch (e) {
    ui = null;
  }

  if (!tokenSheet) {
    if (ui) ui.alert('エラー: Tokensシートが見つかりません。');
    return;
  }

  var tokenMap = getHeaderColumnMap(tokenSheet);
  var colToken = tokenMap['token'];
  var colLastName = tokenMap['lastname'];
  var colFirstName = tokenMap['firstname'];

  if (!colToken || !colLastName || !colFirstName) {
    if (ui) ui.alert('エラー: Tokensシートに Token, LastName, FirstName 列が見つかりません。');
    return;
  }

  var tokenData = getActiveSheetValues(tokenSheet);
  if (tokenData.length <= 1) {
    if (ui) ui.alert('Tokensシートにデータ行が存在しません。');
    return;
  }

  var updatedCount = 0;
  var scriptProps = PropertiesService.getScriptProperties();
  var salt = scriptProps.getProperty('MY_SECURE_API_KEY') || 'wedding_token_salt_2026';

  for (var r = 1; r < tokenData.length; r++) {
    var rowLn = tokenData[r][colLastName - 1] ? tokenData[r][colLastName - 1].toString().trim() : '';
    var rowFn = tokenData[r][colFirstName - 1] ? tokenData[r][colFirstName - 1].toString().trim() : '';

    // 苗字（LastName）と名前（FirstName）の両方が空欄でない行に限って処理
    if (rowLn !== '' && rowFn !== '') {
      var hashToken = generateShortHash(rowLn + '_' + rowFn + '_' + salt + '_' + r);
      tokenSheet.getRange(r + 1, colToken).setValue(hashToken);
      updatedCount++;
    }
  }

  SpreadsheetApp.flush();

  var msg = '完了: ' + updatedCount + ' 件の行について、苗字と名前から一意なハッシュトークンを生成・更新いたしました。';
  Logger.log(msg);
  if (ui) ui.alert(msg);
}

/**
 * 苗字・名前文字列から16桁の16進数URLセーフハッシュトークンを生成するヘルパー関数
 */
function generateShortHash(str) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, str, Utilities.Charset.UTF_8);
  var hash = '';
  for (var i = 0; i < 8; i++) {
    var byteVal = bytes[i];
    if (byteVal < 0) byteVal += 256;
    var hex = byteVal.toString(16);
    if (hex.length === 1) hex = '0' + hex;
    hash += hex;
  }
  return hash;
}

/**
 * ヘッダー行のスタイル装飾ヘルパー
 */
function formatHeaderRow(sheet, colCount, headerBgColor) {
  var headerRange = sheet.getRange(1, 1, 1, colCount);
  headerRange.setBackground(headerBgColor)
             .setFontColor('#ffffff')
             .setFontWeight('bold')
             .setHorizontalAlignment('center');
  sheet.setFrozenRows(1);
}

/**
 * シートの1行目(ヘッダー)から列名と列インデックス(1-indexed)のマップを取得する動的ヘルパー
 */
function getHeaderColumnMap(sheet) {
  var map = {};
  if (!sheet) return map;
  var lastCol = sheet.getLastColumn();
  if (lastCol < 1) return map;

  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  for (var c = 0; c < headers.length; c++) {
    if (headers[c]) {
      var key = headers[c].toString().trim().toLowerCase();
      map[key] = c + 1; // 1-indexed
    }
  }
  return map;
}

/**
 * シート名をあいまい検索で取得するヘルパー
 */
function getSheetByNameLoose(ss, name) {
  var target = name.toLowerCase().trim();
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getName().toLowerCase().trim() === target) {
      return sheets[i];
    }
  }
  return null;
}

/**
 * ⚡ 高速読み込み用ヘルパー: 空白行を除外し、有効データ行のみを取得する
 */
function getActiveSheetValues(sheet) {
  if (!sheet) return [];
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 1 || lastCol < 1) return [];
  return sheet.getRange(1, 1, lastRow, lastCol).getValues();
}

/**
 * 📱 電話番号の先頭ゼロ欠け補正ヘルパー (例: 9012345678 -> 09012345678)
 */
function formatPhoneGas(phone) {
  if (!phone) return '';
  var str = phone.toString().trim();
  if (str === '') return '';
  if (!/^0/.test(str) && !/^\+/.test(str) && /^\d{9,10}$/.test(str.replace(/[-\s]/g, ''))) {
    return '0' + str;
  }
  return str;
}

// ==========================================================================
// Web API (doGet / doPost) 処理
// ==========================================================================

function doGet(e) {
  var callback = e && e.parameter ? e.parameter.callback : null;

  // 🚀 iOS LINE内蔵ブラウザ対応: iCal (.ics) カレンダーファイルダイレクト配信
  if (e && e.parameter && e.parameter.action === 'ics') {
    return handleIcsCalendarDownload(e);
  }

  try {
    var token = e && e.parameter ? e.parameter.token : null;
    if (!token) {
      return responseJSON({ success: false, error: 'トークンが指定されていません。' }, callback);
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var tokenSheet = getSheetByNameLoose(ss, 'Tokens');
    if (!tokenSheet) {
      return responseJSON({ success: false, error: 'Tokensシートが見つかりません。「createWeddingSheets」を実行してシートを作成してください。' }, callback);
    }

    var tokenMap = getHeaderColumnMap(tokenSheet);
    var tokenData = getActiveSheetValues(tokenSheet);
    var guestInfo = null;

    var colToken = (tokenMap['token'] || 1) - 1;
    var colLastName = (tokenMap['lastname'] || 2) - 1;
    var colFirstName = (tokenMap['firstname'] || 3) - 1;
    var colKanaLastName = (tokenMap['kanalastname'] || 4) - 1;
    var colKanaFirstName = (tokenMap['kanafirstname'] || 5) - 1;
    var colSide = (tokenMap['side'] || 6) - 1;
    var colAgeCategory = (tokenMap['agecategory'] || 7) - 1;
    var colEmail = (tokenMap['email'] || 8) - 1;
    var colStatus = (tokenMap['status'] || 9) - 1;
    var colPhone = (tokenMap['phone'] || 10) - 1;
    var colGuestCategory = (tokenMap['guestcategory'] || tokenMap['招待客区分'] || 11) - 1;

    // ヘッダー行(0)をスキップしてTokens検索
    for (var i = 1; i < tokenData.length; i++) {
      var row = tokenData[i];
      if (row[colToken] && row[colToken].toString().trim() === token.trim()) {
        var rawCat = row[colGuestCategory] ? row[colGuestCategory].toString().trim() : '';
        var guestCat = (rawCat === '親族' || rawCat === '受付') ? rawCat : '-';

        guestInfo = {
          token: row[colToken].toString().trim(),
          lastName: row[colLastName] ? row[colLastName].toString() : '',
          firstName: row[colFirstName] ? row[colFirstName].toString() : '',
          kanaLastName: row[colKanaLastName] ? row[colKanaLastName].toString() : '',
          kanaFirstName: row[colKanaFirstName] ? row[colKanaFirstName].toString() : '',
          side: row[colSide] ? row[colSide].toString() : '新郎側',
          ageCategory: row[colAgeCategory] ? row[colAgeCategory].toString() : '大人',
          email: row[colEmail] ? row[colEmail].toString() : '',
          status: row[colStatus] ? row[colStatus].toString() : '未回答',
          phone: row[colPhone] ? formatPhoneGas(row[colPhone]) : '',
          guestCategory: guestCat
        };
        break;
      }
    }

    if (!guestInfo) {
      return responseJSON({ success: false, error: '無効なトークンです。招待状URLをご確認ください。' }, callback);
    }

    // PredefinedProxies シートから一致する代理出席者リストを取得
    var proxySheet = getSheetByNameLoose(ss, 'PredefinedProxies');
    var predefinedProxies = [];

    if (proxySheet) {
      var proxyMap = getHeaderColumnMap(proxySheet);
      var proxyData = getActiveSheetValues(proxySheet);

      var pColProxyId = (proxyMap['proxyid'] || 1) - 1;
      var pColToken = (proxyMap['token'] || 2) - 1;
      var pColLastName = (proxyMap['lastname'] || 3) - 1;
      var pColFirstName = (proxyMap['firstname'] || 4) - 1;
      var pColKanaLastName = (proxyMap['kanalastname'] || 5) - 1;
      var pColKanaFirstName = (proxyMap['kanafirstname'] || 6) - 1;
      var pColSide = (proxyMap['side'] || 7) - 1;
      var pColAgeCategory = (proxyMap['agecategory'] || 8) - 1;
      var pColEmail = (proxyMap['email'] || 9) - 1;
      var pColStatus = (proxyMap['status'] || 10) - 1;
      var pColAllergies = (proxyMap['allergies'] || 11) - 1;
      var pColPhone = (proxyMap['phone'] || 12) - 1;

      for (var p = 1; p < proxyData.length; p++) {
        var pRow = proxyData[p];
        if (pRow[pColToken] && pRow[pColToken].toString().trim() === token.trim()) {
          var pStatus = pRow[pColStatus] ? pRow[pColStatus].toString().trim() : '未回答';

          // 削除された同伴者は画面描画用データから除外する
          if (pStatus === '削除') continue;

          predefinedProxies.push({
            proxyId: pRow[pColProxyId] ? pRow[pColProxyId].toString().trim() : ('proxy_' + p),
            token: token.trim(),
            lastName: pRow[pColLastName] ? pRow[pColLastName].toString() : '',
            firstName: pRow[pColFirstName] ? pRow[pColFirstName].toString() : '',
            kanaLastName: pRow[pColKanaLastName] ? pRow[pColKanaLastName].toString() : '',
            kanaFirstName: pRow[pColKanaFirstName] ? pRow[pColKanaFirstName].toString() : '',
            side: pRow[pColSide] ? pRow[pColSide].toString() : '新郎側',
            ageCategory: pRow[pColAgeCategory] ? pRow[pColAgeCategory].toString() : '大人',
            email: pRow[pColEmail] ? pRow[pColEmail].toString() : '',
            status: pStatus,
            allergies: pRow[pColAllergies] ? pRow[pColAllergies].toString() : '',
            phone: pRow[pColPhone] ? formatPhoneGas(pRow[pColPhone]) : '',
            fullName: (pRow[pColLastName] ? pRow[pColLastName].toString() : '') + ' ' + (pRow[pColFirstName] ? pRow[pColFirstName].toString() : '')
          });
        }
      }
    }

    // 過去の回答データを取得（もしあれば）
    var responseSheet = getSheetByNameLoose(ss, 'Responses');
    var existingResponse = null;

    if (responseSheet) {
      var respData = getActiveSheetValues(responseSheet);
      for (var j = respData.length - 1; j >= 1; j--) {
        var rRow = respData[j];
        if (rRow[1] && rRow[1].toString().trim() === token.trim()) {
          existingResponse = {
            timestamp: rRow[0],
            attendance: rRow[2] ? rRow[2].toString() : '',
            lastName: rRow[3] ? rRow[3].toString() : '',
            firstName: rRow[4] ? rRow[4].toString() : '',
            kanaLastName: rRow[5] ? rRow[5].toString() : '',
            kanaFirstName: rRow[6] ? rRow[6].toString() : '',
            side: rRow[7] ? rRow[7].toString() : '',
            ageCategory: rRow[8] ? rRow[8].toString() : '',
            email: rRow[9] ? rRow[9].toString() : '',
            phone: rRow[10] ? formatPhoneGas(rRow[10]) : '',
            allergies: rRow[11] ? rRow[11].toString() : '',
            predefinedProxiesResponse: rRow[12] ? rRow[12].toString() : '',
            additionalProxies: rRow[13] ? rRow[13].toString() : '',
            message: rRow[14] ? rRow[14].toString() : ''
          };
          break;
        }
      }
    }

    return responseJSON({
      success: true,
      data: {
        guest: guestInfo,
        predefinedProxies: predefinedProxies,
        existingResponse: existingResponse
      }
    }, callback);

  } catch (err) {
    return responseJSON({ success: false, error: 'サーバー処理中にエラーが発生しました: ' + err.toString() }, callback);
  }
}

/**
 * 🚀 iOS LINE内蔵ブラウザ対応: サーバーからダイレクトに.icsファイルを返却する関数
 */
function handleIcsCalendarDownload(e) {
  var scriptProps = PropertiesService.getScriptProperties();
  var token = (e && e.parameter && e.parameter.token) ? e.parameter.token.trim() : '';

  // 招待客区分（GuestCategory）に応じて開始時刻を動的に決定
  var guestCat = '-';
  if (token) {
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var tokenSheet = getSheetByNameLoose(ss, 'Tokens');
      if (tokenSheet) {
        var tokenMap = getHeaderColumnMap(tokenSheet);
        var tokenData = getActiveSheetValues(tokenSheet);
        var colToken = (tokenMap['token'] || 1) - 1;
        var colCat = (tokenMap['guestcategory'] || tokenMap['招待客区分'] || 11) - 1;
        for (var k = 1; k < tokenData.length; k++) {
          if (tokenData[k][colToken] && tokenData[k][colToken].toString().trim() === token) {
            var rawCat = tokenData[k][colCat] ? tokenData[k][colCat].toString().trim() : '';
            guestCat = (rawCat === '親族' || rawCat === '受付') ? rawCat : '-';
            break;
          }
        }
      }
    } catch (tokenErr) {}
  }

  var defaultStartIso = (guestCat === '受付' || guestCat === '親族') ? '2027-02-11T12:30:00+09:00' : '2027-02-11T13:00:00+09:00';
  var defaultStartUtc = (guestCat === '受付' || guestCat === '親族') ? '20270211T033000Z' : '20270211T040000Z';

  var groomName = scriptProps.getProperty('GROOM_NAME') || '小泉 竜馬';
  var brideName = scriptProps.getProperty('BRIDE_NAME') || '大西 美保夏';
  var weddingDate = scriptProps.getProperty('WEDDING_DATE') || '2027年2月11日（木）';
  var receptionTime = scriptProps.getProperty('RECEPTION_TIME') || '開場 13:00 / 挙式 13:30 / 披露宴 14:15~16:45';
  var venueName = scriptProps.getProperty('VENUE_NAME') || 'カサデアンジェラ青山';
  var venueAddress = scriptProps.getProperty('VENUE_ADDRESS') || '東京都港区南青山2-22-16';

  var eventStart = scriptProps.getProperty('EVENT_START') || defaultStartIso;
  var eventEnd = scriptProps.getProperty('EVENT_END') || '2027-02-11T17:00:00+09:00';

  var title = groomName + ' & ' + brideName + ' 結婚式・披露宴';
  var details = '【結婚式のご案内】\\n日時: ' + weddingDate + ' ' + receptionTime + '\\n場所: ' + venueName + '\\n住所: ' + venueAddress;

  function parseIsoToUtcStr(isoStr, fallbackStr) {
    try {
      var d = new Date(isoStr);
      if (!isNaN(d.getTime())) {
        return Utilities.formatDate(d, 'UTC', "yyyyMMdd'T'HHmmss'Z'");
      }
    } catch (e) {}
    return fallbackStr;
  }

  var startStr = parseIsoToUtcStr(eventStart, defaultStartUtc);
  var endStr = parseIsoToUtcStr(eventEnd, '20270211T080000Z');
  var nowStr = Utilities.formatDate(new Date(), 'UTC', "yyyyMMdd'T'HHmmss'Z'");

  var icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Wedding Invitation//JA',
    'BEGIN:VEVENT',
    'UID:wedding-' + (token ? token : new Date().getTime()) + '@invitation',
    'DTSTAMP:' + nowStr,
    'DTSTART:' + startStr,
    'DTEND:' + endStr,
    'SUMMARY:' + title,
    'DESCRIPTION:' + details,
    'LOCATION:' + venueName + ' ' + venueAddress,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  var output = ContentService.createTextOutput(icsContent);
  output.setMimeType(ContentService.MimeType.TEXT);
  output.downloadAsFile('wedding-invitation.ics');
  return output;
}

/**
 * 🔒 当日の特定のトークンによる回答・更新送信回数をカウントする関数 (1日20回制限用)
 */
function getTodaySubmissionCount(responseSheet, token) {
  if (!responseSheet || !token) return 0;
  var respData = getActiveSheetValues(responseSheet);
  if (respData.length <= 1) return 0;

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var timeZone = ss.getSpreadsheetTimeZone();
  var todayStr = Utilities.formatDate(new Date(), timeZone, 'yyyy-MM-dd');

  var count = 0;
  var colTimestamp = 0; // A列: Timestamp
  var colToken = 1;     // B列: Token

  for (var r = 1; r < respData.length; r++) {
    var rowToken = respData[r][colToken] ? respData[r][colToken].toString().trim() : '';
    if (rowToken === token.trim()) {
      var rowDate = respData[r][colTimestamp];
      if (rowDate) {
        var rowDateStr = (rowDate instanceof Date)
          ? Utilities.formatDate(rowDate, timeZone, 'yyyy-MM-dd')
          : rowDate.toString().substring(0, 10);

        if (rowDateStr === todayStr) {
          count++;
        }
      }
    }
  }
  return count;
}

function doPost(e) {
  try {
    var contents = e.postData ? e.postData.contents : null;
    if (!contents) {
      return responseJSON({ success: false, error: '送信データがありません。' });
    }

    var payload = JSON.parse(contents);
    var token = payload.token;

    if (!token) {
      return responseJSON({ success: false, error: 'トークンがありません。' });
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var tokenSheet = getSheetByNameLoose(ss, 'Tokens');
    var responseSheet = getSheetByNameLoose(ss, 'Responses');

    if (!tokenSheet || !responseSheet) {
      return responseJSON({ success: false, error: '必要なシート（TokensまたはResponses）が見つかりません。' });
    }

    // トークンの有効性確認 & Tokensシートの直接更新
    var tokenMap = getHeaderColumnMap(tokenSheet);
    var tokenData = getActiveSheetValues(tokenSheet);
    var colToken = (tokenMap['token'] || 1) - 1;
    var tokenRowIndex = -1;

    for (var i = 1; i < tokenData.length; i++) {
      if (tokenData[i][colToken] && tokenData[i][colToken].toString().trim() === token.trim()) {
        tokenRowIndex = i + 1; // 1-indexed
        break;
      }
    }

    if (tokenRowIndex === -1) {
      return responseJSON({ success: false, error: '無効なトークンです。' });
    }

    // 🔒 レート制限（Rate Limiting）：同一トークンからの1日あたり送信回数上限チェック（最大20回/日）
    var todayCount = getTodaySubmissionCount(responseSheet, token);
    if (todayCount >= 20) {
      return responseJSON({
        success: false,
        error: 'セキュリティ制限：1日あたりの回答・更新回数上限（20回）に達しました。明日以降に再度お試しいただくか、管理者へお問い合わせください。'
      });
    }

    // 送信パラメーター
    var timestamp = new Date();
    var attendance = payload.attendance || '';
    var lastName = payload.lastName || '';
    var firstName = payload.firstName || '';
    var kanaLastName = payload.kanaLastName || '';
    var kanaFirstName = payload.kanaFirstName || '';
    var side = payload.side || '';
    var ageCategory = payload.ageCategory || '';
    var email = payload.email || '';
    var phone = formatPhoneGas(payload.phone || '');
    var allergies = payload.allergies || '';

    // 生のデータオブジェクト配列を保持
    var rawPredefinedProxiesObj = payload.predefinedProxiesResponse;
    var predefinedProxiesFormattedText = formatPredefinedProxiesResponse(rawPredefinedProxiesObj);
    var additionalProxies = formatAdditionalProxies(payload.additionalProxies);
    var message = payload.message || '';

    // 電話番号はGoogleスプレッドシートで数値化(頭ゼロ落ち)しないようシングルクォートで文字列固定化
    var phoneSheetValue = phone ? ("'" + phone) : '';

    // Responses シート（履歴）への追加
    var proxiesResponseToStore = typeof rawPredefinedProxiesObj === 'object'
      ? JSON.stringify(rawPredefinedProxiesObj)
      : predefinedProxiesFormattedText;

    responseSheet.appendRow([
      timestamp,
      token,
      attendance,
      lastName,
      firstName,
      kanaLastName,
      kanaFirstName,
      side,
      ageCategory,
      email,
      phoneSheetValue,
      allergies,
      proxiesResponseToStore,
      additionalProxies,
      message
    ]);

    // 🚀 Tokens シート（主ゲストマスター）を動的ヘッダー列指定で直接更新！
    if (tokenMap['lastname'] && lastName) tokenSheet.getRange(tokenRowIndex, tokenMap['lastname']).setValue(lastName);
    if (tokenMap['firstname'] && firstName) tokenSheet.getRange(tokenRowIndex, tokenMap['firstname']).setValue(firstName);
    if (tokenMap['kanalastname'] && kanaLastName) tokenSheet.getRange(tokenRowIndex, tokenMap['kanalastname']).setValue(kanaLastName);
    if (tokenMap['kanafirstname'] && kanaFirstName) tokenSheet.getRange(tokenRowIndex, tokenMap['kanafirstname']).setValue(kanaFirstName);
    if (tokenMap['side'] && side) tokenSheet.getRange(tokenRowIndex, tokenMap['side']).setValue(side);
    if (tokenMap['agecategory'] && ageCategory) tokenSheet.getRange(tokenRowIndex, tokenMap['agecategory']).setValue(ageCategory);
    if (tokenMap['email'] && email) tokenSheet.getRange(tokenRowIndex, tokenMap['email']).setValue(email);
    if (tokenMap['status']) tokenSheet.getRange(tokenRowIndex, tokenMap['status']).setValue(attendance);
    if (tokenMap['phone']) tokenSheet.getRange(tokenRowIndex, tokenMap['phone']).setValue(phoneSheetValue);

    // 🚀 PredefinedProxies シート（同伴者マスター）の該当行を動的ヘッダー列指定で直接更新！
    try {
      updatePredefinedProxiesSheet(ss, token, rawPredefinedProxiesObj, payload);
    } catch (proxyErr) {
      Logger.log('updatePredefinedProxiesSheet error: ' + proxyErr.toString());
    }

    // スプレッドシートへの書込み内容を確定
    SpreadsheetApp.flush();

    // 📧 回答受付完了の自動確認メール送信！
    var emailResult = 'Not attempted';
    try {
      emailResult = sendConfirmationEmail(payload);
    } catch (emailErr) {
      Logger.log('sendConfirmationEmail error: ' + emailErr.toString());
      emailResult = 'Error: ' + emailErr.toString();
    }

    return responseJSON({
      success: true,
      message: 'ご回答ありがとうございます。回答を送信・保存いたしました。',
      emailStatus: emailResult
    });

  } catch (err) {
    return responseJSON({ success: false, error: '保存処理中にエラーが発生しました: ' + err.toString() });
  }
}

/**
 * 🚀 回答登録完了時の自動確認メール送信処理 (MailApp.sendEmail(sendto, title, body) 利用)
 */
function sendConfirmationEmail(payload) {
  if (!payload || !payload.email || !payload.email.trim()) return 'No recipient email specified';

  var scriptProps = PropertiesService.getScriptProperties();

  var sendto = payload.email.trim();
  var attendanceStatus = payload.attendance || '未回答';
  var lastName = payload.lastName || '';
  var firstName = payload.firstName || '';
  var guestName = (lastName + ' ' + firstName).trim();

  // 各種設定値（スクリプトプロパティで柔軟に変更可能・未設定時はデフォルト値を使用）
  var groomName = scriptProps.getProperty('GROOM_NAME') || '小泉 竜馬';
  var brideName = scriptProps.getProperty('BRIDE_NAME') || '大西 美保夏';
  var weddingDate = scriptProps.getProperty('WEDDING_DATE') || '2027年2月11日（木）';
  var receptionTime = scriptProps.getProperty('RECEPTION_TIME') || '開場 13:00 / 挙式 13:30 / 披露宴 14:15~16:45';
  var venueName = scriptProps.getProperty('VENUE_NAME') || 'カサデアンジェラ青山';
  var venueAddress = scriptProps.getProperty('VENUE_ADDRESS') || '東京都港区南青山2-22-16';
  var venuePhone = scriptProps.getProperty('VENUE_PHONE') || '03-3478-7222';

  // 編集・確認用URLの生成
  var frontendBaseUrl = scriptProps.getProperty('FRONTEND_URL') || '';
  var editUrl = '';
  if (payload.token) {
    if (frontendBaseUrl) {
      editUrl = frontendBaseUrl.replace(/\/$/, '') + '/?token=' + encodeURIComponent(payload.token);
    } else {
      editUrl = '（※スクリプトプロパティ「FRONTEND_URL」に公開URLを設定するとここに表示されます。例: https://<your-username>.github.io/<repo>/?token=' + encodeURIComponent(payload.token) + '）';
    }
  }

  // 件名および文章テンプレート（スクリプトプロパティでカスタム可）
  var title = scriptProps.getProperty('EMAIL_TITLE') || ('【ご回答完了】結婚式のご案内 - ' + groomName + ' & ' + brideName);
  var headerMsg = scriptProps.getProperty('EMAIL_HEADER_MSG') || 'このたびはWeb招待状のご回答をいただき、誠にありがとうございます。\n送信いただきましたご回答内容を下記の通りお受けいたしました。';
  var footerMsg = scriptProps.getProperty('EMAIL_FOOTER_MSG') || '皆様にお会いできますことを、心より楽しみにしております。';

  // 招待客区分（GuestCategory）の取得 (受付 / 親族 / -)
  var guestCat = '-';
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var tokenSheet = getSheetByNameLoose(ss, 'Tokens');
    if (tokenSheet && payload.token) {
      var tokenMap = getHeaderColumnMap(tokenSheet);
      var tokenData = getActiveSheetValues(tokenSheet);
      var colToken = (tokenMap['token'] || 1) - 1;
      var colCat = (tokenMap['guestcategory'] || tokenMap['招待客区分'] || 11) - 1;
      for (var k = 1; k < tokenData.length; k++) {
        if (tokenData[k][colToken] && tokenData[k][colToken].toString().trim() === payload.token.trim()) {
          var rawCat = tokenData[k][colCat] ? tokenData[k][colCat].toString().trim() : '';
          guestCat = (rawCat === '親族' || rawCat === '受付') ? rawCat : '-';
          break;
        }
      }
    }
  } catch (e) {}

  // 区分ごとの時間注釈とカレンダー予定開始時刻 (UTC)
  var timeNotePlain = '';
  var timeNoteHtml = '';
  var gcalDates = '20270211T040000Z/20270211T080000Z'; // デフォルト 13:00 (JST)

  if (guestCat === '受付') {
    timeNotePlain = '※受付を担当いただくため、当日はお支度完了の上 12:30までにお越しくださいますようお願い申し上げます。';
    timeNoteHtml = '※受付を担当いただくため、当日はお支度完了の上 <strong>12:30まで</strong> にお越しくださいますようお願い申し上げます。';
    gcalDates = '20270211T033000Z/20270211T080000Z'; // 12:30 (JST)
  } else if (guestCat === '親族') {
    timeNotePlain = '※親族紹介にご参加いただくため、当日はお支度完了の上 12:30までにお越しいただきますようお願い申し上げます。';
    timeNoteHtml = '※親族紹介にご参加いただくため、当日はお支度完了の上 <strong>12:30まで</strong> にお越しいただきますようお願い申し上げます。';
    gcalDates = '20270211T033000Z/20270211T080000Z'; // 12:30 (JST)
  } else {
    timeNotePlain = '※挙式にご参列いただくため、当日は午後1:00までにお越しくださいますようお願い申し上げます。';
    timeNoteHtml = '※挙式にご参列いただくため、当日は <strong>午後1:00まで</strong> にお越しくださいますようお願い申し上げます。';
    gcalDates = '20270211T040000Z/20270211T080000Z'; // 13:00 (JST)
  }

  var body = guestName + ' 様\n\n' +
    headerMsg + '\n\n' +
    '--------------------------------------------------\n' +
    '【ご回答内容】\n' +
    '・ご出欠：' + attendanceStatus + '\n' +
    '・お名前：' + guestName + '（' + (payload.kanaLastName || '') + ' ' + (payload.kanaFirstName || '') + ' 様）\n';

  if (attendanceStatus === '出席') {
    body += '・メールアドレス：' + sendto + '\n' +
      '・お電話番号：' + (payload.phone || '') + '\n';

    if (payload.allergies) {
      body += '・アレルギー等：' + payload.allergies + '\n';
    }

    var formattedProxies = formatPredefinedProxiesResponse(payload.predefinedProxiesResponse);
    if (formattedProxies) {
      body += '\n【ご同伴者様】\n' + formattedProxies + '\n';
    }
  }

  if (payload.message) {
    body += '\n【メッセージ】\n' + payload.message + '\n';
  }

  body += '\n--------------------------------------------------\n' +
    '【挙式・披露宴のご案内】\n' +
    '・日時：' + weddingDate + '\n' +
    '・時間：' + receptionTime + '\n' +
    '  ' + timeNotePlain + '\n' +
    '・場所：' + venueName + '\n' +
    '・住所：' + venueAddress + '\n' +
    '・電話番号：' + venuePhone + '\n' +
    '--------------------------------------------------\n';

  if (attendanceStatus === '出席') {
    // カレンダー登録用リンクの生成（例外安全 & スクリプトプロパティ優先）
    var webAppUrl = '';
    try {
      webAppUrl = scriptProps.getProperty('GAS_WEB_APP_URL') || ScriptApp.getService().getUrl() || '';
    } catch (e) {
      webAppUrl = 'https://script.google.com/macros/s/AKfycbzNNtFzeqGRerwOuTN-k19jNb0h2jPnJmXRVtMKlQTw0e1SwGffZnqaiHK0X-0cz8J0Yw/exec';
    }
    var icsLink = webAppUrl ? (webAppUrl.replace(/\/$/, '') + '?action=ics&token=' + encodeURIComponent(payload.token || '')) : '';
    var gcalTitle = encodeURIComponent(groomName + ' & ' + brideName + ' 結婚式・披露宴');
    var gcalDetails = encodeURIComponent('【結婚式のご案内】\n日時: ' + weddingDate + ' ' + receptionTime + '\n場所: ' + venueName + '\n住所: ' + venueAddress);
    var gcalLocation = encodeURIComponent(venueName + ' ' + venueAddress);
    var gcalLink = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + gcalTitle + '&dates=' + gcalDates + '&details=' + gcalDetails + '&location=' + gcalLocation;

    body += '\n【カレンダーへの予定登録】\n' +
      'スマートフォンやPCのカレンダーに予定を簡単に追加できます：\n' +
      '・Googleカレンダーに追加:\n' + gcalLink + '\n\n' +
      '・Appleカレンダー (.ics):\n' + (icsLink || '（URL未設定）') + '\n' +
      '※iPhoneをご利用の方は、カレンダーアプリ起動後に表示される画面中央下の「カレンダーに追加」を押すと予定が保存されます。\n\n';
  }

  if (editUrl) {
    body += '\n【回答の確認・修正について】\n' +
      'ご回答内容を変更される場合は、以下の専用URLより再度アクセスしていつでも修正いただけます。\n' +
      editUrl + '\n\n';
  }

  body += footerMsg + '\n\n' + groomName + ' & ' + brideName;

  // HTMLメールボディの構築
  var htmlBody = '<div style="font-family: \'Shippori Mincho\', serif; color: #333333; line-height: 1.8; max-width: 600px; margin: 0 auto; padding: 20px; background: #faf8f5; border-radius: 12px;">' +
    '<h2 style="color: #c5a059; text-align: center; border-bottom: 2px solid #e8d3c5; padding-bottom: 10px; font-family: \'Shippori Mincho\', serif;">結婚式ご出席のご案内</h2>' +
    '<p><strong>' + escapeHtmlGas(guestName) + ' 様</strong></p>' +
    '<p>' + escapeHtmlGas(headerMsg).replace(/\n/g, '<br>') + '</p>' +

    '<div style="background: #ffffff; border: 1px solid #e2d8cd; border-radius: 8px; padding: 20px; margin: 20px 0;">' +
      '<h3 style="color: #c5a059; margin-top: 0; font-size: 16px; border-bottom: 1px solid #f0e6de; padding-bottom: 6px;">【ご回答内容】</h3>' +
      '<p><strong>・ご出欠：</strong>' + escapeHtmlGas(attendanceStatus) + '</p>' +
      '<p><strong>・お名前：</strong>' + escapeHtmlGas(guestName) + '（' + escapeHtmlGas(payload.kanaLastName || '') + ' ' + escapeHtmlGas(payload.kanaFirstName || '') + ' 様）</p>';

  if (attendanceStatus === '出席') {
    htmlBody += '<p><strong>・メールアドレス：</strong>' + escapeHtmlGas(sendto) + '</p>' +
      '<p><strong>・お電話番号：</strong>' + escapeHtmlGas(payload.phone || '') + '</p>';
    if (payload.allergies) {
      htmlBody += '<p><strong>・アレルギー等：</strong>' + escapeHtmlGas(payload.allergies) + '</p>';
    }
    var formattedProxies = formatPredefinedProxiesResponse(payload.predefinedProxiesResponse);
    if (formattedProxies) {
      htmlBody += '<p style="margin-top:10px;"><strong>【ご同伴者様】</strong><br>' + escapeHtmlGas(formattedProxies).replace(/\n/g, '<br>') + '</p>';
    }
  }

  if (payload.message) {
    htmlBody += '<p style="margin-top:10px;"><strong>【メッセージ】</strong><br>' + escapeHtmlGas(payload.message).replace(/\n/g, '<br>') + '</p>';
  }

  htmlBody += '</div>' +
    '<div style="background: #ffffff; border: 1px solid #e2d8cd; border-radius: 8px; padding: 20px; margin: 20px 0;">' +
      '<h3 style="color: #c5a059; margin-top: 0; font-size: 16px; border-bottom: 1px solid #f0e6de; padding-bottom: 6px;">【挙式・披露宴のご案内】</h3>' +
      '<p><strong>・日時：</strong>' + escapeHtmlGas(weddingDate) + '</p>' +
      '<p><strong>・時間：</strong>' + escapeHtmlGas(receptionTime) + '</p>' +
      '<p style="font-size: 13px; color: #c5a059; margin-top: -5px; margin-bottom: 12px; line-height: 1.5;">' + timeNoteHtml + '</p>';

  if (attendanceStatus === '出席') {
    var webAppUrl = '';
    try {
      webAppUrl = scriptProps.getProperty('GAS_WEB_APP_URL') || ScriptApp.getService().getUrl() || '';
    } catch (e) {
      webAppUrl = 'https://script.google.com/macros/s/AKfycbzNNtFzeqGRerwOuTN-k19jNb0h2jPnJmXRVtMKlQTw0e1SwGffZnqaiHK0X-0cz8J0Yw/exec';
    }
    var icsLink = webAppUrl ? (webAppUrl.replace(/\/$/, '') + '?action=ics') : '';
    var gcalTitle = encodeURIComponent(groomName + ' & ' + brideName + ' 結婚式・披露宴');
    var gcalDetails = encodeURIComponent('【結婚式のご案内】\n日時: ' + weddingDate + ' ' + receptionTime + '\n場所: ' + venueName + '\n住所: ' + venueAddress);
    var gcalLocation = encodeURIComponent(venueName + ' ' + venueAddress);
    var gcalLink = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + gcalTitle + '&dates=20270211T040000Z/20270211T080000Z&details=' + gcalDetails + '&location=' + gcalLocation;

    htmlBody += '<div style="margin: 12px 0 15px 0; padding: 12px; background: #fcf9f2; border-radius: 6px; border: 1px dashed #c5a059;">' +
      '<span style="font-size: 13px; font-weight: bold; color: #c5a059; margin-right: 10px;">📅 カレンダーへの予定登録：</span>' +
      '<a href="' + gcalLink + '" target="_blank" style="display: inline-block; margin-right: 8px; margin-bottom: 4px; padding: 5px 10px; background: #c5a059; color: #ffffff; text-decoration: none; border-radius: 4px; font-size: 11px; font-weight: bold;">Googleカレンダーに追加</a>' +
      '<a href="' + icsLink + '" target="_blank" style="display: inline-block; margin-bottom: 4px; padding: 5px 10px; background: #ffffff; color: #c5a059; border: 1px solid #c5a059; text-decoration: none; border-radius: 4px; font-size: 11px; font-weight: bold;">Appleカレンダー (.ics)</a>' +
      '<p style="font-size: 11px; color: #777777; margin: 6px 0 0 0; line-height: 1.4;">※iPhone(Appleカレンダー)をご利用の方は、画面が開いた後、右上の<strong>「追加」</strong>を押すと保存されます。</p>' +
    '</div>';
  }

  htmlBody += '<p><strong>・場所：</strong>' + escapeHtmlGas(venueName) + '</p>' +
    '<p><strong>・住所：</strong>' + escapeHtmlGas(venueAddress) + '</p>' +
    '<p><strong>・電話番号：</strong>' + escapeHtmlGas(venuePhone) + '</p>' +
    '</div>';

  if (editUrl) {
    htmlBody += '<div style="background: #fdfbf7; border: 1px solid #e2d8cd; border-radius: 8px; padding: 15px; margin: 20px 0; font-size: 14px; text-align: center;">' +
      '<strong>【回答の確認・修正について】</strong><br>' +
      'ご回答内容を変更される場合は、下記ボタンよりいつでも修正いただけます。<br><br>' +
      '<a href="' + editUrl + '" target="_blank" style="display: inline-block; padding: 10px 20px; background: #c5a059; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: bold; box-shadow: 0 2px 5px rgba(197,160,89,0.3);">修正はこちらから</a>' +
      '</div>';
  }

  htmlBody += '<p style="text-align: center; margin-top: 30px; color: #666666;">' + escapeHtmlGas(footerMsg) + '</p>' +
    '<p style="text-align: center; font-family: serif; font-size: 16px; color: #c5a059; font-weight: bold;">' + escapeHtmlGas(groomName + ' & ' + brideName) + '</p>' +
    '</div>';

  // ご指示の通り MailApp.sendEmail に htmlBody を付与して送信
  try {
    MailApp.sendEmail(sendto, title, body, {
      htmlBody: htmlBody,
      name: groomName + ' & ' + brideName + ' 結婚式事務局'
    });
    Logger.log('MailApp.sendEmail success: ' + sendto);
    return 'Sent via MailApp to ' + sendto;
  } catch (err) {
    Logger.log('MailApp.sendEmail error: ' + err.toString());
    try {
      GmailApp.sendEmail(sendto, title, body, {
        htmlBody: htmlBody,
        name: groomName + ' & ' + brideName + ' 結婚式事務局'
      });
      return 'Sent via GmailApp to ' + sendto;
    } catch (err2) {
      return 'Failed: ' + err2.toString();
    }
  }
}

/**
 * 簡易HTMLエスケープヘルパー (GAS用)
 */
function escapeHtmlGas(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
/**
 * 🚀 PredefinedProxies シートの該当行をユーザー入力内容でダイレクト更新・追加・削除同期する関数
 */
function updatePredefinedProxiesSheet(ss, token, proxiesResponse, mainPayload) {
  var proxySheet = getSheetByNameLoose(ss, 'PredefinedProxies');
  if (!proxySheet || !token) return;

  var proxyMap = getHeaderColumnMap(proxySheet);
  var proxyData = getActiveSheetValues(proxySheet);
  if (proxyData.length <= 1) return;

  var colProxyId = (proxyMap['proxyid'] || 1) - 1;
  var colToken = (proxyMap['token'] || 2) - 1;
  var colStatus = (proxyMap['status'] || 10); // 1-indexed

  var isMainDeclined = mainPayload && mainPayload.attendance === '欠席';

  var proxiesList = [];
  if (proxiesResponse) {
    if (typeof proxiesResponse === 'string') {
      try { proxiesList = JSON.parse(proxiesResponse); } catch (e) { proxiesList = []; }
    } else if (Array.isArray(proxiesResponse)) {
      proxiesList = proxiesResponse;
    }
  }

  // 送信された ProxyId のマップを作成
  var submittedProxyIds = {};
  for (var k = 0; k < proxiesList.length; k++) {
    if (proxiesList[k] && proxiesList[k].proxyId) {
      submittedProxyIds[proxiesList[k].proxyId.toString().trim()] = proxiesList[k];
    }
  }

  // 1. スプレッドシート上の既存行の更新
  for (var p = 1; p < proxyData.length; p++) {
    var rowToken = proxyData[p][colToken] ? proxyData[p][colToken].toString().trim() : '';
    if (rowToken === token.trim()) {
      var rowProxyId = proxyData[p][colProxyId] ? proxyData[p][colProxyId].toString().trim() : '';
      var rowNum = p + 1;

      if (isMainDeclined) {
        // 主出席者が欠席の場合は同伴者も全件「欠席」に更新
        if (colStatus) proxySheet.getRange(rowNum, colStatus).setValue('欠席');
      } else if (submittedProxyIds[rowProxyId]) {
        // 送信データに存在する同伴者情報の更新
        var item = submittedProxyIds[rowProxyId];
        if (proxyMap['lastname'] && item.lastName !== undefined) proxySheet.getRange(rowNum, proxyMap['lastname']).setValue(item.lastName);
        if (proxyMap['firstname'] && item.firstName !== undefined) proxySheet.getRange(rowNum, proxyMap['firstname']).setValue(item.firstName);
        if (proxyMap['kanalastname'] && item.kanaLastName !== undefined) proxySheet.getRange(rowNum, proxyMap['kanalastname']).setValue(item.kanaLastName);
        if (proxyMap['kanafirstname'] && item.kanaFirstName !== undefined) proxySheet.getRange(rowNum, proxyMap['kanafirstname']).setValue(item.kanaFirstName);
        if (proxyMap['agecategory'] && item.ageCategory !== undefined) proxySheet.getRange(rowNum, proxyMap['agecategory']).setValue(item.ageCategory);
        if (colStatus) proxySheet.getRange(rowNum, colStatus).setValue(item.attending ? '出席' : '欠席');
        if (proxyMap['allergies'] && item.allergies !== undefined) proxySheet.getRange(rowNum, proxyMap['allergies']).setValue(item.allergies);
        if (proxyMap['phone'] && item.phone !== undefined) {
          var pPhone = formatPhoneGas(item.phone);
          proxySheet.getRange(rowNum, proxyMap['phone']).setValue(pPhone ? ("'" + pPhone) : '');
        }

        // 処理済みマーク削除
        delete submittedProxyIds[rowProxyId];
      } else {
        // 画面上から削除された同伴者は「削除」ステータスへ更新（再アクセス時の復活を完全防止）
        if (colStatus) proxySheet.getRange(rowNum, colStatus).setValue('削除');
      }
    }
  }

  // 2. 主出席者が出席で、新規追加（スプレッドシート未存在）の同伴者の行追加
  if (!isMainDeclined) {
    for (var key in submittedProxyIds) {
      if (submittedProxyIds.hasOwnProperty(key)) {
        var newItem = submittedProxyIds[key];
        var maxCol = proxySheet.getLastColumn() || 12;
        var newProxyRow = [];
        for (var c = 0; c < maxCol; c++) {
          newProxyRow.push('');
        }

        if (proxyMap['proxyid']) newProxyRow[proxyMap['proxyid'] - 1] = key;
        if (proxyMap['token']) newProxyRow[proxyMap['token'] - 1] = token;
        if (proxyMap['lastname']) newProxyRow[proxyMap['lastname'] - 1] = newItem.lastName || '';
        if (proxyMap['firstname']) newProxyRow[proxyMap['firstname'] - 1] = newItem.firstName || '';
        if (proxyMap['kanalastname']) newProxyRow[proxyMap['kanalastname'] - 1] = newItem.kanaLastName || '';
        if (proxyMap['kanafirstname']) newProxyRow[proxyMap['kanafirstname'] - 1] = newItem.kanaFirstName || '';
        if (proxyMap['side']) newProxyRow[proxyMap['side'] - 1] = mainPayload ? (mainPayload.side || '新郎側') : '新郎側';
        if (proxyMap['agecategory']) newProxyRow[proxyMap['agecategory'] - 1] = newItem.ageCategory || '大人';
        if (proxyMap['status']) newProxyRow[proxyMap['status'] - 1] = newItem.attending ? '出席' : '欠席';
        if (proxyMap['allergies']) newProxyRow[proxyMap['allergies'] - 1] = newItem.allergies || '';
        if (proxyMap['phone']) {
          var newPPhone = formatPhoneGas(newItem.phone || '');
          newProxyRow[proxyMap['phone'] - 1] = newPPhone ? ("'" + newPPhone) : '';
        }

        proxySheet.appendRow(newProxyRow);
      }
    }
  }
}

/**
 * 事前定義代理出席者の回答データをスプレッドシート閲覧用に整列化する関数
 */
function formatPredefinedProxiesResponse(proxiesRaw) {
  if (!proxiesRaw) return '';
  if (typeof proxiesRaw === 'string') {
    try {
      var parsed = JSON.parse(proxiesRaw);
      if (Array.isArray(parsed)) proxiesRaw = parsed;
    } catch (e) {
      return proxiesRaw;
    }
  }

  if (Array.isArray(proxiesRaw)) {
    return proxiesRaw.map(function(p) {
      if (typeof p === 'string') return p;
      var status = p.attending ? '出席' : '欠席';
      var name = (p.lastName || '') + ' ' + (p.firstName || '');
      var kana = (p.kanaLastName || '') + ' ' + (p.kanaFirstName || '');
      var details = [status, p.ageCategory || '大人'];
      if (kana.trim().length > 0) details.push('ふりがな: ' + kana.trim());
      if (p.allergies) details.push('アレルギー: ' + p.allergies);
      return name.trim() + ' (' + details.join(', ') + ')';
    }).join('\n');
  }

  return JSON.stringify(proxiesRaw);
}

/**
 * 追加同伴者オブジェクトをスプレッドシート閲覧用に綺麗に整列化する関数
 */
function formatAdditionalProxies(addProxiesRaw) {
  if (!addProxiesRaw) return '';
  if (typeof addProxiesRaw === 'object') {
    return JSON.stringify(addProxiesRaw);
  }
  try {
    var parsed = JSON.parse(addProxiesRaw);
    if (Array.isArray(parsed)) {
      return parsed.map(function(p) {
        var name = (p.lastName || '') + ' ' + (p.firstName || '');
        var kana = (p.kanaLastName || '') + ' ' + (p.kanaFirstName || '');
        var details = [p.ageCategory || '大人'];
        if (kana.trim().length > 0) details.push('ふりがな: ' + kana.trim());
        if (p.allergies) details.push('アレルギー: ' + p.allergies);
        return name.trim() + ' (' + details.join(', ') + ')';
      }).join('\n');
    }
  } catch (e) {
    // 通常文字列の場合はそのまま返却
  }
  return addProxiesRaw;
}

/**
 * 💌 【マクロ】Tokensシートの全ゲストに対して、
 * 「[お名前] 様\n回答はこちらから（[お名前]様専用のURLになります）：\n[URL]?token=[token]」
 * という案内メッセージを「Message」シートへハイパーリンク形式で一括出力する関数
 */
function generateInvitationMessages() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tokenSheet = getSheetByNameLoose(ss, 'Tokens');
  if (!tokenSheet) {
    SpreadsheetApp.getUi().alert('エラー: Tokensシートが見つかりません。');
    return;
  }

  var scriptProps = PropertiesService.getScriptProperties();
  var frontendBaseUrl = scriptProps.getProperty('FRONTEND_URL') || '';
  if (!frontendBaseUrl) {
    frontendBaseUrl = 'https://<your-username>.github.io/<repo-name>/';
  }

  var tokenMap = getHeaderColumnMap(tokenSheet);
  var tokenData = getActiveSheetValues(tokenSheet);
  if (tokenData.length <= 1) {
    SpreadsheetApp.getUi().alert('Tokensシートにデータ行がありません。');
    return;
  }

  // "Message" シートの生成・初期化
  var messageSheet = ss.getSheetByName('Message') || ss.getSheetByName('message');
  if (!messageSheet) {
    messageSheet = ss.insertSheet('Message');
  } else {
    messageSheet.clear();
  }

  var headers = ['宛名', '案内メッセージ', '専用URL (クリック可能)'];
  messageSheet.appendRow(headers);
  formatHeaderRow(messageSheet, headers.length, '#c5a059');

  var colToken = tokenMap['token'] || 1;
  var colLastName = tokenMap['lastname'] || 2;
  var colFirstName = tokenMap['firstname'] || 3;

  var count = 0;
  for (var r = 1; r < tokenData.length; r++) {
    var rowToken = tokenData[r][colToken - 1] ? tokenData[r][colToken - 1].toString().trim() : '';
    var rowLn = tokenData[r][colLastName - 1] ? tokenData[r][colLastName - 1].toString().trim() : '';
    var rowFn = tokenData[r][colFirstName - 1] ? tokenData[r][colFirstName - 1].toString().trim() : '';

    if (rowToken && rowLn && rowFn) {
      var guestFullName = rowLn + ' ' + rowFn + ' 様';
      var messageTemplate = rowLn + ' ' + rowFn + ' 様\n回答はこちらから（' + rowLn + ' ' + rowFn + '様専用のURLになります）：';
      var personalUrl = frontendBaseUrl.replace(/\/$/, '') + '/?token=' + encodeURIComponent(rowToken);

      // Google Sheets の HYPERLINK 数式をセット
      var hyperlinkFormula = '=HYPERLINK("' + personalUrl + '", "専用URLを開く")';

      messageSheet.appendRow([
        guestFullName,
        messageTemplate,
        hyperlinkFormula
      ]);
      count++;
    }
  }

  messageSheet.setColumnWidth(1, 140);
  messageSheet.setColumnWidth(2, 350);
  messageSheet.setColumnWidth(3, 180);

  var ui = SpreadsheetApp.getUi();
  ui.alert('【Messageシート出力完了】\n「Message」シートに ' + count + ' 件のゲスト専用案内メッセージとハイパーリンクを出力しました。');
}

/**
 * JSONレスポンスの出力処理 (JSONP対応)
 */
function responseJSON(obj, callback) {
  var jsonStr = JSON.stringify(obj);
  if (callback) {
    var output = ContentService.createTextOutput(callback + '(' + jsonStr + ')');
    output.setMimeType(ContentService.MimeType.JAVASCRIPT);
    return output;
  }
  var output = ContentService.createTextOutput(jsonStr);
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
