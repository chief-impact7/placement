import React, { useMemo, useState, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    RadarChart, PolarGrid, PolarAngleAxis, Radar, Legend
} from 'recharts';
import {
    Printer, User, BookOpen, Award, School, Star, TrendingUp, X, GraduationCap, FileText, Calendar, RefreshCw
} from 'lucide-react';
import { generateStudentReportData } from './services/aiService';

// 전역 캐시 변수 (리렌더링 시 보존)
const aiCache = new Map();

// 학부별 과목 구성
const SUBJECTS = {
    '초등부': ['L/C', 'Voca', 'Gr', 'R/C', 'Syn'],
    '중등부': ['L/C', 'Voca', 'Gr', 'R/C', 'Syn'],
    '고등부': ['청해', '대의파악', '문법어휘', '세부사항', '빈칸추론', '간접쓰기']
};

const LOGO_URL = "https://i.imgur.com/a4XeF5x.png";

const ReportCard = ({ student, spreadsheetId, onClose }) => {
    const dept = student.dept_type || '중등부';
    const isHighSchool = dept === '고등부';
    const isElementary = dept === '초등부';

    // 테마 설정
    const getTheme = () => {
        if (isHighSchool) {
            return {
                primary: "bg-[#1e293b]", // Slate-800
                secondary: "bg-slate-50",
                border: "border-slate-200",
                text: "text-slate-900",
                accent: "#0f172a",
                chartMy: "#3b82f6", // Blue-500
                chartTop: "#10b981", // Emerald-500
                chartAvg: "#FF6500", // 지정된 평균 색상
                title: "학업 성취 분석표",
                icon: <GraduationCap size={64} className="text-slate-400 opacity-20" />
            };
        }
        if (isElementary) {
            return {
                primary: "bg-orange-400",
                secondary: "bg-orange-50",
                border: "border-orange-200",
                text: "text-orange-600",
                accent: "#fb923c",
                chartMy: "#fb923c",
                chartTop: "#10b981",
                chartAvg: "#FF6500", // 지정된 평균 색상
                title: "나의 성장 기록지 🍎",
                icon: <Star size={64} className="text-orange-300 opacity-30" />
            };
        }
        return {
            primary: "bg-indigo-700",
            secondary: "bg-indigo-50",
            border: "border-indigo-200",
            text: "text-indigo-700",
            accent: "#4338ca",
            chartMy: "#4338ca",
            chartTop: "#10b981",
            chartAvg: "#FF6500", // 지정된 평균 색상
            title: "학업 성취 분석표",
            icon: <Award size={64} className="text-indigo-300 opacity-30" />
        };
    };

    const theme = getTheme();

    // 데이터 가공
    const { tableData, radarData, barData } = useMemo(() => {
        if (!student || !student.scores) return { tableData: [], radarData: [], barData: [] };

        const scores = student.scores;
        const subjects = SUBJECTS[dept] || SUBJECTS['중등부'];

        // 1. 테이블 데이터 (고등부는 기존 유지, 초/중등부는 SUM 추가)
        const tableFields = isHighSchool ? [...subjects, 'SUM'] : [...subjects, 'SUM'];

        const tableData = {
            headers: tableFields,
            rows: [
                { label: student.name, values: tableFields.map(f => scores[f] || 0), color: theme.chartMy },
                { label: '상위 30%', values: tableFields.map(f => scores[`${f}(30%)`] || 0), color: theme.chartTop },
                { label: '평균', values: tableFields.map(f => scores[`${f}(av)`] || 0), color: theme.chartAvg }
            ]
        };

        // 2. 레이더 차트 데이터 (초/중등부는 5개 과목 유지)
        const radarData = subjects.map(f => ({
            subject: f,
            [student.name]: parseFloat(scores[f] || 0),
            '상위 30%': parseFloat(scores[`${f}(30%)`] || 0),
            '평균': parseFloat(scores[`${f}(av)`] || 0)
        }));

        // 3. 바 차트 데이터 (초/중등부는 4개 지수로 교체)
        let barData = [];
        if (isHighSchool) {
            barData = radarData; // 고등부는 기존 과목 데이터 유지
        } else {
            const barFields = [
                { key: 'EnglishSense', label: 'English Sense' },
                { key: 'EnglishLogic', label: 'English Logic' },
                { key: 'GPAindex', label: 'GPA index' },
                { key: 'CSATindex', label: 'CSAT index' }
            ];
            barData = barFields.map(f => ({
                subject: f.label,
                // 학생 데이터는 EnglishSense(30%) 형식으로 불러옴
                [student.name]: parseFloat(scores[`${f.key}(30%)`] || 0),
                // 상위 30%도 EnglishSense(30%) 형식으로 불러옴 (패턴에 따라 뒤에 붙을 수 있으나 요청대로 처리)
                '상위 30%': parseFloat(scores[`${f.key}(30%)`] || 0),
                // 평균은 EnglishSense(av) 형식으로 불러옴
                '평균': parseFloat(scores[`${f.key}(av)`] || 0)
            }));
        }

        return { tableData, radarData, barData };
    }, [student, dept, theme, isHighSchool]);

    // AI 학습 진단 코멘트 및 푸터 메시지 상태
    const [aiData, setAiData] = useState({ commentary: "", footer: "" });
    const [isAiLoading, setIsAiLoading] = useState(false);

    useEffect(() => {
        const controller = new AbortController();

        const fetchAiData = async () => {
            if (!student || !student.scores) return;

            const cacheKey = `${student.name}_${spreadsheetId}`;
            if (aiCache.has(cacheKey)) {
                setAiData(aiCache.get(cacheKey));
                return;
            }

            setIsAiLoading(true);
            const result = await generateStudentReportData(student, dept, controller.signal);

            if (result) {
                if (!result.isError) {
                    aiCache.set(cacheKey, result);
                }
                setAiData(result);
            }
            setIsAiLoading(false);
        };
        fetchAiData();

        return () => controller.abort();
    }, [student, dept, spreadsheetId]);

    const handleRetry = () => {
        const cacheKey = `${student.name}_${spreadsheetId}`;
        aiCache.delete(cacheKey); // 기존 캐시(에러 데이터 등) 삭제
        setIsAiLoading(true);
        generateStudentReportData(student, dept).then(result => {
            if (result && !result.isError) {
                aiCache.set(cacheKey, result);
            }
            if (result) setAiData(result);
            setIsAiLoading(false);
        });
    };


    const handlePrint = () => window.print();

    if (!student) return null;

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex justify-center overflow-auto print:bg-white print:p-0">
            <div className="relative w-full max-w-[210mm] min-h-screen bg-white shadow-2xl my-10 py-[12mm] px-[20mm] print:my-0 print:shadow-none flex flex-col"
                style={{ width: '210mm', height: '297mm', maxHeight: '297mm', overflow: 'hidden' }}>

                {/* 제어 버튼 */}
                <div className="absolute top-4 right-8 flex gap-3 print:hidden">
                    <button onClick={handlePrint} className={`px-4 py-2 ${theme.primary} text-white rounded-lg font-bold shadow-md hover:opacity-90 flex items-center gap-2`}>
                        <Printer size={18} /> 인쇄 / PDF 저장
                    </button>
                    <button onClick={onClose} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200">
                        <X size={24} className="text-slate-600" />
                    </button>
                </div>

                {/* Header */}
                <div className={`border-b-4 ${theme.border} pb-6 mb-8 flex justify-between items-center`}>
                    <div>
                        <h1 className={`text-4xl font-black ${theme.text} mb-3 tracking-tighter`}>{theme.title}</h1>
                        <p className="text-slate-400 font-bold text-sm tracking-widest uppercase">Academic Performance Analysis</p>
                    </div>
                    <div className="relative">
                        {theme.icon}
                        <div className={`absolute -bottom-1 -right-1 w-10 h-10 ${theme.primary} rounded-full flex items-center justify-center border-4 border-white shadow-lg`}>
                            {isHighSchool ? <TrendingUp size={20} className="text-white" /> : (isElementary ? <Star size={20} className="text-white" /> : <Award size={20} className="text-white" />)}
                        </div>
                    </div>
                </div>

                {/* 인적사항 (히어로 섹션 하단 공간 확보) */}
                <div className={`p-5 rounded-3xl ${theme.secondary} border ${theme.border} mb-12 shadow-sm`}>
                    <div className="grid grid-cols-[1.2fr_1.2fr_1.2fr_0.9fr_0.9fr] gap-2 items-center">
                        {/* 이름 */}
                        <div className="flex flex-col border-r border-slate-200 px-2 last:border-0 items-center">
                            <div className="w-fit">
                                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1.5 text-left">이름</span>
                                <span className="block text-xl font-black text-slate-900 leading-none text-center">{student.name}</span>
                            </div>
                        </div>
                        {/* 학교 */}
                        <div className="flex flex-col border-r border-slate-200 px-2 last:border-0 items-center">
                            <div className="w-fit">
                                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1.5 text-left">학교</span>
                                <span className="block text-lg font-bold text-slate-700 leading-none text-center">{student.school}{student.grade.replace(/[^0-9]/g, '')}</span>
                            </div>
                        </div>
                        {/* 소속 */}
                        <div className="flex flex-col border-r border-slate-200 px-2 last:border-0 items-center">
                            <div className="w-fit">
                                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1.5 text-left">소속</span>
                                <span className="block text-lg font-bold text-slate-700 leading-none text-center">{student.dept}</span>
                            </div>
                        </div>
                        {/* 응시일 */}
                        <div className="flex flex-col border-r border-slate-200 px-2 last:border-0 items-center">
                            <div className="w-fit">
                                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1.5 text-left">응시일</span>
                                <span className="block text-sm font-bold text-slate-600 leading-none text-center whitespace-nowrap">{student.date}</span>
                            </div>
                        </div>
                        {/* 평가종류 */}
                        <div className="flex flex-col px-2 items-center">
                            <div className="w-fit">
                                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1.5 text-left">평가종류</span>
                                <span className="block text-sm font-bold text-slate-600 leading-none text-center whitespace-nowrap">{student.type}</span>
                            </div>
                        </div>
                    </div>
                </div>


                {/* 중앙 메인 컨텐츠 그리드 (가독성 확보를 위해 높이 재조정) */}
                <div className="-mx-5 grid grid-cols-12 gap-6 mb-8 items-stretch h-[320px]">
                    {/* Score Table Card */}
                    <div className="col-span-7 flex flex-col">
                        <div className={`flex items-center gap-2 mb-4 font-black ${isHighSchool ? 'text-slate-800' : theme.text} ml-5`}>
                            <BookOpen size={20} />
                            <h2 className="text-xl">영역별 성취도 분석</h2>
                        </div>
                        <div className="flex-1 overflow-hidden rounded-[2.5rem] border border-slate-200 shadow-sm bg-white p-2">
                            <table className="w-full text-center border-collapse h-full table-fixed">
                                <thead>
                                    <tr className={`${theme.primary} text-white rounded-t-3xl`}>
                                        <th className="w-20 py-4 px-1 font-bold text-[11px] bg-black/10 first:rounded-tl-[1.8rem]">구분</th>
                                        {tableData.headers.map((h, idx) => {
                                            const label = h.replace('(Raw)', '').trim();
                                            // 특정 헤더들을 두 줄로 분리 (두 글자씩 또는 특정 패턴)
                                            let displayLabel = label;
                                            if (['대의파악', '문법어휘', '세부사항', '빈칸추론', '간접쓰기'].includes(label)) {
                                                displayLabel = <>{label.slice(0, 2)}<br />{label.slice(2)}</>;
                                            }
                                            return (
                                                <th key={h} className={`py-2 px-1 font-bold text-[10.5px] border-l border-white/5 uppercase tracking-tighter leading-tight ${idx === tableData.headers.length - 1 ? 'last:rounded-tr-[1.8rem]' : ''}`}>
                                                    {displayLabel}
                                                </th>
                                            );
                                        })}
                                    </tr>
                                </thead>
                                <tbody>
                                    {tableData.rows.map((row, i) => (
                                        <tr key={i} className={`border-b border-slate-100 last:border-0 ${i === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                                            <td className={`w-20 py-4 px-1 font-black whitespace-nowrap overflow-hidden text-ellipsis ${i === 0 ? 'text-blue-700 text-[11px] bg-blue-50/30' : 'text-[10px] text-slate-400 bg-slate-50/80'} border-r border-slate-100`}>
                                                {row.label}
                                            </td>
                                            {row.values.map((v, j) => (
                                                <td key={j} className={`py-4 px-1 font-black text-lg ${i === 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                                                    {v}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Academic Balance (Radar Chart Card) */}
                    <div className="col-span-5 flex flex-col">
                        <div className="flex items-center gap-2 mb-4 text-slate-400 font-black text-[10px] uppercase tracking-widest ml-2">
                            Academic Balance
                        </div>
                        <div className="flex-1 bg-white border border-slate-100 rounded-[2.5rem] p-4 shadow-sm mr-5">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                                    <PolarGrid stroke="#f1f5f9" />
                                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fontWeight: 800, fill: '#64748b' }} />
                                    <Radar name={student.name} dataKey={student.name} stroke={theme.chartMy} fill={theme.chartMy} fillOpacity={0.4} />
                                    <Radar name="상위 30%" dataKey="상위 30%" stroke={theme.chartTop} fill={theme.chartTop} fillOpacity={0.1} />
                                    <Radar name="평균" dataKey="평균" stroke={theme.chartAvg} fill={theme.chartAvg} fillOpacity={0.1} />
                                    <Legend wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', paddingTop: '10px' }} />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* 하단 섹션 그리드 (바차트 + AI 코멘트) */}
                <div className="-mx-5 grid grid-cols-12 gap-6 mb-4 items-stretch h-[320px]">
                    {/* Horizontal Bar Chart (col-span-7) */}
                    <div className="col-span-7 flex flex-col pl-5">
                        <div className="flex items-center gap-2 mb-4 text-slate-400 font-black text-[10px] uppercase tracking-widest">
                            Relative Comparison
                        </div>
                        <div className="flex-1 bg-white border border-slate-100 rounded-[2.5rem] p-6 shadow-sm">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    layout="vertical"
                                    data={barData}
                                    barGap={6}
                                    barCategoryGap="30%"
                                    margin={{ left: 5, right: 30, top: 0, bottom: 0 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                    <XAxis type="number" hide />
                                    <YAxis
                                        dataKey="subject"
                                        type="category"
                                        tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }}
                                        axisLine={false}
                                        tickLine={false}
                                        width={50}
                                    />
                                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                                    <Bar dataKey={student.name} fill={theme.chartMy} radius={[0, 4, 4, 0]} barSize={10} />
                                    <Bar dataKey="상위 30%" fill={theme.chartTop} radius={[0, 4, 4, 0]} barSize={10} />
                                    <Bar dataKey="평균" fill={theme.chartAvg} radius={[0, 4, 4, 0]} barSize={10} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* AI 학습 진단 컨설팅 (col-span-5) */}
                    <div className="col-span-5 flex flex-col pr-5">
                        <div className="flex items-center gap-2 mb-4 text-slate-400 font-black text-[10px] uppercase tracking-widest ml-2">
                            Expert Commentary
                        </div>
                        <div className={`flex-1 p-6 rounded-[2.5rem] bg-indigo-50/40 border border-indigo-100 shadow-sm relative overflow-hidden backdrop-blur-sm flex items-center`}>
                            <div className="absolute top-0 right-0 p-4 opacity-5">
                                <GraduationCap size={100} className="text-indigo-600" />
                            </div>
                            {isAiLoading ? (
                                <div className="flex flex-col items-center justify-center w-full gap-3 text-slate-400">
                                    <RefreshCw className="animate-spin" size={24} />
                                    <span className="text-xs font-black uppercase tracking-widest">AI 분석 생성 중...</span>
                                </div>
                            ) : aiData.isError ? (
                                <div className="flex flex-col items-center justify-center w-full gap-4 text-center">
                                    <p className="text-[12px] text-red-500 font-bold leading-relaxed">{aiData.commentary}</p>
                                    <button onClick={handleRetry} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-full text-[10px] font-black hover:bg-black transition-all">
                                        <RefreshCw size={14} /> 다시 시도하기
                                    </button>
                                </div>
                            ) : (
                                <p className="text-[12.5px] leading-relaxed text-slate-700 font-bold whitespace-pre-wrap relative z-10 transition-all duration-500">
                                    {aiData.commentary}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100 flex items-end justify-between gap-8 min-h-[40px]">
                    <p className="text-sm font-black text-slate-700 tracking-tight leading-none pb-0.5">
                        {isAiLoading ? "학업 성취를 응원합니다..." : aiData.footer || "성실한 노력을 응원합니다."}
                    </p>
                    <img src={LOGO_URL} alt="Academy Logo" className="h-8 object-contain opacity-100" />
                </div>

            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    body { background: white !important; margin: 0 !important; padding: 0 !important; -webkit-print-color-adjust: exact; }
                    .fixed { position: static !important; overflow: visible !important; background: white !important; }
                    @page { size: A4; margin: 0; }
                    button { display: none !important; }
                }
            `}} />
        </div>
    );
};

export default ReportCard;
