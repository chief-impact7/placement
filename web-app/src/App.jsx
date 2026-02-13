import React, { useState, useEffect, useMemo } from 'react';
import {
    Search, PlusCircle, Navigation, Save, RefreshCcw, CheckCircle2, Circle,
    Printer, FileText, Trash2, Pencil, X, History, User, Building2, Calendar,
    ChevronDown, LayoutDashboard, Database, TrendingUp, LogIn, GraduationCap,
    BookOpen, Award, School
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { sheetsService } from './services/sheetsService';

function cn(...inputs) {
    return twMerge(clsx(...inputs));
}

// 현지 날짜 YYYY-MM-DD 문자열을 반환하는 헬퍼 함수
const getLocalTodayStr = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(now - offset)).toISOString().slice(0, 10);
    return localISOTime;
};

// 학부별 과목 구성 및 점수 제한 (최대값)
const DEPT_SPECS = {
    '초등부': {
        fields: ['L/C (Raw)', 'Voca (Raw)', 'Gr (Raw)', 'R/C (Raw)', 'Syn (Raw)', '개별보정 (Raw)'],
        limits: { 'L/C (Raw)': 20, 'Voca (Raw)': 15, 'Gr (Raw)': 15, 'R/C (Raw)': 15, 'Syn (Raw)': 25, '개별보정 (Raw)': 100 },
        units: { 'L/C (Raw)': '개', 'Voca (Raw)': '개', 'Gr (Raw)': '개', 'R/C (Raw)': '개', 'Syn (Raw)': '점', '개별보정 (Raw)': '포인트' }
    },
    '중등부': {
        fields: ['L/C (Raw)', 'Voca (Raw)', 'Gr (Raw)', 'R/C (Raw)', 'Syn (Raw)', '개별보정 (Raw)'],
        limits: { 'L/C (Raw)': 20, 'Voca (Raw)': 20, 'Gr (Raw)': 20, 'R/C (Raw)': 20, 'Syn (Raw)': 25, '개별보정 (Raw)': 100 },
        units: { 'L/C (Raw)': '개', 'Voca (Raw)': '개', 'Gr (Raw)': '개', 'R/C (Raw)': '개', 'Syn (Raw)': '점', '개별보정 (Raw)': '포인트' }
    },
    '고등부': {
        fields: ['청해 (Raw)', '대의파악 (Raw)', '문법어휘 (Raw)', '세부사항 (Raw)', '빈칸추론 (Raw)', '간접쓰기 (Raw)'],
        limits: { '청해 (Raw)': 10, '대의파악 (Raw)': 5, '문법어휘 (Raw)': 10, '세부사항 (Raw)': 5, '빈칸추론 (Raw)': 10, '간접쓰기 (Raw)': 10 },
        units: { '청해 (Raw)': '개', '대의파악 (Raw)': '개', '문법어휘 (Raw)': '개', '세부사항 (Raw)': '개', '빈칸추론 (Raw)': '개', '간접쓰기 (Raw)': '개' }
    }
};

// 학부별 학년 옵션
const GRADE_OPTIONS = {
    '초등부': ['초4', '초5', '초6'],
    '중등부': ['초6', '중1', '중2', '중3'],
    '고등부': ['중3', '고1', '고2', '고3', '기타']
};

