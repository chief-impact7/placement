import React, { useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    RadarChart, PolarGrid, PolarAngleAxis, Radar, Legend, Cell
} from 'recharts';
import {
    Printer, User, BookOpen, Award, School, Star, TrendingUp, Bot, X, GraduationCap, FileText, Calendar
} from 'lucide-react';

// 학부별 과목 구성 (App.jsx와 동기화 필요)
const SUBJECTS = {
    '초등부': ['L/C', 'Voca', 'Gr', 'R/C', 'Syn'],
    '중등부': ['L/C', 'Voca', 'Gr', 'R/C', 'Syn'],
    '고등부': ['청해', '대의파악', '문법어휘', '세부사항', '빈칸추론', '간접쓰기']
};

const ReportCard = ({ student, spreadsheetId, onClose }) => {
    const dept = student.dept_type || '중등부';
    const isHighSchool = dept === '고등부';
    const isElementary = dept === '초등부';

    // 테마 설정
    const getTheme = () => {
        if (isHighSchool) {
            return {
                primary: "bg-slate-700",
                secondary: "bg-slate-50",
                border: "border-slate-200",
                text: "text-slate-800",
                accent: "#334155", // slate-700
                chartMy: "#475569", // slate-600
                chartTop: "#94a3b8", // slate-400
                chartAvg: "#cbd5e1", // slate-300
                title: "학업 성취 분석표 (고등부 Academic)",
                icon: <GraduationCap size={64} className="text-slate-300 opacity-50" />
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
                chartAvg: "#cbd5e1",
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
            chartAvg: "#cbd5e1",
            title: "학업 성취 분석표 (Official)",
            icon: <Award size={64} className="text-indigo-300 opacity-30" />
        };
    };

    const theme = getTheme();

    // 데이터 가공
    const { tableData, chartData, aiComment } = useMemo(() => {
        if (!student || !student.scores) return { tableData: [], chartData: [], aiComment: '' };

        const scores = student.scores;
        const subjects = SUBJECTS[dept] || SUBJECTS['중등부'];

        // 고등부의 경우 'SUM' 필드 추가
        const targetFields = isHighSchool ? [...subjects, 'SUM'] : subjects;

        // 1. 테이블용 데이터 (3행 구성: 내점수, 30%, 평균)
        const studentRow = targetFields.map(f => parseFloat(scores[f] || 0));
        const top30Row = targetFields.map(f => parseFloat(scores[`${f}(30%)`] || 0));
        const avgRow = targetFields.map(f => parseFloat(scores[`${f}(av)`] || 0));

        const tableData = {
            headers: targetFields,
            rows: [
                { label: '내 점수', values: studentRow, color: theme.chartMy },
                { label: '상위 30%', values: top30Row, color: theme.chartTop },
                { label: '평균 점수', values: avgRow, color: theme.chartAvg }
            ]
        };

        // 2. 차트용 데이터 (과목별 묶음)
        // Radar/Bar 공용: { subject: '청해', score: 10, top30: 12, average: 8 }
        const chartData = subjects.map(f => ({
            subject: f,
            score: parseFloat(scores[f] || 0),
            top30: parseFloat(scores[`${f}(30%)`] || 0),
            average: parseFloat(scores[`${f}(av)`] || 0),
            fullMark: isHighSchool ? 20 : 100 // 정규화 (고등부는 과목별 만점이 낮음)
        }));

        const aiComment = scores['AI_Analysis'] || scores['종합의견'] || "영역별 성취도를 바탕으로 분석 중입니다...";

        return { tableData, chartData, aiComment };
    }, [student, dept, theme]);

    const handlePrint = () => window.print();

    if (!student) return null;

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex justify-center overflow-auto print:bg-white print:p-0">
            <div className="relative w-full max-w-[210mm] min-h-screen bg-white shadow-2xl my-10 py-[15mm] px-[20mm] print:my-0 print:shadow-none"
                style={{ width: '210mm', minHeight: '297mm' }}>

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
                        <h1 className={`text-4xl font-black ${theme.text} mb-3 tracking-tight`}>{theme.title}</h1>
                        <div className="flex gap-4 text-slate-500 font-bold text-sm">
                            <span className="flex items-center gap-1"><School size={16} /> {student.school}</span>
                            <span className="text-slate-200">|</span>
                            <span className="flex items-center gap-1"><Calendar size={16} /> {student.date} 시행</span>
                            <span className="text-slate-200">|</span>
                            <span className="flex items-center gap-1"><FileText size={16} /> {student.type}</span>
                        </div>
                    </div>
                    <div className="relative">
                        {theme.icon}
                        <div className={`absolute -bottom-1 -right-1 w-10 h-10 ${theme.primary} rounded-full flex items-center justify-center border-4 border-white shadow-lg`}>
                            {isHighSchool ? <TrendingUp size={20} className="text-white" /> : (isElementary ? <Star size={20} className="text-white" /> : <Award size={20} className="text-white" />)}
                        </div>
                    </div>
                </div>

                {/* Student Profile Card */}
                <div className={`grid grid-cols-5 gap-6 mb-10 p-6 rounded-3xl ${theme.secondary} border ${theme.border} shadow-sm`}>
                    <div className="col-span-1 aspect-square bg-white rounded-2xl flex flex-col items-center justify-center border border-slate-200 shadow-inner">
                        <User size={48} className="text-slate-300 mb-2" />
                        <span className="text-sm font-black text-slate-800">{student.name}</span>
                    </div>
                    <div className="col-span-4 grid grid-cols-2 gap-x-12 items-center">
                        <div className="space-y-4">
                            <div className="flex justify-between border-b border-slate-200 pb-2">
                                <span className="text-slate-400 font-bold text-xs uppercase tracking-widest">Student Name</span>
                                <span className="text-lg font-black text-slate-900">{student.name}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-200 pb-2">
                                <span className="text-slate-400 font-bold text-xs uppercase tracking-widest">Student ID</span>
                                <span className="text-lg font-black text-slate-900">{student.grade} - {student.id}</span>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="flex justify-between border-b border-slate-200 pb-2">
                                <span className="text-slate-400 font-bold text-xs uppercase tracking-widest">Department</span>
                                <span className="text-lg font-black text-slate-900">{student.dept_type || '중등부'} 과정</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-200 pb-2">
                                <span className="text-slate-400 font-bold text-xs uppercase tracking-widest">School</span>
                                <span className="text-lg font-black text-slate-900">{student.school}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Score Summary Table (Middle) */}
                <div className="mb-12">
                    <div className={`flex items-center gap-2 mb-4 ${theme.text}`}>
                        <BookOpen size={22} className="opacity-70" />
                        <h2 className="text-xl font-black">영역별 성취도 분석 (Score Summary)</h2>
                    </div>
                    <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
                        <table className="w-full text-center border-collapse">
                            <thead>
                                <tr className={`${theme.primary} text-white`}>
                                    <th className="py-4 px-2 font-bold text-sm bg-black/20">구분</th>
                                    {tableData.headers.map(h => (
                                        <th key={h} className="py-4 px-2 font-bold text-sm border-l border-white/10 uppercase tracking-tighter">
                                            {h.replace('(Raw)', '').trim()}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {tableData.rows.map((row, i) => (
                                    <tr key={i} className={`border-b border-slate-100 last:border-0 ${i === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                                        <td className="py-4 px-2 font-black text-xs text-slate-500 bg-slate-50/80 border-r border-slate-100">{row.label}</td>
                                        {row.values.map((v, j) => (
                                            <td key={j} className={`py-4 px-2 font-black text-lg ${i === 0 ? theme.text : 'text-slate-400'}`}>
                                                {v}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Visual Analysis (Bottom) */}
                <div className="grid grid-cols-2 gap-10 h-72 mb-12">
                    {/* Bar Chart Analysis */}
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-4 text-slate-500">
                            <TrendingUp size={18} />
                            <h3 className="text-sm font-black uppercase tracking-widest">Relative Performance (Bar)</h3>
                        </div>
                        <div className="flex-1 bg-white border border-slate-100 rounded-3xl p-4 shadow-sm">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} barGap={4}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="subject" tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                    <YAxis hide />
                                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                                    <Bar dataKey="score" name="내 점수" fill={theme.chartMy} radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="top30" name="상위 30%" fill={theme.chartTop} radius={[4, 4, 0, 0]} opacity={0.6} />
                                    <Bar dataKey="average" name="평균" fill={theme.chartAvg} radius={[4, 4, 0, 0]} opacity={0.4} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Radar Chart Analysis */}
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-4 text-slate-500">
                            <Star size={18} />
                            <h3 className="text-sm font-black uppercase tracking-widest">Academic Balance (Radar)</h3>
                        </div>
                        <div className="flex-1 bg-white border border-slate-100 rounded-3xl p-2 shadow-sm">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
                                    <PolarGrid stroke="#f1f5f9" />
                                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fontWeight: 800, fill: '#475569' }} />
                                    <Radar name="내 점수" dataKey="score" stroke={theme.chartMy} fill={theme.chartMy} fillOpacity={0.5} />
                                    <Radar name="평균" dataKey="average" stroke={theme.chartAvg} fill={theme.chartAvg} fillOpacity={0.2} />
                                    <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* AI Comprehensive Analysis */}
                <div className={`p-8 rounded-[2.5rem] ${isHighSchool ? 'bg-slate-50' : (isElementary ? 'bg-orange-50' : 'bg-indigo-50')} border ${theme.border} relative overflow-hidden`}>
                    <Bot size={150} className={`${theme.text} opacity-5 absolute -right-4 -bottom-10`} />
                    <div className="flex items-center gap-2 mb-4">
                        <Bot size={24} className={theme.text} />
                        <h2 className={`text-xl font-black ${theme.text}`}>AI 학습 종합 분석</h2>
                    </div>
                    <p className="text-slate-700 leading-relaxed font-medium text-sm whitespace-pre-wrap relative z-10">
                        {aiComment}
                    </p>
                </div>

                {/* Footer Certificate */}
                <div className="mt-auto pt-10 border-t-2 border-slate-100 text-center flex flex-col items-center">
                    <p className="text-lg font-bold text-slate-800 tracking-tight">위 학생의 학업 성취 결과를 정히 통보합니다.</p>
                    <div className="mt-8 relative inline-block">
                        <span className="text-2xl font-black tracking-[12px] text-slate-900 border-b-4 border-slate-900 pb-1">{student.school}장</span>
                        {/* 관인 효과 */}
                        <div className="absolute -right-16 -top-4 w-16 h-16 border-4 border-red-500/60 rounded-xl flex items-center justify-center rotate-12 mix-blend-multiply opacity-80">
                            <div className="border border-red-500/60 w-14 h-14 rounded-lg flex items-center justify-center p-1">
                                <span className="text-red-600 font-extrabold text-[10px] leading-none transform scale-90">OFFICIAL<br />CHIEF7</span>
                            </div>
                        </div>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-12 font-mono">System ID: {spreadsheetId || 'IMPACT7_GLOBAL_AI_SYSTEM'}</p>
                </div>

            </div>

            {/* Print Settings */}
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
