import React, { useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    RadarChart, PolarGrid, PolarAngleAxis, Radar, Legend, Text
} from 'recharts';
import {
    Printer, User, BookOpen, Award, School, Star, TrendingUp, X, GraduationCap, FileText, Calendar
} from 'lucide-react';

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
                chartMy: "#3b82f6", // Blue-500 (확실한 구분)
                chartTop: "#10b981", // Emerald-500
                chartAvg: "#94a3b8", // Slate-400
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
            title: "학업 성취 분석표",
            icon: <Award size={64} className="text-indigo-300 opacity-30" />
        };
    };

    const theme = getTheme();

    // 데이터 가공
    const { tableData, chartData } = useMemo(() => {
        if (!student || !student.scores) return { tableData: [], chartData: [] };

        const scores = student.scores;
        const subjects = SUBJECTS[dept] || SUBJECTS['중등부'];
        const targetFields = isHighSchool ? [...subjects, 'SUM'] : subjects;

        const tableData = {
            headers: targetFields,
            rows: [
                { label: student.name, values: targetFields.map(f => scores[f] || 0), color: theme.chartMy },
                { label: '상위 30%', values: targetFields.map(f => scores[`${f}(30%)`] || 0), color: theme.chartTop },
                { label: '평균', values: targetFields.map(f => scores[`${f}(av)`] || 0), color: theme.chartAvg }
            ]
        };

        const chartData = subjects.map(f => ({
            subject: f,
            [student.name]: parseFloat(scores[f] || 0),
            '상위 30%': parseFloat(scores[`${f}(30%)`] || 0),
            '평균': parseFloat(scores[`${f}(av)`] || 0)
        }));

        return { tableData, chartData };
    }, [student, dept, theme]);

    const handlePrint = () => window.print();

    if (!student) return null;

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex justify-center overflow-auto print:bg-white print:p-0">
            <div className="relative w-full max-w-[210mm] min-h-screen bg-white shadow-2xl my-10 py-[15mm] px-[20mm] print:my-0 print:shadow-none flex flex-col"
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

                {/* 인적사항 (고등부 특화 레이아웃) */}
                {isHighSchool ? (
                    <div className={`p-8 rounded-3xl ${theme.secondary} border ${theme.border} mb-10 shadow-sm`}>
                        <div className="grid grid-cols-2 gap-y-6">
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Student Info</span>
                                <div className="flex items-baseline gap-3">
                                    <span className="text-2xl font-black text-slate-900">{student.name}</span>
                                    <span className="text-lg font-bold text-slate-600">{student.school} {student.grade}</span>
                                </div>
                            </div>
                            <div className="flex flex-col gap-1 items-end">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Department</span>
                                <span className="text-lg font-black text-slate-800">{student.dept_type} 과정</span>
                            </div>
                            <div className="col-span-2 pt-4 border-t border-slate-200 flex justify-between items-center">
                                <div className="flex gap-8">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase">Test Date</span>
                                        <span className="text-sm font-bold text-slate-700 flex items-center gap-1.5"><Calendar size={14} /> {student.date}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase">Test Type</span>
                                        <span className="text-sm font-bold text-slate-700 flex items-center gap-1.5"><FileText size={14} /> {student.type}</span>
                                    </div>
                                </div>
                                <div className="text-[9px] font-mono text-slate-300">ID: {student.id}</div>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* 기존 초/중등부 인적사항 유지 */
                    <div className={`grid grid-cols-5 gap-6 mb-10 p-6 rounded-3xl ${theme.secondary} border ${theme.border} shadow-sm`}>
                        <div className="col-span-1 aspect-square bg-white rounded-2xl flex flex-col items-center justify-center border border-slate-200 shadow-inner">
                            <User size={48} className="text-slate-300 mb-2" />
                            <span className="text-sm font-black text-slate-800">{student.name}</span>
                        </div>
                        <div className="col-span-4 grid grid-cols-2 gap-x-12 items-center">
                            <div className="space-y-4">
                                <div className="flex justify-between border-b border-slate-200 pb-2">
                                    <span className="text-slate-400 font-bold text-xs">이름</span>
                                    <span className="text-lg font-black text-slate-900">{student.name}</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-200 pb-2">
                                    <span className="text-slate-400 font-bold text-xs">학교</span>
                                    <span className="text-lg font-black text-slate-900">{student.school}</span>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="flex justify-between border-b border-slate-200 pb-2">
                                    <span className="text-slate-400 font-bold text-xs">소속</span>
                                    <span className="text-lg font-black text-slate-900">{student.dept_type} 과정</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-200 pb-2">
                                    <span className="text-slate-400 font-bold text-xs">응시일</span>
                                    <span className="text-lg font-black text-slate-900">{student.date}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Score Table */}
                <div className="mb-12">
                    <div className={`flex items-center gap-2 mb-4 font-black ${isHighSchool ? 'text-slate-800' : theme.text}`}>
                        <BookOpen size={20} />
                        <h2 className="text-xl">영역별 성취도 분석</h2>
                    </div>
                    <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
                        <table className="w-full text-center border-collapse">
                            <thead>
                                <tr className={`${theme.primary} text-white`}>
                                    <th className="py-4 px-2 font-bold text-sm bg-black/10">구분</th>
                                    {tableData.headers.map(h => (
                                        <th key={h} className="py-4 px-2 font-bold text-sm border-l border-white/5 uppercase tracking-tighter">
                                            {h.replace('(Raw)', '').trim()}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {tableData.rows.map((row, i) => (
                                    <tr key={i} className={`border-b border-slate-100 last:border-0 ${i === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                                        <td className="py-4 px-2 font-black text-xs text-slate-400 bg-slate-50/80 border-r border-slate-100">{row.label}</td>
                                        {row.values.map((v, j) => (
                                            <td key={j} className={`py-4 px-2 font-black text-lg ${i === 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                                                {v}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-2 gap-10 h-80 mb-12">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-4 text-slate-400 font-black text-[10px] uppercase tracking-widest">
                            Relative Comparison
                        </div>
                        <div className="flex-1 bg-white border border-slate-100 rounded-[2.5rem] p-5 shadow-sm">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} barGap={4}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="subject" tick={{ fontSize: 9, fontWeight: 900, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                    <YAxis hide />
                                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                                    <Bar dataKey={student.name} fill={theme.chartMy} radius={[6, 6, 0, 0]} />
                                    <Bar dataKey="상위 30%" fill={theme.chartTop} radius={[6, 6, 0, 0]} />
                                    <Bar dataKey="평균" fill={theme.chartAvg} radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-4 text-slate-400 font-black text-[10px] uppercase tracking-widest">
                            Academic Balance
                        </div>
                        <div className="flex-1 bg-white border border-slate-100 rounded-[2.5rem] p-3 shadow-sm">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
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

                {/* Footer (Logo replaces Signature) */}
                <div className="mt-auto pt-16 border-t border-slate-100 text-center flex flex-col items-center">
                    <p className="text-xl font-bold text-slate-800 mb-8">위 학생의 학업 성취 결과를 정히 통보합니다.</p>
                    <img src={LOGO_URL} alt="Academy Logo" className="h-16 object-contain grayscale opacity-80" />
                    <p className="text-[9px] text-slate-300 mt-6 font-mono tracking-tighter">Powered by Chief Impact7 AI Reporting System | {spreadsheetId}</p>
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