const App = () => {
    const [tabSearch, setTabSearch] = useState('');
    const [allTabNames, setAllTabNames] = useState([]);
    const [templates, setTemplates] = useState([]); // 템플릿 목록 상태 추가
    const [activeTab, setActiveTab] = useState('');
    const [newName, setNewName] = useState('');
    const [prevSheetName, setPrevSheetName] = useState('');
    const [refSheets, setRefSheets] = useState(['', '', '']); // 참조 시트 3개
    const [refScores, setRefScores] = useState(['', '', '']); // 불러온 lastmark 기록
    const [dynamicHeaders, setDynamicHeaders] = useState([]); // 동적 헤더 목록
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [studentList, setStudentList] = useState([]);
    const [listSearch, setListSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [editingId, setEditingId] = useState(null);
    const [showReport, setShowReport] = useState(null);

    const [formData, setFormData] = useState({
        name: '', school: '', grade: '',
        date: '', dept: '', type: '',
        dept_type: '', // 학부 (초등부, 중등부, 고등부)
        scores: {} // 동적으로 채워질 예정
    });
    const [selectedStudents, setSelectedStudents] = useState(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;


    const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const spreadsheetId = import.meta.env.VITE_SPREADSHEET_ID;

    const todayStr = useMemo(() => getLocalTodayStr(), []);

    useEffect(() => {
        const initClient = async () => {
            if (!apiKey || !clientId) return;
            try {
                await sheetsService.initGapi(apiKey);
                sheetsService.initGis(clientId);
            } catch (err) { console.error('Init error:', err); }
        };
        initClient();
    }, [apiKey, clientId]);

    const handleLogin = () => {
        if (!sheetsService.tokenClient) return alert('API가 아직 로드되지 않았습니다.');
        sheetsService.tokenClient.callback = async (resp) => {
            if (resp.error !== undefined) throw resp;

            // 도메인 검증 로직
            const userInfo = await sheetsService.getUserInfo();
            const userEmail = userInfo?.email || '';
            const allowedDomains = ['@gw.impact7.kr', '@impact7.kr'];
            const isAllowed = allowedDomains.some(domain => userEmail.endsWith(domain));

            if (!isAllowed) {
                alert(`로그인 실패: ${userEmail}\n학원 공식 계정(@impact7.kr 또는 @gw.impact7.kr)으로만 이용 가능합니다.`);
                window.google.accounts.oauth2.revoke(resp.access_token);
                return;
            }

            setIsAuthenticated(true);
            await loadSheetNames();
        };
        sheetsService.tokenClient.requestAccessToken({ prompt: 'consent' });
    };

    const loadSheetNames = async () => {
        setIsLoading(true);
        try {
            const names = await sheetsService.getSheetNames(spreadsheetId);
            const tmpls = await sheetsService.getTemplates(spreadsheetId);
            setAllTabNames(names);
            setTemplates(tmpls);
        } catch (e) { alert('로드 실패: ' + e.message); }
        finally { setIsLoading(false); }
    };

    const loadStudentData = async (sheetName) => {
        setIsLoading(true);
        try {
            const headers = await sheetsService.getHeader(spreadsheetId, sheetName);
            setDynamicHeaders(headers);

            // 시트에서 기존 참조 설정 불러오기 (lastmark 또는 '지난 시험지' 열의 2, 3, 4행)
            let lmIdx = headers.indexOf('lastmark');
            if (lmIdx === -1) lmIdx = headers.indexOf('지난 시험지');
            if (lmIdx === -1) lmIdx = headers.indexOf('지난시험지');

            if (lmIdx !== -1) {
                const colLetter = sheetsService.getColLetter(lmIdx);
                const resp = await window.gapi.client.sheets.spreadsheets.values.get({
                    spreadsheetId,
                    range: `'${sheetName}'!${colLetter}2:${colLetter}4`
                });
                const existingLabels = resp.result.values?.map(v => v[0] || '') || ['', '', ''];
                setRefSheets(existingLabels);
            } else {
                setRefSheets(['', '', '']);
            }


            const data = await sheetsService.getRows(spreadsheetId, sheetName);
            setStudentList(data);

            // 폼 데이터 초기화 (현재 시트 항목에 맞게)
            const initialScores = {};
            headers.forEach(h => { initialScores[h] = ''; });
            setFormData(p => ({ ...p, scores: initialScores }));
        } catch (e) { console.error(e); }
        finally { setIsLoading(false); }
    };

    const loadRefScores = async (formDataObj) => {
        const { name, school = '', type = '' } = formDataObj || {};
        if (!name || name.trim().length === 0) {
            setRefScores(['', '', '', '']); // 0,1,2: 과거, 3: 현재
            return;
        }

        const cleanName = name.trim();
        const cleanSchool = school ? school.trim() : '';
        const cleanType = type ? type.trim() : '';

        // 1. 과거 기록 로딩
        const scores = await Promise.all(refSheets.map(async (sheet, idx) => {
            if (!sheet) return '';
            // 참조 시트의 'SUM' 열을 가져옴 (해당 학기 점수)
            let value = await sheetsService.getStudentValue(spreadsheetId, sheet, cleanName, cleanSchool, cleanType, 'SUM');
            // #REF! 성 시트 오류는 0 또는 '-'로 표시하여 사용자 혼란 방지
            if (value === '#REF!' || !value) return '0';
            return value;
        }));

        // 2. 현재 시트의 SUM 로딩
        let currentSum = '';
        if (activeTab) {
            currentSum = await sheetsService.getStudentValue(spreadsheetId, activeTab, cleanName, cleanSchool, cleanType, 'SUM');
        }

        setRefScores([...scores, (currentSum === '#REF!' || !currentSum) ? '0' : currentSum]);
    };


    // 학생 이름 입력 시 자동으로 과거 기록 조회 (이름+학교+시험종류 복합키 사용)
    useEffect(() => {
        if (formData.name && formData.name.trim().length >= 2) {
            const timer = setTimeout(() => loadRefScores(formData), 800); // 디바운싱
            return () => clearTimeout(timer);
        }
    }, [formData.name, formData.school, formData.type, refSheets, activeTab]);

    const handleRefSheetChange = async (idx, sheetName) => {
        const newRefs = [...refSheets];
        newRefs[idx] = sheetName;
        setRefSheets(newRefs);

        console.log('[DEBUG] handleRefSheetChange:', { idx, sheetName, activeTab, newRefs });

        // 시트에 라벨링 업데이트 (lastmark 열의 2, 3, 4행에 시트명 기록)
        if (activeTab) {
            console.log('[DEBUG] Calling updateHeaderLabels...');
            await sheetsService.updateHeaderLabels(spreadsheetId, activeTab, 'lastmark', newRefs);
            console.log('[DEBUG] updateHeaderLabels completed');
        }
    };

    useEffect(() => {
        if (activeTab && isAuthenticated) {
            loadStudentData(activeTab);
            // 참조 정보(lastmark) 복원
            const fetchLabels = async () => {
                const labels = await sheetsService.getHeaderLabels(spreadsheetId, activeTab, 'lastmark');
                if (labels) setRefSheets(labels);
            };

            fetchLabels();
        }
    }, [activeTab, isAuthenticated]);

    const resetForm = () => {
        const initialScores = {};
        dynamicHeaders.forEach(h => { initialScores[h] = ''; });
        setFormData(prev => ({
            name: '', school: '', grade: '',
            date: '', dept: '', type: '',
            dept_type: prev.dept_type, // 학부 선택값유지
            scores: initialScores
        }));
        setEditingId(null);
    };


    const handleNameChange = (e) => {
        const value = e.target.value;
        if (value && !formData.dept_type) {
            alert('먼저 상단의 [학부 선택]을 완료해주세요.');
            document.getElementById('dept-type-select')?.focus();
        }
        setFormData(p => ({ ...p, name: value }));
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            const allIds = new Set(filteredList.map(s => s.id));
            setSelectedStudents(allIds);
        } else {
            setSelectedStudents(new Set());
        }
    };

    const [trendCache, setTrendCache] = useState({});

    // [DEPRECATED] 점수 계산 로직 제거 - Google Sheets의 SUM 값만 사용
    // const getCalculatedSum = (scores, dept_type) => {
    //     if (!scores) return 0;
    //     const type = dept_type || formData.dept_type;
    //     const specFields = type ? (DEPT_SPECS[type]?.fields || []) : dynamicHeaders;
    //
    //     return specFields
    //         .filter(f => f.toLowerCase().includes('raw') || f.includes('보정'))
    //         .reduce((total, f) => {
    //             const norm = f.toLowerCase().replace(/\s+/g, '');
    //             const key = Object.keys(scores).find(k => k.toLowerCase().replace(/\s+/g, '') === norm);
    //             const val = parseFloat(scores[key || f]);
    //             return total + (isNaN(val) ? 0 : val);
    //         }, 0);
    // };

    // Completion Check Helper
    const isStudentComplete = (s) => {
        const type = s.dept_type || formData.dept_type;
        const specFields = type ? (DEPT_SPECS[type]?.fields || []) : [];
        if (specFields.length > 0) {
            return specFields.every(f => {
                if (f.includes('개별보정') || f.includes('보정')) return true;
                const val = s.scores[f] || s.scores[Object.keys(s.scores).find(k => k.toLowerCase().replace(/\s+/g, '') === f.toLowerCase().replace(/\s+/g, ''))];
                return val !== undefined && val !== '';
            });
        }
        return Object.entries(s.scores).every(([k, v]) => {
            if (!k.toLowerCase().includes('raw')) return true;
            if (k.includes('개별보정') || k.includes('보정')) return true;
            return v !== '';
        });
    };

    const fetchTrendData = (student) => {
        if (trendCache[student.id]) return;

        // student.scores에서 과거 학기 점수 직접 가져오기 (스프레드시트 컬럼 사용)
        const pastScores = [
            parseFloat(student.scores?.['3학기전SUM']) || 0,
            parseFloat(student.scores?.['2학기전SUM']) || 0,
            parseFloat(student.scores?.['1학기전SUM']) || 0
        ];
        const currentSum = parseFloat(student.scores?.['SUM']) || 0;

        // 차트 데이터 순서: 3학기전 -> 2학기전 -> 1학기전 -> 현재
        const chartData = [...pastScores, currentSum];

        setTrendCache(prev => ({
            ...prev,
            [student.id]: chartData
        }));
    };

    const toggleStudentSelection = (id) => {
        const next = new Set(selectedStudents);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
            const s = studentList.find(x => x.id === id);
            if (s) fetchTrendData(s);
        }
        setSelectedStudents(next);
    };

    const submitGrade = async () => {
        if (!formData.name) return alert('학생 이름을 입력해주세요.');
        if (!activeTab) return alert('시험지를 선택해주세요.');

        setIsLoading(true);
        try {
            // 수식 영역 보호를 위해 현재 학부의 입력 필드만 추출하여 저장 시도
            const currentFields = DEPT_SPECS[formData.dept_type]?.fields || [];
            const filteredScores = {};
            currentFields.forEach(f => {
                if (formData.scores[f] !== undefined) {
                    filteredScores[f] = formData.scores[f];
                }
            });

            // 개별보정 필드 기본값 0 처리 (초등부/중등부)
            if (['초등부', '중등부'].includes(formData.dept_type)) {
                if (!filteredScores['개별보정 (Raw)']) {
                    filteredScores['개별보정 (Raw)'] = '0';
                }
            }

            const cleanData = {
                ...formData,
                scores: filteredScores
            };


            const res = editingId
                ? await sheetsService.updateRow(spreadsheetId, activeTab, editingId, cleanData)
                : await sheetsService.submitGradeData(spreadsheetId, activeTab, cleanData);

            if (res.status === 'SUCCESS') {
                alert(editingId ? '수정되었습니다.' : '저장되었습니다.');

                // 저장된 최종 합계를 상단 위젯에 동기화 (Google Sheets SUM 사용)
                const finalSum = parseFloat(cleanData.scores['SUM']) || 0;
                setRefScores(prev => {
                    const next = [...prev];
                    next[3] = finalSum;
                    return next;
                });

                resetForm();
                await loadStudentData(activeTab);
            } else {
                alert('실패: ' + (res.message || '알 수 없는 오류가 발생했습니다.'));
            }
        } catch (e) { alert('오류: ' + e.message); }
        finally { setIsLoading(false); }
    };

    const handleScoreChange = (field, value) => {
        if (!formData.dept_type) {
            alert('먼저 상단의 [학부 선택]을 완료해주세요.');
            return;
        }

        const numVal = parseFloat(value);
        if (!isNaN(numVal)) {
            const spec = DEPT_SPECS[formData.dept_type];
            if (spec && spec.limits[field] !== undefined) {
                if (numVal > spec.limits[field]) {
                    const unit = spec.units ? (spec.units[field] || '점') : '점';
                    alert(`${field} 과목의 최대값은 ${spec.limits[field]}${unit}입니다.`);
                    return;
                }
            }
        }

        // 필드명 매칭 (대소문자, 공백 무시)
        const norm = field.toLowerCase().replace(/\s+/g, '');
        // 이미 formData.scores에 비슷한 키가 있는지 확인
        const existingKey = Object.keys(formData.scores).find(k => k.toLowerCase().replace(/\s+/g, '') === norm);

        // DEPT_SPECS의 필드명과 시트의 필드명이 다를 수 있으므로, 
        // 입력 시에는 DEPT_SPECS의 필드명을 우선 순위로 사용하되 기존 키가 있으면 유지
        const targetKey = existingKey || field;

        setFormData(prev => ({
            ...prev,
            scores: { ...prev.scores, [targetKey]: value }
        }));
    };

    const handleCreateSheet = async () => {
        if (!newName.trim()) return alert('새 시험지 이름을 입력하세요.');
        if (!templates.length) return alert('사용 가능한 템플릿이 없습니다. (Template_시트 필요)');

        // prevSheetName이 템플릿 목록에 있으면 사용하고, 없으면 첫 번째 템플릿을 기본으로 사용
        const sourceSheet = templates.includes(prevSheetName) ? prevSheetName : templates[0];

        setIsLoading(true);
        const res = await sheetsService.duplicateSheet(spreadsheetId, sourceSheet, newName.trim());
        if (res.status === "SUCCESS") {
            await loadSheetNames();
            setActiveTab(newName.trim());
            // 새 시트 생성 시 현재 설정된 참조 선택지들을 LastMark 열에 기록
            await sheetsService.updateHeaderLabels(spreadsheetId, newName.trim(), 'lastmark', refSheets);
            setNewName('');
        } else { alert(res.message); }
        setIsLoading(false);
    };

    const startEdit = (student) => {
        // 학부(dept_type) 정보가 학생 객체에 있으면 사용, 없으면 유추
        let inferredType = student.dept_type || formData.dept_type;

        if (!student.dept_type && student.grade) {
            if (['초4', '초5', '초6'].includes(student.grade)) inferredType = '초등부';
            else if (['중1', '중2', '중3'].includes(student.grade)) inferredType = '중등부';
            else if (['고1', '고2', '고3'].includes(student.grade)) inferredType = '고등부';
        }

        // 고등부 고유 필드 체크 (청해, 대의파악 등)
        const hasHighFields = Object.keys(student.scores || {}).some(k => k.includes('청해') || k.includes('대의파악') || k.includes('빈칸'));
        if (hasHighFields) inferredType = '고등부';

        setFormData({ ...student, dept_type: inferredType });
        setEditingId(student.id);
        window.scrollTo({ top: 300, behavior: 'smooth' });
    };

    const deleteStudent = async (rowNumber) => {
        if (!confirm('해당 학생 정보를 삭제하시겠습니까?\n(데이터만 지워지며 시트 구조는 유지됩니다.)')) return;
        setIsLoading(true);
        try {
            const res = await sheetsService.deleteRow(spreadsheetId, activeTab, rowNumber);
            if (res.status === 'SUCCESS') {
                await loadStudentData(activeTab);
            } else { alert('삭제 실패: ' + (res.message || '알 수 없는 오류가 발생했습니다.')); }
        } catch (e) { alert('오류: ' + e.message); }
        finally { setIsLoading(false); }
    };

    const handleDeleteTab = async (sheetName) => {
        if (!confirm(`[${sheetName}] 시험지 탭을 정말 삭제하시겠습니까?\n이 작업은 되돌릴 수 없으며 모든 데이터가 사라집니다.`)) return;
        setIsLoading(true);
        try {
            const res = await sheetsService.deleteSheet(spreadsheetId, sheetName);
            if (res.status === 'SUCCESS') {
                if (activeTab === sheetName) setActiveTab('');
                await loadSheetNames();
            } else { alert('탭 삭제 실패: ' + (res.message || '알 수 없는 오류가 발생했습니다.')); }
        } catch (e) { alert('오류: ' + e.message); }
        finally { setIsLoading(false); }
    };

    const handleRenameTab = async (oldName) => {
        const newNameInput = prompt(`[${oldName}] 시험지의 새 이름을 입력하세요:`, oldName);
        if (!newNameInput || newNameInput === oldName) return;

        setIsLoading(true);
        try {
            const res = await sheetsService.renameSheet(spreadsheetId, oldName, newNameInput.trim());
            if (res.status === 'SUCCESS') {
                const newTitle = newNameInput.trim();
                // 중요: 활성 탭 이름을 먼저 변경하고 데이터를 즉시 다시 로드합니다.
                if (activeTab === oldName) {
                    setActiveTab(newTitle);
                    await loadStudentData(newTitle);
                }
                await loadSheetNames();
            } else { alert('이름 변경 실패: ' + (res.message || '알 수 없는 오류가 발생했습니다.')); }
        } catch (e) { alert('오류: ' + e.message); }
        finally { setIsLoading(false); }
    };

    const filteredList = useMemo(() => {
        return studentList.filter(s => {
            const searchStr = listSearch.toLowerCase();
            const matchesSearch =
                s.name.toLowerCase().includes(searchStr) ||
                s.school.toLowerCase().includes(searchStr) ||
                s.grade.toLowerCase().includes(searchStr) ||
                s.dept.toLowerCase().includes(searchStr) ||
                s.type.toLowerCase().includes(searchStr) ||
                (s.date && s.date.toLowerCase().includes(searchStr));

            if (!matchesSearch) return false;

            const isComp = isStudentComplete(s);

            if (statusFilter === 'completed') return isComp;
            if (statusFilter === 'incomplete') return !isComp;
            return true;
        });
    }, [studentList, listSearch, statusFilter]);

    const paginatedList = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredList.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredList, currentPage]);

    const totalPages = Math.ceil(filteredList.length / ITEMS_PER_PAGE);

    const stats = useMemo(() => {
        if (studentList.length === 0) return { avg: 0, completion: 0, total: 0, completed: 0 };
        const total = studentList.length;
        const completed = studentList.filter(s => isStudentComplete(s)).length;

        let sum = 0;
        let count = 0;
        studentList.forEach(s => {
            const scoreSum = parseFloat(s.scores['SUM']) || 0;
            if (scoreSum > 0) {
                sum += scoreSum;
                count++;
            }
        });

        return {
            total,
            completed,
            avg: count > 0 ? (sum / count).toFixed(1) : 0,
            completion: ((completed / total) * 100).toFixed(0)
        };
    }, [studentList]);

    // 실시간 입력 점수 합계 (Google Sheets의 SUM 값만 사용)
    const currentFormSum = useMemo(() => {
        // 이름이 없으면 폼이 비어있는 것으로 간주하여 null 반환
        if (!formData.scores || !formData.name) return null;

        // Google Sheets의 SUM 값을 그대로 사용 (계산하지 않음)
        return parseFloat(formData.scores['SUM']) || 0;
    }, [formData.scores]);

    if (!isAuthenticated) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-slate-50">
                <div className="p-12 bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-sm w-full text-center">
                    <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-blue-100 rotate-6">
                        <User className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 mb-2 tracking-tighter">IMPACT7</h1>
                    <p className="text-sm text-slate-400 font-bold mb-10">성적 관리 시스템 통합 대시보드</p>
                    <button onClick={handleLogin} className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 flex items-center justify-center gap-3">
                        관리 권한 로그인
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen overflow-hidden bg-[#f1f5f9] font-sans">
            <main className="h-full overflow-y-auto p-12 bg-[#f8fafc]">
                <div className="max-w-7xl mx-auto space-y-10 pb-20">
                    {/* Header with Search and Stats */}
                    <div className="flex justify-between items-center mb-10">
                        <div className="p-2">
                            <h1 className="text-3xl font-black text-slate-900 leading-none tracking-tighter">IMPACT7</h1>
                            <span className="text-[12px] text-blue-600 font-black uppercase tracking-widest mt-2 px-3 py-1 bg-blue-50 rounded-full inline-block">Score Input Dashboard</span>
                        </div>
                        <div className="flex items-center gap-6">
                            {isLoading && <RefreshCcw className="w-6 h-6 animate-spin text-blue-600" />}
                            {!isAuthenticated ? (
                                <button onClick={handleLogin} className="bg-slate-900 text-white font-black px-8 py-4 rounded-2xl flex items-center gap-3 transition-all hover:bg-black shadow-lg">
                                    관리자 로그인
                                </button>
                            ) : (
                                <div className="bg-white border border-slate-200 rounded-2xl px-6 py-4 flex items-center gap-4 shadow-sm">
                                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-black">AD</div>
                                    <div className="text-left">
                                        <p className="text-[10px] text-slate-400 font-black uppercase">Authorized</p>
                                        <p className="text-sm font-black text-slate-900 leading-tight">Administrator</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {[
                            { label: '전체 응시 인원', value: stats.total, icon: User, color: 'blue' },
                            { label: '성적 입력 완료', value: stats.completed, icon: CheckCircle2, color: 'green' },
                            { label: '평균 총점', value: stats.avg, icon: TrendingUp, color: 'purple' },
                            { label: '입력 진척도', value: stats.completion + '%', icon: LayoutDashboard, color: 'amber' }
                        ].map((s, i) => (
                            <div key={i} className="bg-white p-7 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-6 group hover:border-blue-300 transition-all">
                                <div className={cn("w-16 h-16 rounded-[1.25rem] flex items-center justify-center shadow-lg transition-transform group-hover:scale-110",
                                    s.color === 'blue' ? "bg-blue-50 text-blue-600" :
                                        s.color === 'green' ? "bg-green-50 text-green-600" :
                                            s.color === 'purple' ? "bg-purple-50 text-purple-600" : "bg-amber-50 text-amber-600")}>
                                    <s.icon className="w-8 h-8" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 truncate">{s.label}</p>
                                    <p className="text-3xl font-black text-slate-900 tracking-tighter">{s.value}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Top Row: Tab List and Sheet Creation */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        {/* 새 시험 성적표 생성 카드 (왼쪽으로 원복) */}
                        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl p-10 flex flex-col h-[450px]">
                            <h3 className="text-base font-black text-slate-900 mb-10 flex items-center gap-3 uppercase tracking-widest">
                                <PlusCircle className="w-5 h-5 text-blue-600" /> 새 시험 성적표 생성
                            </h3>
                            <div className="space-y-6 flex-1 overflow-y-auto custom-scrollbar pr-2">
                                <div>
                                    <label className="text-[12px] font-black text-slate-400 uppercase mb-2 block">새 시험 이름</label>
                                    <input type="text" value={newName} onChange={e => setNewName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-black focus:border-blue-500 focus:bg-white outline-none transition-all placeholder:text-slate-300" placeholder="예: 2026_02_모의평가" />
                                </div>
                                <div>
                                    <label className="text-[12px] font-black text-slate-400 uppercase mb-2 block">학부 템플릿 선택</label>
                                    <select value={prevSheetName} onChange={e => setPrevSheetName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-black focus:border-blue-500 focus:bg-white outline-none transition-all">
                                        <option value="">템플릿 선택</option>
                                        {templates.map(n => <option key={n} value={n}>{n.replace('Template_', '')}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <select value={refSheets[0]} onChange={e => handleRefSheetChange(0, e.target.value)} className="bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-[11px] font-black focus:border-blue-500 outline-none">
                                        <option value="">1학기 전</option>
                                        {allTabNames.map(n => <option key={n} value={n}>{n}</option>)}
                                    </select>
                                    <select value={refSheets[1]} onChange={e => handleRefSheetChange(1, e.target.value)} className="bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-[11px] font-black focus:border-blue-500 outline-none">
                                        <option value="">2학기 전</option>
                                        {allTabNames.map(n => <option key={n} value={n}>{n}</option>)}
                                    </select>
                                    <select value={refSheets[2]} onChange={e => handleRefSheetChange(2, e.target.value)} className="bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-[11px] font-black focus:border-blue-500 outline-none">
                                        <option value="">3학기 전</option>
                                        {allTabNames.map(n => <option key={n} value={n}>{n}</option>)}
                                    </select>
                                </div>
                                <button onClick={handleCreateSheet} className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-black transition-all shadow-lg text-sm mt-4 shrink-0">성적표 자동화 생성 실행</button>
                            </div>
                        </div>

                        {/* 시험지 목록 카드 (오른쪽으로 이동) */}
                        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden flex flex-col h-[450px]">
                            <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                <h3 className="text-base font-black text-slate-900 flex items-center gap-3 uppercase tracking-widest">
                                    <Navigation className="w-5 h-5 text-blue-600" /> 시험지 목록 (TABS)
                                </h3>
                                <button onClick={loadSheetNames} className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="새로고침">
                                    <RefreshCcw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                                </button>
                            </div>
                            <div className="p-8 pb-4">
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input type="text" placeholder="시험지 검색..." value={tabSearch} onChange={e => setTabSearch(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[13px] font-black outline-none focus:border-blue-500 shadow-inner" />
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto px-8 pb-8 space-y-2 custom-scrollbar">
                                {allTabNames.filter(n => n.includes(tabSearch)).map(n => (
                                    <div key={n} className="flex items-center gap-2 group">
                                        <button onClick={() => setActiveTab(n)} className={cn("flex-1 text-left px-5 py-4 rounded-2xl text-[14px] font-black transition-all flex items-center justify-between", activeTab === n ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "hover:bg-slate-50 text-slate-600 hover:text-slate-900")}>
                                            <div className="flex items-center gap-3">
                                                <div className={cn("w-2.5 h-2.5 rounded-full", activeTab === n ? "bg-white" : "bg-slate-200")} />
                                                <span className="truncate">{n}</span>
                                            </div>
                                            {activeTab === n && <CheckCircle2 className="w-4 h-4 text-white" />}
                                        </button>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                            <button onClick={() => handleRenameTab(n)} className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="이름 변경">
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDeleteTab(n)} className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all" title="탭 삭제">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {allTabNames.length === 0 && <p className="text-center text-slate-300 py-20 italic">시험지 데이터가 없습니다.</p>}
                            </div>
                        </div>
                    </div>



                    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden ring-4 ring-blue-600/30">
                        <div className="p-10 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center bg-blue-600 gap-6">
                            <h3 className="text-xl font-black text-white flex items-center gap-3">
                                <div className="w-2 h-8 bg-white/30 rounded-full" />
                                {editingId ? '기록 데이터 수정 (EDIT)' : `${activeTab || '시험지'} 에 입력중입니다.`}
                            </h3>
                            <div className="flex flex-1 max-w-2xl w-full items-center gap-4">
                                {/* 학부 선택 강조 UI */}
                                <div className=" bg-white text-blue-600 rounded-2xl px-4 py-2 flex items-center gap-2 shadow-lg border-2 border-blue-600">
                                    <Building2 className="w-5 h-5" />
                                    <select
                                        value={formData.dept_type}
                                        onChange={e => setFormData(p => ({ ...p, dept_type: e.target.value }))}
                                        className="bg-transparent text-lg font-black outline-none border-none cursor-pointer min-w-[100px]"
                                    >
                                        <option value="">학부 선택 (필수)</option>
                                        <option value="초등부">초등부</option>
                                        <option value="중등부">중등부</option>
                                        <option value="고등부">고등부</option>
                                    </select>
                                </div>

                                <div className="h-8 w-px bg-white/30 mx-2" />

                                <div className="flex-1 flex items-center gap-2 bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/20 shadow-sm min-w-0">
                                    <Navigation className="w-6 h-6 text-white ml-2 shrink-0" />
                                    <select value={activeTab} onChange={e => setActiveTab(e.target.value)} className="w-full bg-transparent text-white text-base font-black outline-none border-none focus:ring-0 appearance-none cursor-pointer truncate">
                                        <option value="" className="text-slate-900">현재 대상 시험지 선택</option>
                                        {allTabNames
                                            .filter(n => {
                                                if (!formData.dept_type) return true;
                                                if (formData.dept_type === '초등부') return n.startsWith('초');
                                                if (formData.dept_type === '중등부') return n.startsWith('중');
                                                if (formData.dept_type === '고등부') return n.startsWith('고');
                                                return true;
                                            })
                                            .map(n => <option key={n} value={n} className="text-slate-900">{n}</option>)
                                        }
                                    </select>
                                    {activeTab && <span className="text-[11px] font-black bg-white text-blue-600 px-4 py-1.5 rounded-full shrink-0 mr-1 shadow-sm uppercase tracking-tighter">Active</span>}
                                </div>
                            </div>

                            <div className="flex gap-4">
                                {editingId && <button onClick={resetForm} className="px-6 py-2 text-xs font-black text-white bg-white/10 rounded-full hover:bg-white/20 transition-all border border-white/20">수정 취소</button>}
                            </div>
                        </div>

                        <div className="p-12 space-y-12">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                                {
                                    [
                                        { id: 'name', label: '학생 이름', placeholder: '학생 이름 입력', type: 'text', onChange: handleNameChange },
                                        // 학부 선택은 상단으로 이동했으므로 여기서 제거
                                        { id: 'school', label: '학교명', placeholder: '학교명 입력', type: 'text' },

                                        { id: 'grade', label: '학년', placeholder: '학년 선택', type: 'select', options: formData.dept_type ? GRADE_OPTIONS[formData.dept_type] : [] },
                                        { id: 'date', label: '응시일', placeholder: '날짜 선택', type: 'date' },
                                        { id: 'dept', label: '소속 단지', placeholder: '단지 선택', type: 'select', options: ['2단지', '10단지', '기타'] },
                                        { id: 'type', label: '시험 종류', placeholder: '종류 선택', type: 'select', options: ['재원생 반편성', '비원생 반편성', '재원생 재시험', '비원생 재시험', '기타'] }
                                    ].map(field => (
                                        <div key={field.id} className="space-y-3">
                                            <label className="text-[12px] font-black text-slate-500 uppercase tracking-widest pl-1">{field.label}</label>
                                            {field.type === 'select' ? (
                                                <select value={formData[field.id]} onChange={e => setFormData(p => ({ ...p, [field.id]: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black focus:border-blue-600 focus:bg-white outline-none transition-all">
                                                    <option value="">선택하세요</option>
                                                    {field.options.filter(o => o).map(o => (
                                                        <option key={o} value={o}>
                                                            {field.id === 'grade' ? (isNaN(o) ? o : o + '학년') : o}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <input
                                                    type={field.type}
                                                    id={field.id === 'dept_type' ? 'dept-type-select' : undefined}
                                                    value={formData[field.id]}
                                                    onChange={field.onChange || (e => setFormData(p => ({ ...p, [field.id]: e.target.value })))}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black focus:border-blue-600 focus:bg-white outline-none transition-all placeholder:text-slate-300 shadow-inner"
                                                    placeholder={field.placeholder}
                                                    max={field.type === 'date' ? todayStr : undefined}
                                                />
                                            )}
                                        </div>
                                    ))
                                }
                            </div>

                            <div className="pt-12 border-t-2 border-slate-50">
                                <div className="flex items-center gap-4 mb-8">
                                    <LayoutDashboard className="w-5 h-5 text-slate-400" />
                                    <label className="text-base font-black text-slate-900 uppercase tracking-[0.2em]">과목별 개수/점수 기록 (SCORE ENTRY)</label>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6">
                                    {(formData.dept_type ? (DEPT_SPECS[formData.dept_type]?.fields || []) : dynamicHeaders)
                                        .filter(h => h.toLowerCase().includes('raw') || (formData.dept_type && DEPT_SPECS[formData.dept_type]?.fields?.includes(h)))
                                        .map(header => {
                                            const spec = DEPT_SPECS[formData.dept_type];
                                            const max = spec ? spec.limits[header] : 100;
                                            const unit = spec && spec.units ? (spec.units[header] || '') : '';
                                            return (
                                                <div key={header} className="flex flex-col items-center space-y-2 p-3 bg-slate-50/50 rounded-2xl border border-transparent hover:border-blue-100 transition-all">
                                                    <label className="text-[11px] font-black uppercase tracking-tighter text-slate-400 text-center leading-tight h-8 flex flex-col justify-center">
                                                        <span>{header.replace(/\(RAW\)/i, '(Raw)').trim()}</span>
                                                        {max && <span className="text-[9px] text-slate-300 font-normal">MAX: {max}{unit}</span>}
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max={max}
                                                        value={(() => {
                                                            const norm = header.toLowerCase().replace(/\s+/g, '');
                                                            const key = Object.keys(formData.scores).find(k => k.toLowerCase().replace(/\s+/g, '') === norm);
                                                            return formData.scores[key || header] || '';
                                                        })()}
                                                        onChange={e => handleScoreChange(header, e.target.value)}
                                                        placeholder="0"
                                                        className="w-16 h-10 bg-white border border-slate-200 rounded-xl px-0 text-center text-base font-black outline-none focus:border-blue-500 transition-all shadow-sm"
                                                    />
                                                </div>
                                            );
                                        })}
                                    {(!formData.dept_type && dynamicHeaders.filter(h => h.toLowerCase().includes('raw')).length === 0) && (
                                        <p className="col-span-full text-center text-slate-300 py-10 italic text-sm">
                                            학부를 선택하시면 성적 입력칸이 활성화됩니다.
                                        </p>
                                    )}
                                </div>

                                {/* 과목별 점수 및 학기별 점수 */}
                                {formData.dept_type && (
                                    <div className="mt-8 p-8 bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-50 rounded-3xl border border-blue-200 shadow-xl">
                                        <div className="flex flex-col lg:flex-row gap-8">
                                            {/* 왼쪽: 과목별 점수 */}
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-6">
                                                    <LayoutDashboard className="w-6 h-6 text-blue-600" />
                                                    <h4 className="text-base font-black text-blue-900 uppercase tracking-wide">
                                                        {formData.dept_type} 과목별 점수
                                                    </h4>
                                                </div>

                                                {/* 과목 그리드 - 헤더와 점수 박스를 같은 컬럼에 정렬 */}
                                                <div className="grid grid-cols-3 lg:grid-cols-6 gap-4">
                                                    {(formData.dept_type === '고등부'
                                                        ? [
                                                            { label: '청해', max: 10 },
                                                            { label: '대의파악', max: 10 },
                                                            { label: '문법어휘', max: 20 },
                                                            { label: '세부사항', max: 5 },
                                                            { label: '빈칸추론', max: 28 },
                                                            { label: '간접쓰기', max: 27 }
                                                        ]
                                                        : [
                                                            { label: 'L/C', max: 10 },
                                                            { label: 'Voca', max: 25 },
                                                            { label: 'Gr', max: 25 },
                                                            { label: 'R/C', max: 15 },
                                                            { label: 'Syn', max: 25 },
                                                            { label: 'SUM', max: null }
                                                        ]
                                                    ).map((subject, idx) => {
                                                        const scoreValue = formData.scores?.[subject.label] || '-';
                                                        return (
                                                            <div key={idx} className="flex flex-col items-center">
                                                                {/* 헤더 */}
                                                                <div className="text-[11px] font-black text-blue-600 mb-2 text-center h-7 flex items-center justify-center">
                                                                    <span>{subject.label}</span>
                                                                    {subject.max && <span className="text-slate-400 ml-1">({subject.max})</span>}
                                                                </div>
                                                                {/* 점수 박스 */}
                                                                <div className="w-full px-3 py-3 bg-white text-blue-900 rounded-xl text-lg font-black border-2 border-blue-200 shadow-md hover:shadow-lg transition-shadow text-center">
                                                                    {scoreValue}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* 세로 구분선 */}
                                            <div className="hidden lg:block w-px bg-gradient-to-b from-transparent via-blue-300 to-transparent"></div>

                                            {/* 오른쪽: 학기별 점수 */}
                                            <div className="flex-1">
                                                <h4 className="text-base font-black text-blue-900 uppercase tracking-wide mb-6">
                                                    이전 학기 점수
                                                </h4>

                                                <div className="grid grid-cols-4 gap-3">
                                                    {[
                                                        { label: '3학기 전', value: formData.scores?.['3학기전SUM'] || '-' },
                                                        { label: '2학기 전', value: formData.scores?.['2학기전SUM'] || '-' },
                                                        { label: '1학기 전', value: formData.scores?.['1학기전SUM'] || '-' },
                                                        { label: '이번 현재', value: formData.scores?.['SUM'] || '-' }
                                                    ].map((item, i) => (
                                                        <div key={i} className="flex flex-col">
                                                            {/* 라벨을 박스 밖으로 */}
                                                            <div className="text-[10px] font-black text-slate-600 uppercase tracking-wide mb-2 text-center">
                                                                {item.label}
                                                            </div>
                                                            {/* 점수만 박스에 크게 표시 */}
                                                            <div className={cn(
                                                                "py-4 bg-white rounded-xl shadow-md border-2 text-center hover:shadow-lg transition-shadow",
                                                                i === 3 ? "border-blue-500" : "border-slate-200"
                                                            )}>
                                                                <span className={cn(
                                                                    "text-2xl font-black",
                                                                    i === 3 ? "text-blue-600" : "text-slate-700"
                                                                )}>{item.value}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                            </div>

                            <div className="flex justify-end pt-6">
                                <button onClick={submitGrade} disabled={isLoading} className={cn("bg-blue-600 text-white font-black px-16 py-5 rounded-[2rem] flex items-center gap-4 text-lg transition-all shadow-2xl shadow-blue-200 hover:scale-105 active:scale-95", isLoading ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-700")}>
                                    <Save className="w-6 h-6" /> {editingId ? '변경 사항 적용하기' : '금회차 성적 최종 저장'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Student List & Trend Chart Grid */}
                    <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 items-start">
                        {/* Left: Student List (3/4 width) */}
                        <div className="xl:col-span-3 bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden flex flex-col">
                            <div className="p-10 border-b border-slate-100 bg-slate-50/50 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8">
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 tracking-tight">응시 학생 관리 및 실시간 현황</h3>
                                    <p className="text-[11px] text-slate-400 font-black mt-2 uppercase tracking-[0.2em] flex items-center gap-2 px-3 py-1 bg-white border border-slate-100 rounded-full w-fit">
                                        <User className="w-3 h-3" /> LIST: {filteredList.length} Students
                                    </p>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
                                    <div className="relative flex-1 sm:w-80">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input type="text" placeholder="이름, 학교, 학년, 소속 등 통합 검색..." value={listSearch} onChange={e => setListSearch(e.target.value)} className="w-full pl-12 pr-6 py-3.5 bg-white border border-slate-200 rounded-[1.5rem] text-sm font-black outline-none focus:border-blue-600 shadow-sm" />
                                    </div>
                                    <div className="flex bg-slate-100 border border-slate-200 rounded-[1.5rem] p-1.5 shadow-inner">
                                        {[
                                            { id: 'all', label: '전체보기' },
                                            { id: 'completed', label: '입력완료' },
                                            { id: 'incomplete', label: '미완료' }
                                        ].map(f => (
                                            <button key={f.id} onClick={() => setStatusFilter(f.id)} className={cn("px-6 py-2 text-[11px] font-black rounded-2xl transition-all", statusFilter === f.id ? "bg-white text-slate-900 shadow-md" : "text-slate-500 hover:text-slate-900")}>{f.label}</button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="overflow-x-auto custom-scrollbar">
                                <table className="w-full text-left border-collapse min-w-[1000px]">
                                    <thead>
                                        <tr className="bg-slate-50/80 text-[11px] uppercase font-black text-slate-500 tracking-widest border-b border-slate-100">
                                            <th className="px-8 py-5 w-12 text-center">
                                                <input
                                                    type="checkbox"
                                                    className="rounded-md w-4 h-4 border-slate-300 text-blue-600 focus:ring-blue-500"
                                                    onChange={handleSelectAll}
                                                    checked={filteredList.length > 0 && selectedStudents.size === filteredList.length}
                                                />
                                            </th>
                                            <th className="px-6 py-5">상태</th>
                                            <th className="px-6 py-5">학생 기본 정보</th>
                                            <th className="px-6 py-5">시험지 및 일시</th>
                                            <th className="px-6 py-5">입력 상황 (Score Status)</th>
                                            <th className="px-8 py-5 text-right">관리 기능</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {paginatedList.map(s => {
                                            // Google Sheets의 SUM 값만 사용
                                            const studentSum = parseFloat(s.scores['SUM']) || 0;
                                            const isComp = isStudentComplete(s);

                                            return (
                                                <tr key={s.id} className={cn("hover:bg-blue-50/20 transition-all group cursor-pointer", selectedStudents.has(s.id) && "bg-blue-50/30")} onClick={() => toggleStudentSelection(s.id)}>
                                                    <td className="px-8 py-6 text-center" onClick={(e) => e.stopPropagation()}>
                                                        <input
                                                            type="checkbox"
                                                            className="rounded-md w-4 h-4 border-slate-200"
                                                            checked={selectedStudents.has(s.id)}
                                                            onChange={() => toggleStudentSelection(s.id)}
                                                        />
                                                    </td>
                                                    <td className="px-6 py-6" onClick={(e) => e.stopPropagation()}>
                                                        {isComp ? (
                                                            <span className="flex items-center gap-2 text-[10px] font-black text-green-700 bg-green-50 px-3 py-1.5 rounded-full border border-green-100"><CheckCircle2 className="w-3.5 h-3.5" /> 완료</span>
                                                        ) : (
                                                            <span className="flex items-center gap-2 text-[10px] font-black text-amber-700 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-100"><Circle className="w-3.5 h-3.5" /> 미완</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-6" onClick={(e) => e.stopPropagation()}>
                                                        <div className="text-base font-black text-slate-900 group-hover:text-blue-600 transition-colors">{s.name}</div>
                                                        <div className="text-[11px] text-slate-400 font-black mt-1.5 flex items-center gap-2">
                                                            <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-black">{s.grade}학년</span>
                                                            <span>{s.school}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-6" onClick={(e) => e.stopPropagation()}>
                                                        <div className="text-[12px] font-black text-slate-700">{s.date || '날짜 미지정'}</div>
                                                        <div className="text-[11px] text-slate-400 font-black mt-1.5">{s.dept} · {s.type}</div>
                                                        {s.ref && <div className="text-[9px] text-blue-600 font-black mt-1 bg-blue-50 px-2 py-1 rounded-xl w-fit italic tracking-tighter shadow-sm border border-blue-100 flex items-center gap-1"><History className="w-3 h-3" /> {s.ref}</div>}
                                                    </td>
                                                    <td className="px-6 py-6" onClick={(e) => e.stopPropagation()}>
                                                        <div className="flex items-center gap-4">
                                                            <div className="text-xl font-black text-slate-900 w-16 text-center bg-slate-50 p-2 rounded-xl">{studentSum}</div>
                                                            <div className="grid grid-cols-3 gap-x-4 gap-y-1">
                                                                {(s.dept_type ? DEPT_SPECS[s.dept_type].fields : dynamicHeaders.filter(h => h.toLowerCase().includes('raw') || h.includes('보정')))
                                                                    .map(h => {
                                                                        const norm = h.toLowerCase().replace(/\s+/g, '');
                                                                        const key = Object.keys(s.scores).find(k => k.toLowerCase().replace(/\s+/g, '') === norm);
                                                                        const v = s.scores[key || h] || '';
                                                                        return (
                                                                            <div key={h} className="text-[9px] font-black flex gap-1.5 items-center">
                                                                                <span className="text-slate-300 uppercase">{h.replace(/\(Raw\)/i, '').trim()}:</span>
                                                                                <span className={cn("px-1 rounded", v === '' ? "text-slate-200" : "text-slate-600 bg-slate-50")}>{v || '-'}</span>
                                                                            </div>
                                                                        );
                                                                    })}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6 text-right" onClick={(e) => e.stopPropagation()}>
                                                        <div className="flex justify-end gap-3 opacity-40 group-hover:opacity-100 transition-all">
                                                            <button onClick={() => setShowReport(s)} className="p-3 text-slate-500 hover:text-green-600 hover:bg-green-50 rounded-2xl transition-all" title="성적표 미리보기"><FileText className="w-5 h-5" /></button>
                                                            <button onClick={() => startEdit(s)} className="p-3 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all" title="수정"><Pencil className="w-5 h-5" /></button>
                                                            <button onClick={() => deleteStudent(s.id)} className="p-3 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all" title="삭제"><Trash2 className="w-5 h-5" /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {filteredList.length === 0 && (
                                            <tr><td colSpan="6" className="px-6 py-20 text-center text-slate-400 text-sm font-black italic tracking-widest">데이터를 찾을 수 없거나 조건에 맞는 학생이 없습니다.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            <div className="p-6 border-t border-slate-100 bg-slate-50/30 flex justify-center items-center gap-4">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="px-4 py-2 text-xs font-black text-slate-500 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    &lt; 이전
                                </button>
                                <span className="text-xs font-black text-slate-900">
                                    {currentPage} / {Math.max(1, totalPages)}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages || totalPages === 0}
                                    className="px-4 py-2 text-xs font-black text-slate-500 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    다음 &gt;
                                </button>
                            </div>
                        </div>

                        {/* Right: Trend Chart (1/4 width) */}
                        <div className="xl:col-span-1 space-y-6">
                            {selectedStudents.size > 0 ? (
                                Array.from(selectedStudents).map(studentId => {
                                    const student = studentList.find(s => s.id === studentId);
                                    if (!student) return null;

                                    // Use cached trend data
                                    const cached = trendCache[studentId];
                                    const currentSum = parseFloat(student.scores['SUM']) || 0;

                                    // If cached exists, use it. But replace the last element (current) with the latest studentSum
                                    let trendData = cached ? [...cached] : [0, 0, 0, currentSum];
                                    if (trendData.length > 0) trendData[trendData.length - 1] = currentSum;

                                    const labels = ['3학기 전', '2학기 전', '1학기 전', '현재'];

                                    // Line Chart 설정을 위한 계산
                                    const maxScore = 100;
                                    const points = trendData.map((score, i) => {
                                        const x = (i / (trendData.length - 1)) * 100;
                                        const y = 100 - (Math.min(score, maxScore) / maxScore * 100);
                                        return `${x},${y}`;
                                    }).join(' ');

                                    return (
                                        <div key={studentId} className="bg-white rounded-[2.5rem] border border-slate-200 p-6 shadow-sm animate-in fade-in slide-in-from-right-4 duration-500 sticky top-6">
                                            <div className="flex flex-col gap-2 mb-6">
                                                <div className="flex items-center justify-between">
                                                    <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                                                        <TrendingUp className="w-5 h-5 text-blue-600" /> {student.name}
                                                    </h3>
                                                    <button onClick={() => toggleStudentSelection(studentId)} className="text-slate-300 hover:text-slate-500"><X className="w-4 h-4" /></button>
                                                </div>
                                                <p className="text-[10px] text-slate-400 font-bold">성적 추세 분석 (Trend Analysis)</p>
                                                {!cached && <p className="text-[9px] text-blue-400 animate-pulse">데이터 로딩 중...</p>}
                                            </div>

                                            <div className="relative h-40 w-full">
                                                {/* 배경 그리드 */}
                                                <div className="absolute inset-0 flex flex-col justify-between text-[9px] text-slate-300 pointer-events-none">
                                                    <div className="border-b border-slate-50 flex items-center">100</div>
                                                    <div className="border-b border-slate-50 flex items-center">50</div>
                                                    <div className="border-b border-slate-50 flex items-center">0</div>
                                                </div>

                                                <svg className="w-full h-full overflow-visible relative z-10" preserveAspectRatio="none" viewBox="0 0 100 100">
                                                    <polyline fill="none" stroke="#2563EB" strokeWidth="2" points={points} className="drop-shadow-md" vectorEffect="non-scaling-stroke" />
                                                    <path d={`M0,100 ${points.split(' ').map(p => 'L' + p).join(' ')} L100,100 Z`} fill="url(#gradient-mini)" className="opacity-10" vectorEffect="non-scaling-stroke" />
                                                    <defs>
                                                        <linearGradient id="gradient-mini" x1="0" x2="0" y1="0" y2="1">
                                                            <stop offset="0%" stopColor="#2563EB" />
                                                            <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
                                                        </linearGradient>
                                                    </defs>
                                                    {trendData.map((score, i) => {
                                                        const x = (i / (trendData.length - 1)) * 100;
                                                        const y = 100 - (Math.min(score, maxScore) / maxScore * 100);
                                                        return (
                                                            <g key={i}>
                                                                <circle cx={x} cy={y} r="2" fill="white" stroke="#2563EB" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                                                                <text x={x} y={y - 8} textAnchor="middle" fill="#1E293B" fontSize="8" fontWeight="900">{score}</text>
                                                                <text x={x} y={115} textAnchor="middle" fill="#94A3B8" fontSize="7" fontWeight="700">{['3학기전', '2학기전', '1학기전', '현재'][i]}</text>
                                                            </g>
                                                        );
                                                    })}
                                                </svg>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="bg-slate-50 rounded-[2.5rem] border border-slate-200 border-dashed p-10 flex flex-col items-center justify-center text-center h-[400px]">
                                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                        <TrendingUp className="w-8 h-8 text-slate-300" />
                                    </div>
                                    <p className="text-sm font-black text-slate-400">학생을 선택하여<br />성적 추세를 확인하세요.</p>
                                    <p className="text-[10px] text-slate-300 mt-2">목록의 체크박스를 클릭하세요.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div >
            </main >

            {/* Report Modal */}
            {
                showReport && (() => {
                    // 학부 유추
                    const dept_type = showReport.dept_type ||
                        (['초4', '초5', '초6'].includes(showReport.grade) ? '초등부' :
                         ['중1', '중2', '중3'].includes(showReport.grade) ? '중등부' : '고등부');

                    const isElementary = dept_type === '초등부';

                    // 학부별 테마
                    const theme = isElementary ? {
                        primary: "bg-orange-400",
                        secondary: "bg-orange-50",
                        border: "border-orange-200",
                        text: "text-orange-600",
                        accent: "#fb923c",
                        title: "나의 성장 기록지 🍎"
                    } : {
                        primary: "bg-indigo-700",
                        secondary: "bg-indigo-50",
                        border: "border-indigo-200",
                        text: "text-indigo-700",
                        accent: "#4338ca",
                        title: "학업 성취 분석표"
                    };

                    // 학부별 주요 과목 데이터 (학생 정보 섹션용)
                    const isHighSchool = dept_type === '고등부';
                    const headerSubjects = isHighSchool
                        ? ['청해', '대의파악', '문법어휘', '세부사항', '빈칸추론', '간접쓰기']
                        : ['L/C', 'Voca', 'Gr', 'R/C', 'Syn', 'SUM'];

                    const headerScores = headerSubjects.map(subject => ({
                        subject,
                        score: parseFloat(showReport.scores?.[subject]) || 0
                    }));

                    // 5과목 데이터 (기본 교과)
                    const data5 = ['L/C', 'Voca', 'Gr', 'R/C', 'Syn'].map(subject => ({
                        subject,
                        score: parseFloat(showReport.scores?.[subject]) || 0,
                        top30: parseFloat(showReport.scores?.[`${subject}(30%)`]) || 0,
                        average: parseFloat(showReport.scores?.[`${subject}(av)`]) || 0,
                        grade: isElementary ? (
                            parseFloat(showReport.scores?.[subject]) >= parseFloat(showReport.scores?.[`${subject}(30%)`])
                                ? '매우 잘함' : '잘함'
                        ) : null
                    }));

                    // 레이더 차트용 카테고리 (기존 유지)
                    const radarCategories = ['L/C', 'Voca', 'Gr', 'R/C', 'Syn'];
                    const radarData = {
                        student: radarCategories.map(cat => parseFloat(showReport.scores?.[cat]) || 0),
                        percentile30: radarCategories.map(cat => parseFloat(showReport.scores?.[`${cat}(30%)`]) || 0),
                        average: radarCategories.map(cat => parseFloat(showReport.scores?.[`${cat}(av)`]) || 0)
                    };

                    // 4과목 데이터 (종합 지표)
                    const data4 = ['EnglishSense', 'EnglishLogic', 'GPAindex', 'CSATindex'].map(subject => ({
                        subject: subject.replace('English', 'English ').replace('index', ' Index'),
                        rawSubject: subject,
                        score: parseFloat(showReport.scores?.[subject]) || 0,
                        top30: parseFloat(showReport.scores?.[`${subject}(30%)`]) || 0,
                        average: parseFloat(showReport.scores?.[`${subject}(av)`]) || 0
                    }));

                    // 막대 그래프 데이터 (기존 유지)
                    const barCategories = ['EnglishSense', 'EnglishLogic', 'GPAindex', 'CSATindex'];
                    const barData = {
                        student: barCategories.map(cat => parseFloat(showReport.scores?.[cat]) || 0),
                        percentile30: barCategories.map(cat => parseFloat(showReport.scores?.[`${cat}(30%)`]) || 0),
                        average: barCategories.map(cat => parseFloat(showReport.scores?.[`${cat}(av)`]) || 0)
                    };

                    // PDF 출력 핸들러
                    const handlePrintPDF = () => {
                        const originalTitle = document.title;
                        document.title = `${showReport.name}_성적표`;
                        window.print();
                        setTimeout(() => { document.title = originalTitle; }, 1000);
                    };

                    // AI 분석 생성
                    const generateAIAnalysis = () => {
                        const avgScore = data5.reduce((sum, d) => sum + d.score, 0) / data5.length;
                        const strongestSubject = data5.reduce((max, d) => d.score > max.score ? d : max);
                        const weakestSubject = data5.reduce((min, d) => d.score < min.score ? d : min);
                        return {
                            overall: avgScore >= 20 ? "우수" : avgScore >= 15 ? "양호" : "보통",
                            strength: strongestSubject.subject,
                            weakness: weakestSubject.subject,
                            recommendation: avgScore >= 20
                                ? `${weakestSubject.subject} 영역의 추가 학습을 통해 더욱 균형 잡힌 실력을 갖출 수 있습니다.`
                                : `기본기 강화를 위한 ${weakestSubject.subject} 집중 학습을 권장합니다.`
                        };
                    };

                    const aiAnalysis = generateAIAnalysis();

                    // 레이더 차트 SVG 생성 함수
                    const createRadarChart = () => {
                        const size = 300;
                        const center = size / 2;
                        const maxValue = 100;
                        const levels = 5;
                        const angleStep = (Math.PI * 2) / radarCategories.length;

                        // 좌표 계산 함수
                        const getPoint = (value, index, radius = 120) => {
                            const angle = angleStep * index - Math.PI / 2;
                            const r = (value / maxValue) * radius;
                            return {
                                x: center + r * Math.cos(angle),
                                y: center + r * Math.sin(angle)
                            };
                        };

                        // 폴리곤 포인트 생성
                        const createPolygon = (values, radius = 120) => {
                            return values.map((v, i) => {
                                const point = getPoint(v, i, radius);
                                return `${point.x},${point.y}`;
                            }).join(' ');
                        };

                        return (
                            <svg width={size} height={size} className="mx-auto">
                                {/* 배경 레벨 */}
                                {[...Array(levels)].map((_, i) => {
                                    const radius = ((i + 1) / levels) * 120;
                                    const points = radarCategories.map((_, idx) => {
                                        const point = getPoint(maxValue, idx, radius);
                                        return `${point.x},${point.y}`;
                                    }).join(' ');
                                    return (
                                        <polygon
                                            key={i}
                                            points={points}
                                            fill="none"
                                            stroke="#e2e8f0"
                                            strokeWidth="1"
                                        />
                                    );
                                })}

                                {/* 축 선 */}
                                {radarCategories.map((cat, i) => {
                                    const point = getPoint(maxValue, i);
                                    return (
                                        <line
                                            key={i}
                                            x1={center}
                                            y1={center}
                                            x2={point.x}
                                            y2={point.y}
                                            stroke="#cbd5e1"
                                            strokeWidth="1"
                                        />
                                    );
                                })}

                                {/* 평균 데이터 (가장 뒤) */}
                                <polygon
                                    points={createPolygon(radarData.average)}
                                    fill="rgba(148, 163, 184, 0.1)"
                                    stroke="#94a3b8"
                                    strokeWidth="2"
                                />

                                {/* 30% 백분위 데이터 */}
                                <polygon
                                    points={createPolygon(radarData.percentile30)}
                                    fill="rgba(251, 191, 36, 0.1)"
                                    stroke="#f59e0b"
                                    strokeWidth="2"
                                />

                                {/* 학생 데이터 (가장 앞) */}
                                <polygon
                                    points={createPolygon(radarData.student)}
                                    fill="rgba(37, 99, 235, 0.2)"
                                    stroke="#2563eb"
                                    strokeWidth="3"
                                />

                                {/* 데이터 포인트 */}
                                {radarData.student.map((v, i) => {
                                    const point = getPoint(v, i);
                                    return (
                                        <circle
                                            key={i}
                                            cx={point.x}
                                            cy={point.y}
                                            r="4"
                                            fill="#2563eb"
                                        />
                                    );
                                })}

                                {/* 카테고리 라벨 */}
                                {radarCategories.map((cat, i) => {
                                    const labelPoint = getPoint(maxValue, i, 140);
                                    return (
                                        <text
                                            key={i}
                                            x={labelPoint.x}
                                            y={labelPoint.y}
                                            textAnchor="middle"
                                            dominantBaseline="middle"
                                            className="text-xs font-black fill-slate-700"
                                        >
                                            {cat}
                                        </text>
                                    );
                                })}
                            </svg>
                        );
                    };

                    // 막대 그래프 생성 함수
                    const createBarChart = () => {
                        const maxValue = Math.max(...barData.student, ...barData.percentile30, ...barData.average, 100);
                        return (
                            <div className="space-y-6">
                                {barCategories.map((cat, idx) => (
                                    <div key={cat} className="space-y-2">
                                        <div className="text-xs font-black text-slate-700">{cat}</div>
                                        <div className="flex gap-2 items-center">
                                            {/* 학생 점수 */}
                                            <div className="flex-1 space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-full bg-slate-100 rounded-full h-6 overflow-hidden">
                                                        <div
                                                            className="bg-blue-600 h-full flex items-center justify-end pr-2"
                                                            style={{ width: `${(barData.student[idx] / maxValue) * 100}%` }}
                                                        >
                                                            <span className="text-[10px] font-black text-white">
                                                                {barData.student[idx]}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <span className="text-[10px] text-slate-400 w-16">본인</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-full bg-slate-100 rounded-full h-6 overflow-hidden">
                                                        <div
                                                            className="bg-amber-500 h-full flex items-center justify-end pr-2"
                                                            style={{ width: `${(barData.percentile30[idx] / maxValue) * 100}%` }}
                                                        >
                                                            <span className="text-[10px] font-black text-white">
                                                                {barData.percentile30[idx]}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <span className="text-[10px] text-slate-400 w-16">상위30%</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-full bg-slate-100 rounded-full h-6 overflow-hidden">
                                                        <div
                                                            className="bg-slate-400 h-full flex items-center justify-end pr-2"
                                                            style={{ width: `${(barData.average[idx] / maxValue) * 100}%` }}
                                                        >
                                                            <span className="text-[10px] font-black text-white">
                                                                {barData.average[idx]}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <span className="text-[10px] text-slate-400 w-16">평균</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        );
                    };

                    return (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm overflow-auto">
                            <div className="w-full max-w-[210mm] min-h-[297mm] bg-slate-200 rounded-lg shadow-2xl overflow-hidden my-8 print:my-0 print:shadow-none print:rounded-none print:bg-white">
                                {/* 화면 전용 닫기 버튼 */}
                                <div className="print:hidden absolute top-4 right-4 z-10">
                                    <button onClick={() => setShowReport(null)} className="p-3 bg-white rounded-full shadow-lg hover:bg-slate-100 transition-all">
                                        <X className="w-6 h-6 text-slate-700" />
                                    </button>
                                </div>

                                {/* A4 컨테이너 */}
                                <div className="bg-white mx-auto shadow-2xl print:shadow-none" style={{ width: '210mm', minHeight: '297mm', padding: '15mm' }}>

                                    {/* 헤더 */}
                                    <div className={`border-b-4 ${theme.border} pb-6 mb-8 flex justify-between items-center`}>
                                        <div>
                                            <h1 className={`text-3xl font-black ${theme.text}`}>{theme.title}</h1>
                                            <p className="text-slate-500 text-sm mt-1">{showReport.school} | {showReport.date || new Date().toLocaleDateString('ko-KR')}</p>
                                        </div>
                                        <School className={`${theme.text}`} size={48} />
                                    </div>

                                    {/* 학생 정보 */}
                                    <div className={`grid grid-cols-5 gap-4 mb-8 p-4 rounded-2xl ${theme.secondary} border ${theme.border}`}>
                                        {/* 사진 영역 */}
                                        <div className="col-span-1 bg-white rounded-xl flex items-center justify-center border border-slate-200 h-32">
                                            <User size={48} className="text-slate-300" />
                                        </div>

                                        {/* 기본 정보 */}
                                        <div className="col-span-2 flex flex-col justify-center gap-3">
                                            <div className="flex justify-between border-b border-slate-300 py-1 px-2">
                                                <span className="text-xs font-bold text-slate-500">성명</span>
                                                <span className="text-sm font-black">{showReport.name}</span>
                                            </div>
                                            <div className="flex justify-between border-b border-slate-300 py-1 px-2">
                                                <span className="text-xs font-bold text-slate-500">학년</span>
                                                <span className="text-sm font-black">{showReport.grade}</span>
                                            </div>
                                        </div>

                                        {/* 과목별 점수 그리드 */}
                                        <div className="col-span-2 bg-white rounded-xl border border-red-300 p-3">
                                            <div className="grid grid-cols-3 gap-2 h-full">
                                                {headerScores.map((item, i) => (
                                                    <div key={i} className="flex flex-col items-center justify-center">
                                                        <span className="text-[9px] font-bold text-slate-500 mb-1">{item.subject}</span>
                                                        <span className="text-sm font-black text-slate-800">{item.score}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* 기본 교과 분석 (5과목) */}
                                    <div className="mb-10">
                                        <div className={`flex items-center gap-2 mb-4 ${theme.text}`}>
                                            <BookOpen size={20} />
                                            <h2 className="text-lg font-bold">기본 교과 분석 (5과목)</h2>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6 h-64">
                                            <div className="h-full border border-slate-100 rounded-xl p-2 flex items-center justify-center">
                                                {createRadarChart()}
                                            </div>

                                            <table className="text-xs w-full h-fit border-collapse">
                                                <thead>
                                                    <tr className={`${theme.primary} text-white`}>
                                                        <th className="p-2 border border-slate-200">과목</th>
                                                        <th className="p-2 border border-slate-200">{isElementary ? '성취도' : '점수'}</th>
                                                        <th className="p-2 border border-slate-200">상위 30%</th>
                                                        <th className="p-2 border border-slate-200">평균</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {data5.map((item, i) => (
                                                        <tr key={i} className="text-center">
                                                            <td className="p-2 border border-slate-200 font-bold bg-slate-50">{item.subject}</td>
                                                            <td className={`p-2 border border-slate-200 font-bold ${item.score >= item.top30 ? 'text-green-600' : ''}`}>
                                                                {isElementary ? item.grade : item.score}
                                                            </td>
                                                            <td className="p-2 border border-slate-200 text-slate-500">{item.top30}</td>
                                                            <td className="p-2 border border-slate-200 text-slate-500">{item.average}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* 2열 레이아웃: 종합 지표 + AI 분석 */}
                                    <div className="grid grid-cols-3 gap-6 mb-10">
                                        {/* 종합 지표 분석 (2/3) */}
                                        <div className="col-span-2">
                                            <div className={`flex items-center gap-2 mb-4 ${theme.text}`}>
                                                <Award size={20} />
                                                <h2 className="text-lg font-bold">{isElementary ? '즐거운 생활 분석 (4과목)' : '종합 지표 분석 (4과목)'}</h2>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 h-64">
                                                <table className="text-xs w-full h-fit border-collapse">
                                                    <thead>
                                                        <tr className={`${theme.primary} text-white`}>
                                                            <th className="p-2 border border-slate-200">과목</th>
                                                            <th className="p-2 border border-slate-200">점수</th>
                                                            <th className="p-2 border border-slate-200">상위 30%</th>
                                                            <th className="p-2 border border-slate-200">평균</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {data4.map((item, i) => (
                                                            <tr key={i} className="text-center">
                                                                <td className="p-2 border border-slate-200 font-bold bg-slate-50 text-[10px]">{item.subject}</td>
                                                                <td className="p-2 border border-slate-200 font-bold">{item.score}</td>
                                                                <td className="p-2 border border-slate-200 text-slate-400">{item.top30}</td>
                                                                <td className="p-2 border border-slate-200 text-slate-400">{item.average}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                                <div className="h-full border border-slate-100 rounded-xl p-2 flex items-center justify-center">
                                                    {createBarChart()}
                                                </div>
                                            </div>
                                        </div>

                                        {/* AI 분석 (1/3) */}
                                        <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-6 border-2 border-purple-200">
                                            <div className="flex items-center gap-2 mb-4 text-purple-700">
                                                <Database size={18} />
                                                <h3 className="text-sm font-black">AI 성적 분석</h3>
                                            </div>
                                            <div className="space-y-4">
                                                <div className="bg-white/70 p-3 rounded-xl">
                                                    <div className="text-[10px] text-slate-500 font-bold mb-1">종합 평가</div>
                                                    <div className={`text-lg font-black ${aiAnalysis.overall === '우수' ? 'text-green-600' : aiAnalysis.overall === '양호' ? 'text-blue-600' : 'text-slate-600'}`}>
                                                        {aiAnalysis.overall}
                                                    </div>
                                                </div>
                                                <div className="bg-white/70 p-3 rounded-xl">
                                                    <div className="text-[10px] text-slate-500 font-bold mb-1">강점 과목</div>
                                                    <div className="text-base font-black text-green-600">{aiAnalysis.strength}</div>
                                                </div>
                                                <div className="bg-white/70 p-3 rounded-xl">
                                                    <div className="text-[10px] text-slate-500 font-bold mb-1">보완 필요</div>
                                                    <div className="text-base font-black text-orange-600">{aiAnalysis.weakness}</div>
                                                </div>
                                                <div className="bg-white/70 p-3 rounded-xl">
                                                    <div className="text-[10px] text-slate-500 font-bold mb-1">학습 제안</div>
                                                    <div className="text-[11px] text-slate-700 leading-relaxed">{aiAnalysis.recommendation}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 하단: 목록 + 추세 그래프 (4:1 비율) */}
                                    <div className="grid grid-cols-5 gap-6 mb-10 mt-10 pt-8 border-t-2 border-slate-100">
                                        {/* 좌측: 목록 (4/5) */}
                                        <div className="col-span-4">
                                            <div className={`flex items-center gap-2 mb-4 ${theme.text}`}>
                                                <BookOpen size={18} />
                                                <h3 className="text-base font-bold">학습 활동 기록</h3>
                                            </div>
                                            <div className="space-y-2">
                                                {[
                                                    { date: '2026-01-15', activity: '단어 테스트', score: '85/100' },
                                                    { date: '2026-01-22', activity: '문법 평가', score: '92/100' },
                                                    { date: '2026-01-29', activity: '독해 연습', score: '88/100' },
                                                    { date: '2026-02-05', activity: '듣기 평가', score: '90/100' },
                                                    { date: '2026-02-12', activity: '종합 평가', score: '91/100' }
                                                ].map((item, i) => (
                                                    <div key={i} className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
                                                        <div className="flex items-center gap-4">
                                                            <span className="text-xs text-slate-500 font-medium w-20">{item.date}</span>
                                                            <span className="text-sm font-bold text-slate-700">{item.activity}</span>
                                                        </div>
                                                        <span className="text-sm font-black text-blue-600">{item.score}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* 우측: 추세 그래프 (1/5) */}
                                        <div className="col-span-1">
                                            <div className={`flex items-center gap-2 mb-4 ${theme.text}`}>
                                                <TrendingUp size={18} />
                                                <h3 className="text-xs font-bold">추세</h3>
                                            </div>
                                            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 h-64">
                                                <svg viewBox="0 0 100 150" className="w-full h-full">
                                                    {/* 배경 그리드 */}
                                                    {[0, 25, 50, 75, 100].map((y) => (
                                                        <line key={y} x1="10" y1={10 + y} x2="90" y2={10 + y} stroke="#e2e8f0" strokeWidth="0.5" />
                                                    ))}

                                                    {/* 추세선 */}
                                                    <polyline
                                                        points="10,90 30,75 50,80 70,65 90,60"
                                                        fill="none"
                                                        stroke="#3b82f6"
                                                        strokeWidth="2"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    />

                                                    {/* 데이터 포인트 */}
                                                    {[
                                                        { x: 10, y: 90 },
                                                        { x: 30, y: 75 },
                                                        { x: 50, y: 80 },
                                                        { x: 70, y: 65 },
                                                        { x: 90, y: 60 }
                                                    ].map((point, i) => (
                                                        <circle key={i} cx={point.x} cy={point.y} r="2" fill="#3b82f6" />
                                                    ))}

                                                    {/* Y축 레이블 */}
                                                    <text x="2" y="15" fontSize="6" fill="#64748b">100</text>
                                                    <text x="2" y="110" fontSize="6" fill="#64748b">0</text>
                                                </svg>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 푸터 */}
                                    <div className="mt-auto pt-10 border-t-2 border-slate-100 text-center relative">
                                        <p className="text-sm font-bold text-slate-700">위 학생의 학업 성취 결과를 정히 통보합니다.</p>
                                        <p className="text-xs text-slate-400 mt-2">이 문서는 교육용 시스템에 의해 자동 생성되었습니다.</p>

                                        <div className="mt-8 flex justify-center">
                                            <div className="relative">
                                                <p className="text-xl font-black tracking-[10px] text-slate-800">{showReport.school}장</p>
                                                <div className="absolute -right-12 -top-4 w-16 h-16 border-4 rounded-full flex items-center justify-center border-red-500/50 opacity-60 rotate-12">
                                                    <span className="text-red-600 text-[10px] font-bold">인 생략</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 출력 버튼 (화면에만 표시) */}
                                        <button
                                            onClick={handlePrintPDF}
                                            className="print:hidden mt-8 bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold shadow-lg flex items-center gap-3 hover:bg-blue-700 transition-all mx-auto"
                                        >
                                            <Printer size={18} /> PDF 저장/인쇄
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* 인쇄 스타일 */}
                            <style dangerouslySetInnerHTML={{ __html: `
                                @media print {
                                    body { background: white !important; padding: 0 !important; }
                                    @page {
                                        size: A4;
                                        margin: 0;
                                    }
                                }
                            `}} />
                        </div>
                    );
                })()
            }
        </div >
    );
};

export default App;