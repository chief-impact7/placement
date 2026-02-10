/**
 * IMPACT7 Admin Suite V26.0
 * Advanced 2-Pane Console with Multi-Zone Automation
 */

const ADMIN_PASS = "1234"; // 샘플 비밀번호

function onOpen() {
  SpreadsheetApp.getUi().createMenu('🚀 IMPACT7')
    .addItem('📊 성적 관리 대시보드', 'checkAccessAndShow')
    .addToUi();
}

function checkAccessAndShow() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt('🔐 관리자 인증', '관리자 비밀번호를 입력하세요:', ui.ButtonSet.OK_CANCEL);
  
  if (response.getSelectedButton() == ui.Button.OK) {
    if (response.getResponseText() === ADMIN_PASS) {
      showDashboard();
    } else {
      ui.alert('❌ 비밀번호가 틀렸습니다.');
    }
  }
}

function showDashboard() {
  const html = HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('IMPACT7 Admin Console')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .setWidth(1000).setHeight(900);
  SpreadsheetApp.getUi().showModalDialog(html, ' ');
}

/**
 * 관리 대상 시트 목록 조회
 */
function getSheetNames() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const exclude = ['Template_성적입력', 'Dashboard_Summary', 'Master', 'Settings', '양식'];
  return ss.getSheets()
    .map(s => s.getName())
    .filter(n => !exclude.includes(n));
}

/**
 * 시트 활성화
 */
function activateSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(name);
  if (sheet) {
    ss.setActiveSheet(sheet);
    return { status: "SUCCESS" };
  }
  return { status: "ERROR", message: "시트를 찾을 수 없습니다." };
}

/**
 * 신규 시험 탭 생성 및 자동화 연동
 */
function createNewExamSheet(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const template = ss.getSheetByName('Template_성적입력');
    if (!template) return { status: "ERROR", message: "'Template_성적입력' 시트가 없습니다." };
    
    if (ss.getSheetByName(data.newSheetName)) {
      return { status: "ERROR", message: "이미 동일한 이름의 탭이 존재합니다." };
    }

    const newSheet = template.copyTo(ss).setName(data.newSheetName);
    
    // AT1에 이전 시트 이름 기록
    newSheet.getRange("AT1").setValue(data.prevSheetName);
    
    // 템플릿 구조에 맞게 기본 정보 입력 (예시 셀 주소 보완 가능)
    if (data.examDate) newSheet.getRange("D2").setValue(data.examDate);
    if (data.examCategory) newSheet.getRange("E2").setValue(data.examCategory);
    if (data.examType) newSheet.getRange("F2").setValue(data.examType);
    
    // 시트 활성화 및 정렬 등 추가 작업 수행 가능
    ss.setActiveSheet(newSheet);
    return { status: "SUCCESS", newName: data.newSheetName };
  } catch (e) {
    return { status: "ERROR", message: e.toString() };
  }
}

/**
 * 성적 데이터 입력 (헤더 기반 동적 열 매핑)
 */
function submitGradeData(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getActiveSheet(); 
    
    // 헤더 행 읽기 (1행 가정)
    const headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    // 헤더 맵 생성 (이름: 열 인덱스)
    const headerMap = {};
    headerRow.forEach((title, index) => {
      if (title) headerMap[title.toString().trim()] = index + 1;
    });

    // A열(이름) 기준 마지막 행 찾기
    const nameColIndex = headerMap["이름"] || 1;
    const names = sheet.getRange(1, nameColIndex, sheet.getMaxRows(), 1).getValues();
    let lastRow = 1;
    for (let i = names.length - 1; i >= 0; i--) {
      if (names[i][0] !== "") {
        lastRow = i + 1;
        break;
      }
    }
    const targetRow = lastRow + 1;

    // 데이터 데이터 매핑 (사용자 커스텀 필드명에 맞춤)
    // 팁: 시트의 헤더명과 아래 key값이 일치해야 함
    const fieldMap = {
      "이름": data.name,
      "학교": data.school,
      "학년": data.grade,
      "응시일": data.date,
      "소속": data.dept,
      "시험종류": data.type,
      "LC": data.scores.lc,
      "Voca": data.scores.voca,
      "Gr": data.scores.gr,
      "RC": data.scores.rc,
      "Syn": data.scores.syn,
      "개별보정": data.scores.adj
    };

    // 각 헤더에 맞는 열에 데이터 작성
    for (const [headerName, value] of Object.entries(fieldMap)) {
      const colIndex = headerMap[headerName];
      if (colIndex) {
        sheet.getRange(targetRow, colIndex).setValue(value);
      }
    }
    
    return { status: "SUCCESS", message: (targetRow) + "행에 성적이 저장되었습니다." };
  } catch (e) {
    return { status: "ERROR", message: e.toString() };
  }
}
