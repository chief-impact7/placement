/**
 * Google Sheets API 연동 서비스
 * 중요: 조직 내 배포 시 GCP 콘솔에서 클라이언트 ID와 API 키 발급이 필요합니다.
 */

const SCOPES = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.email';
const DISCOVERY_DOC = 'https://sheets.googleapis.com/$discovery/rest?version=v4';

class SheetsService {
    constructor() {
        this.spreadsheetId = ''; // 여기에 대상 구글 시트 ID 입력
        this.tokenClient = null;
        this.gapiInited = false;
        this.gisInited = false;
    }

    // GAPI 라이브러리 로드
    async initGapi(apiKey) {
        return new Promise((resolve) => {
            window.gapi.load('client', async () => {
                await window.gapi.client.init({
                    apiKey: apiKey,
                    discoveryDocs: [DISCOVERY_DOC],
                });
                this.gapiInited = true;
                resolve();
            });
        });
    }

    // GIS 라이브러리 로드 (인증)
    initGis(clientId) {
        this.tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: SCOPES,
            callback: '',
        });
        this.gisInited = true;
    }

    // 사용자 이메일 정보 가져오기
    async getUserInfo() {
        try {
            const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { 'Authorization': `Bearer ${window.gapi.client.getToken().access_token}` }
            });
            return await response.json();
        } catch (err) {
            console.error('User info fetch error:', err);
            return null;
        }
    }

    // 템플릿 시트 목록 가져오기 (Template_ 접두사 기준)
    async getTemplates(spreadsheetId) {
        try {
            const response = await window.gapi.client.sheets.spreadsheets.get({
                spreadsheetId: spreadsheetId,
            });
            return response.result.sheets
                .map(s => s.properties.title)
                .filter(title => title.startsWith('Template_'));
        } catch (err) {
            console.error('Templates fetch error:', err);
            return [];
        }
    }

    // 시트 이름 목록 가져오기 (템플릿 제외)
    async getSheetNames(spreadsheetId) {
        try {
            const response = await window.gapi.client.sheets.spreadsheets.get({
                spreadsheetId: spreadsheetId,
            });
            return response.result.sheets
                .map(s => s.properties.title)
                .filter(title => !title.startsWith('Template_'));
        } catch (err) {
            console.error('Sheet names fetch error:', err);
            throw err;
        }
    }

    // 성적 데이터 저장 (동적 열 매핑)
    async submitGradeData(spreadsheetId, sheetName, data) {
        try {
            // 1. 헤더 읽기
            const response = await window.gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: spreadsheetId,
                range: `${sheetName}!1:1`,
            });
            const headerRow = response.result.values[0];

            // 2. 마지막 행 찾기 (이름 열 기준)
            const nameColIndex = this.findHeaderIndex(headerRow, "이름");
            const colLetter = this.getColLetter(nameColIndex !== -1 ? nameColIndex : 0);
            const rowsResponse = await window.gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: spreadsheetId,
                range: `${sheetName}!${colLetter}:${colLetter}`,
            });
            const lastRow = (rowsResponse.result.values || []).length;
            const targetRow = lastRow + 1;

            // 3. 데이터 매핑 (기본 인적사항 + 동적 성적)
            const updates = [];
            const baseFields = {
                "이름": data.name,
                "학교": data.school,
                "학년": data.grade,
                "응시일": data.date,
                "소속": data.dept,
                "시험종류": data.type,
                "시험 종류": data.type
                // "지난 시험지", "LastMark" 등 AX 열은 시트 생성 시 고정되므로 학생별 저장 시에는 제외
            };

            // 기본 필드 추가
            for (const [key, val] of Object.entries(baseFields)) {
                const idx = this.findHeaderIndex(headerRow, key);
                if (idx !== -1) {
                    if (val !== undefined) {
                        updates.push({
                            range: `${sheetName}!${this.getColLetter(idx)}${targetRow}`,
                            values: [[val]]
                        });
                    }
                }
            }

            // 성적 필드 추가 (동적)
            for (const [key, val] of Object.entries(data.scores)) {
                const idx = this.findHeaderIndex(headerRow, key);
                if (idx !== -1) {
                    if (val !== undefined) {
                        updates.push({
                            range: `${sheetName}!${this.getColLetter(idx)}${targetRow}`,
                            values: [[val]]
                        });
                    }
                }
            }

            await window.gapi.client.sheets.spreadsheets.values.batchUpdate({
                spreadsheetId: spreadsheetId,
                resource: {
                    data: updates,
                    valueInputOption: 'USER_ENTERED'
                }
            });

            return { status: "SUCCESS", message: `${targetRow}행에 데이터가 저장되었습니다.` };
        } catch (err) {
            console.error('Data submit error:', err);
            return { status: "ERROR", message: err.message };
        }
    }

    // 데이터 목록 가져오기 (헤더 기반 동적 파싱)
    async getRows(spreadsheetId, sheetName) {
        try {
            const response = await window.gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: spreadsheetId,
                range: `${sheetName}!A:ZZ`,
            });
            const rows = response.result.values || [];
            if (rows.length < 2) return [];

            const headerRow = rows[0];

            // 중요 헤더들의 인덱스 찾기 (유연한 매칭)
            const idxs = {
                name: this.findHeaderIndex(headerRow, "이름"),
                school: this.findHeaderIndex(headerRow, "학교"),
                grade: this.findHeaderIndex(headerRow, "학년"),
                date: this.findHeaderIndex(headerRow, "응시일"),
                dept: this.findHeaderIndex(headerRow, "소속"),
                type: this.findHeaderIndex(headerRow, "시험종류") || this.findHeaderIndex(headerRow, "시험 종류"),
                ref: this.findHeaderIndex(headerRow, "지난 시험지") || this.findHeaderIndex(headerRow, "지난시험지") || this.findHeaderIndex(headerRow, "참조") || this.findHeaderIndex(headerRow, "LastMark")
            };

            // 성적 필드 추출 (시험종류 이후의 모든 필드)
            const typeIdx = idxs.type !== -1 ? idxs.type : headerRow.indexOf("시험종류");
            const scoreHeaders = headerRow.slice(typeIdx + 1).filter(h => h && h.trim());

            return rows.slice(1).map((row, idx) => {
                const scores = {};
                scoreHeaders.forEach(h => {
                    const hIdx = this.findHeaderIndex(headerRow, h);
                    if (hIdx !== -1) scores[h] = row[hIdx] || '';
                });

                const gradeValue = idxs.grade !== -1 ? (row[idxs.grade] || '') : '';
                let dept_type = '';
                if (gradeValue) {
                    if (['초4', '초5', '초6'].includes(gradeValue)) dept_type = '초등부';
                    else if (['중1', '중2', '중3'].includes(gradeValue)) dept_type = '중등부';
                    else if (['고1', '고2', '고3'].includes(gradeValue)) dept_type = '고등부';
                }
                // 고등부 고유 필드 체크로 보정
                if (Object.keys(scores).some(k => k.includes('청해') || k.includes('대의파악'))) {
                    dept_type = '고등부';
                }

                return {
                    id: idx + 2,
                    name: idxs.name !== -1 ? (row[idxs.name] || '') : '',
                    school: idxs.school !== -1 ? (row[idxs.school] || '') : '',
                    grade: gradeValue,
                    date: idxs.date !== -1 ? (row[idxs.date] || '') : '',
                    dept: idxs.dept !== -1 ? (row[idxs.dept] || '') : '',
                    type: idxs.type !== -1 ? (row[idxs.type] || '') : '',
                    ref: idxs.ref !== -1 ? (row[idxs.ref] || '') : '',
                    dept_type: dept_type,
                    scores: scores
                };
            }).filter(student => student.name && student.name.trim() !== '');
        } catch (err) {
            console.error('Get rows error:', err);
            throw err;
        }
    }

    // 데이터 수정 (A:L 및 지정된 성적 필드만 타겟팅하여 수식 영역 보호)
    async updateRow(spreadsheetId, sheetName, rowNumber, data) {
        try {
            const headerResponse = await window.gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: spreadsheetId,
                range: `${sheetName}!1:1`,
            });
            const headerRow = headerResponse.result.values[0];

            const updates = [];
            const allFields = {
                "이름": data.name,
                "학교": data.school,
                "학년": data.grade,
                "응시일": data.date,
                "소속": data.dept,
                "시험종류": data.type,
                "시험 종류": data.type,
                ...data.scores
            };

            for (const [key, value] of Object.entries(allFields)) {
                // 특정 열(LastMark 등)은 학생별 업데이트에서 제외 (시트 설정 영역 보호)
                if (key === 'LastMark' || key === '지난 시험지' || key === '참조') continue;

                const colIdx = this.findHeaderIndex(headerRow, key);
                if (colIdx !== -1 && value !== undefined) {
                    updates.push({
                        range: `${sheetName}!${this.getColLetter(colIdx)}${rowNumber}`,
                        values: [[value]]
                    });
                }
            }

            if (updates.length > 0) {
                await window.gapi.client.sheets.spreadsheets.values.batchUpdate({
                    spreadsheetId: spreadsheetId,
                    resource: {
                        data: updates,
                        valueInputOption: 'USER_ENTERED'
                    }
                });
            }
            return { status: "SUCCESS" };
        } catch (err) {
            console.error('Update row error:', err);
            return { status: "ERROR", message: err.message };
        }
    }


    // 시트의 헤더 목록만 가져오기 (동적 폼 구성을 위해)
    async getHeader(spreadsheetId, sheetName) {
        try {
            const response = await window.gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: spreadsheetId,
                range: `${sheetName}!1:1`,
            });
            const header = response.result.values[0];
            let scoreIndex = this.findHeaderIndex(header, "시험종류");
            if (scoreIndex === -1) scoreIndex = this.findHeaderIndex(header, "시험 종류");

            if (scoreIndex === -1) return []; // 시험종류를 못 찾으면 빈 배열 반환

            return header.slice(scoreIndex + 1).filter(h => h && h.trim());
        } catch (err) {
            console.error('Get header error:', err);
            return [];
        }
    }

    // 특정 시트에서 학생 이름으로 특정 항목(lastmark 등) 가져오기
    async getStudentValue(spreadsheetId, sheetName, studentName, targetHeader) {
        try {
            const response = await window.gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: spreadsheetId,
                range: `${sheetName}!A:ZZ`,
            });
            const rows = response.result.values || [];
            if (rows.length < 2) return null;

            const headerRow = rows[0];
            const nameIdx = this.findHeaderIndex(headerRow, "이름");
            const targetIdx = this.findHeaderIndex(headerRow, targetHeader);

            if (nameIdx === -1 || targetIdx === -1) return null;

            const targetName = studentName.trim();
            // 마지막으로 입력된 학생의 데이터를 찾음 (중복 시 최신 데이터 우선)
            const studentRow = rows.slice(1).reverse().find(row => (row[nameIdx] || '').toString().trim() === targetName);
            return studentRow ? studentRow[targetIdx] : null;
        } catch (err) {
            console.error('Get student value error:', err);
            return null;
        }
    }

    // 특정 시트의 특정 행들에 값을 기록 (예: lastmark 열의 2,3,4행에 참조 시트명 기록)
    async updateHeaderLabels(spreadsheetId, sheetName, headerName, labels) {
        try {
            console.log(`[updateHeaderLabels] 시작: ${sheetName}, ${headerName}, labels:`, labels);
            const response = await window.gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: spreadsheetId,
                range: `'${sheetName}'!1:1`,
            });
            const header = response.result.values?.[0] || [];

            let colIdx = this.findHeaderIndex(header, headerName);
            if (colIdx === -1 && headerName === 'lastmark') {
                colIdx = this.findHeaderIndex(header, '지난 시험지');
            }
            if (colIdx === -1 && headerName === 'lastmark') {
                colIdx = this.findHeaderIndex(header, '지난시험지');
            }

            if (colIdx === -1) {
                console.warn(`[updateHeaderLabels] '${headerName}' 열을 찾을 수 없습니다.`);
                return;
            }

            const colLetter = this.getColLetter(colIdx);
            console.log(`[updateHeaderLabels] '${headerName}' 열 위치: ${colLetter} (${colIdx})`);

            // 2, 3, 4행 업데이트
            await window.gapi.client.sheets.spreadsheets.values.update({
                spreadsheetId: spreadsheetId,
                range: `'${sheetName}'!${colLetter}2:${colLetter}4`,
                valueInputOption: 'USER_ENTERED',
                resource: {
                    values: [
                        [labels[0] || ''],
                        [labels[1] || ''],
                        [labels[2] || '']
                    ]
                }
            });
            console.log(`[updateHeaderLabels] '${colLetter}2:${colLetter}4' 영역 업데이트 완료`);
        } catch (err) {
            console.error('Update header labels error:', err);
        }
    }

    // 특정 시트의 특정 행들(2,3,4행)에서 값을 읽어옴 (참조 정보 복구용)
    async getHeaderLabels(spreadsheetId, sheetName, headerName) {
        try {
            const response = await window.gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: spreadsheetId,
                range: `'${sheetName}'!1:1`,
            });
            const header = response.result.values?.[0] || [];

            let colIdx = this.findHeaderIndex(header, headerName);
            if (colIdx === -1 && headerName === 'lastmark') {
                colIdx = this.findHeaderIndex(header, '지난 시험지');
            }
            if (colIdx === -1 && headerName === 'lastmark') {
                colIdx = this.findHeaderIndex(header, '지난시험지');
            }

            if (colIdx === -1) return ['', '', ''];

            const colLetter = this.getColLetter(colIdx);
            const valResponse = await window.gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: spreadsheetId,
                range: `'${sheetName}'!${colLetter}2:${colLetter}4`,
            });

            const vals = valResponse.result.values || [];
            console.log(`[getHeaderLabels] '${colLetter}2:${colLetter}4' 읽기 결과:`, vals);
            return [
                vals[0]?.[0] || '',
                vals[1]?.[0] || '',
                vals[2]?.[0] || ''
            ];
        } catch (err) {
            console.error('Get header labels error:', err);
            return ['', '', ''];
        }
    }

    // 시트 이름으로 시트 ID 가져오기
    async getSheetId(spreadsheetId, sheetName) {
        const response = await window.gapi.client.sheets.spreadsheets.get({
            spreadsheetId: spreadsheetId,
        });
        const sheet = response.result.sheets.find(s => s.properties.title === sheetName);
        return sheet ? sheet.properties.sheetId : null;
    }

    // 시트 복사 및 생성 (구글 시트 네이티브 복제 기능 사용 - 서식/수식 완벽 보존)
    async duplicateSheet(spreadsheetId, sourceSheetName, newSheetName) {
        try {
            console.log(`[duplicateSheet] 시작: ${sourceSheetName} -> ${newSheetName}`);

            // 1. 원본 시트의 ID 가져오기
            const sourceSheetId = await this.getSheetId(spreadsheetId, sourceSheetName);
            if (sourceSheetId === null) {
                return { status: "ERROR", message: "원본 템플릿 시트를 찾을 수 없습니다." };
            }

            // 2. 시트 복제 요청
            const response = await window.gapi.client.sheets.spreadsheets.batchUpdate({
                spreadsheetId: spreadsheetId,
                resource: {
                    requests: [
                        {
                            duplicateSheet: {
                                sourceSheetId: sourceSheetId,
                                insertSheetIndex: 0,
                                newSheetName: newSheetName
                            }
                        }
                    ]
                }
            });

            console.log(`[duplicateSheet] 네이티브 복제 성공: ${newSheetName}`);
            return { status: "SUCCESS", message: `[${newSheetName}] 시트가 생성되었습니다.` };
        } catch (err) {
            console.error('Sheet duplicate error:', err);
            return { status: "ERROR", message: err.message };
        }
    }

    // 데이터 삭제 (범위 값 지우기 - 행 물리 삭제 방지 및 수식 영역 보호)
    async deleteRow(spreadsheetId, sheetName, rowNumber) {
        try {
            // A열부터 ZZ열까지 해당 행의 값만 지움 (행 자체는 남겨둠)
            await window.gapi.client.sheets.spreadsheets.values.clear({
                spreadsheetId: spreadsheetId,
                range: `'${sheetName}'!A${rowNumber}:ZZ${rowNumber}`,
            });
            return { status: "SUCCESS" };
        } catch (err) {
            console.error('Delete row error:', err);
            return { status: "ERROR", message: err.message };
        }
    }

    // 시트(탭) 삭제 기능
    async deleteSheet(spreadsheetId, sheetName) {
        try {
            const sheetId = await this.getSheetId(spreadsheetId, sheetName);
            if (sheetId === null) {
                return { status: "ERROR", message: "삭제할 시트를 찾을 수 없습니다." };
            }

            await window.gapi.client.sheets.spreadsheets.batchUpdate({
                spreadsheetId: spreadsheetId,
                resource: {
                    requests: [{
                        deleteSheet: {
                            sheetId: sheetId
                        }
                    }]
                }
            });
            return { status: "SUCCESS" };
        } catch (err) {
            console.error('Delete sheet error:', err);
            return { status: "ERROR", message: err.message };
        }
    }

    getColLetter(colIdx) {
        let code = "";
        while (colIdx >= 0) {
            code = String.fromCharCode((colIdx % 26) + 65) + code;
            colIdx = Math.floor(colIdx / 26) - 1;
        }
        return code;
    }

    // 헤더 이름을 표준화하여 비교 (공백 제거, 소문자화)
    normalize(str) {
        return str ? str.toString().trim().toLowerCase().replace(/\s+/g, '') : '';
    }

    findHeaderIndex(headerRow, targetName) {
        const normalizedTarget = this.normalize(targetName);
        // 정확히 일치하는 헤더 찾기 (엄격 매칭)
        return headerRow.findIndex(h => this.normalize(h) === normalizedTarget);
    }
}

export const sheetsService = new SheetsService();
