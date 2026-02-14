import React, { useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, Radar, Legend
} from 'recharts';
import {
    Printer, User, BookOpen, Award, School, Star, TrendingUp, Bot, X
} from 'lucide-react';

// 학부별 과목 구성 (App.jsx와 동기화 필요)
const SUBJECTS = {
    '초등부': ['L/C', 'Voca', 'Gr', 'R/C', 'Syn'],
    '중등부': ['L/C', 'Voca', 'Gr', 'R/C', 'Syn'],
    '고등부': ['청해', '대의파악', '문법어휘', '세부사항', '빈칸추론', '간접쓰기']
};

const ReportCard = ({ student, onClose }) => {
    // 테마 설정
    const isElementary = student.dept_type === '초등부';

    const theme = isElementary ? {
        primary: "bg-orange-400",
        secondary: "bg-orange-50",
        border: "border-orange-200",
        text: "text-orange-600",
        accent: "#fb923c",
        chartFill: "#fdba74",
        chartStroke: "#fb923c",
        title: "나의 성장 기록지 🍎"
    } : {
        primary: "bg-indigo-700",
        secondary: "bg-indigo-50",
        border: "border-indigo-200",
        text: "text-indigo-700",
        accent: "#4338ca",
        chartFill: "#818cf8",
        chartStroke: "#4338ca",
        title: "학업 성취 분석표 (Official)"
    };

    // 데이터 가공
    const { basicData, advancedData, aiComment } = useMemo(() => {
        if (!student || !student.scores) return { basicData: [], advancedData: [], aiComment: '' };

        const scores = student.scores;
        const subjects = SUBJECTS[student.dept_type] || SUBJECTS['중등부'];

        // 1. 기본 교과 분석 데이터 (Radar Chart용)
        const basicData = subjects.map(subj => {
            // (Raw) 제거 후 매칭 시도 (이미 normalize 되었지만 안전장치)
            const key = subj.replace('(Raw)', '').trim();
            const rawKey = `${key}(Raw)`; // 실제 점수

            // 시트 헤더 예시: L/C, L/C(30%), L/C(av)
            // 주의: App.jsx에서는 'L/C(Raw)'로 저장하지만, 분석표에서는 'L/C' 등의 가공된 지표를 우선 사용하거나
            // Row 데이터에 'L/C' 컬럼이 별도로 계산되어 있다면 그것을 사용.
            // 여기서는 'L/C(Raw)'를 내 점수로, 'L/C(30%)'를 상위 30%로 가정. 
            // 만약 'L/C'가 100점 환산 점수라면 그것을 사용해야 함.

            // 사용자의 요청: "학생의 L/C... 헤더 열의 값" -> 즉, 변환된 점수 컬럼이 존재함.
            // (Raw)가 붙지 않은 순수 과목명이 환산 점수일 가능성이 높음.

            return {
                subject: key,
                score: parseFloat(scores[key] || scores[rawKey] || 0),
                top30: parseFloat(scores[`${key}(30%)`] || 0),
                average: parseFloat(scores[`${key}(av)`] || 0),
                fullMark: 100 // 차트 정규화를 위해 100점 만점 기준
            };
        });

        // 2. 심화 지표 분석 데이터 (Bar Chart용)
        // EnglishSense, EnglishLogic, GPAindex, CSATindex
        const advKeys = ['EnglishSense', 'EnglishLogic', 'GPAindex', 'CSATindex'];
        const advancedData = advKeys.map(key => ({
            subject: key,
            score: parseFloat(scores[key] || 0),
            top30: parseFloat(scores[`${key}(30%)`] || 0),
            average: parseFloat(scores[`${key}(av)`] || 0)
        }));

        // 3. AI 종합 분석
        const aiComment = scores['AI_Analysis'] || scores['종합의견'] || "데이터가 충분하지 않아 분석을 생성할 수 없습니다.";

        return { basicData, advancedData, aiComment };
    }, [student]);

    const handlePrint = () => window.print();

    if (!student) return null;

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex justify-center overflow-auto print:bg-white print:p-0">
            <div className="relative w-full max-w-[210mm] min-h-screen bg-white shadow-2xl my-10 print:my-0 print:shadow-none"
                style={{ width: '210mm', minHeight: '297mm', padding: '15mm' }}>

                {/* 닫기 버튼 (인쇄 시 숨김) */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full hover:bg-slate-200 print:hidden transition-colors"
                >
                    <X size={24} className="text-slate-600" />
                </button>

                {/* 인쇄 버튼 (인쇄 시 숨김) */}
                <button
                    onClick={handlePrint}
                    className={`absolute top-4 right-16 px-4 py-2 ${theme.primary} text-white rounded-lg font-bold shadow-md hover:opacity-90 transition-all flex items-center gap-2 print:hidden`}
                >
                    <Printer size={18} /> 인쇄 / PDF
                </button>

                {/* Header Section */}
                <div className={`border-b-4 ${theme.border} pb-6 mb-8 flex justify-between items-center`}>
                    <div>
                        <h1 className={`text-3xl font-black ${theme.text} mb-2`}>{theme.title}</h1>
                        <p className="text-slate-500 text-sm font-medium flex gap-2">
                            <span>{student.school}</span>
                            <span className="text-slate-300">|</span>
                            <span>{student.date} 시행</span>
                            <span className="text-slate-300">|</span>
                            <span>{student.type}</span>
                        </p>
                    </div>
                    <div className="relative">
                        <School className={`${theme.text} opacity-20`} size={64} />
                        <div className={`absolute -bottom-2 -right-2 w-8 h-8 ${theme.primary} rounded-full flex items-center justify-center`}>
                            {isElementary ? <Star size={16} className="text-white" /> : <TrendingUp size={16} className="text-white" />}
                        </div>
                    </div>
                </div>

                {/* Student Info Grid */}
                <div className={`grid grid-cols-4 gap-4 mb-8 p-4 rounded-2xl ${theme.secondary} border ${theme.border}`}>
                    <div className="col-span-1 bg-white rounded-xl flex flex-col items-center justify-center border border-slate-100/50 shadow-sm h-28">
                        <User size={40} className={`${theme.text} opacity-50 mb-2`} />
                        <span className={`text-xs font-bold ${theme.text}`}>{student.name}</span>
                    </div>
                    <div className="col-span-3 grid grid-cols-2 gap-x-8 gap-y-2 content-center px-4">
                        <div className="flex justify-between border-b border-slate-300/50 py-2">
                            <span className="text-sm font-bold text-slate-500">성 명</span>
                            <span className="text-base font-black text-slate-800">{student.name}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-300/50 py-2">
                            <span className="text-sm font-bold text-slate-500">학 번</span>
                            <span className="text-base font-black text-slate-800">{student.grade} - {student.id}</span>
                        </div>
                        <div className="col-span-2 flex justify-between border-b border-slate-300/50 py-2">
                            <span className="text-sm font-bold text-slate-500">소 속</span>
                            <span className="text-base font-medium text-slate-700">{student.dept_type} 과정 ({student.school})</span>
                        </div>
                    </div>
                </div>

                {/* Subject Analysis Section 1 (Radar + Table) */}
                <div className="mb-10">
                    <div className={`flex items-center gap-2 mb-4 ${theme.text}`}>
                        <BookOpen size={20} />
                        <h2 className="text-lg font-extrabold">기본 교과 분석 (5 Elements)</h2>
                    </div>

                    <div className="grid grid-cols-2 gap-6 h-64">
                        {/* Radar Chart */}
                        <div className="h-full border border-slate-100 rounded-xl p-2 relative bg-white">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={basicData}>
                                    <PolarGrid stroke="#e2e8f0" />
                                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fontWeight: 'bold', fill: '#64748b' }} />
                                    <Radar name="내 점수" dataKey="score" stroke={theme.chartStroke} fill={theme.chartFill} fillOpacity={0.6} />
                                    <Radar name="상위 30%" dataKey="top30" stroke="#10b981" fill="#10b981" fillOpacity={0.1} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Score Table */}
                        <div className="overflow-hidden rounded-xl border border-slate-200">
                            <table className="text-xs w-full h-full border-collapse">
                                <thead>
                                    <tr className={`${theme.primary} text-white`}>
                                        <th className="p-2 font-bold w-1/4">영역</th>
                                        <th className="p-2 font-bold">내 점수</th>
                                        <th className="p-2 font-medium bg-white/10">상위 30%</th>
                                        <th className="p-2 font-medium bg-white/10">평균</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {basicData.map((item, i) => (
                                        <tr key={i} className="text-center border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                                            <td className="p-2 font-extrabold text-slate-600 bg-slate-50/50">{item.subject}</td>
                                            <td className={`p-2 font-black text-sm ${item.score >= item.top30 ? 'text-blue-600' : 'text-slate-800'}`}>
                                                {Math.round(item.score)}
                                            </td>
                                            <td className="p-2 text-slate-500">{Math.round(item.top30)}</td>
                                            <td className="p-2 text-slate-400">{Math.round(item.average)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Subject Analysis Section 2 (Bar Chart + Table) */}
                <div className="mb-6">
                    <div className={`flex items-center gap-2 mb-4 ${theme.text}`}>
                        <Award size={20} />
                        <h2 className="text-lg font-extrabold font-mono">Advanced Metrics (심화 지표)</h2>
                    </div>

                    <div className="grid grid-cols-2 gap-6 h-60">
                        {/* Bar Chart */}
                        <div className="h-full border border-slate-100 rounded-xl p-4 bg-white">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={advancedData} barSize={20}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="subject" tick={{ fontSize: 10, fill: '#64748b' }} interval={0} />
                                    <YAxis hide domain={[0, 120]} />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                                    <Bar dataKey="score" name="내 점수" fill={theme.chartStroke} radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="top30" name="상위 30%" fill="#10b981" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="average" name="평균" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Score Table */}
                        <div className="overflow-hidden rounded-xl border border-slate-200">
                            <table className="text-xs w-full h-full border-collapse">
                                <thead>
                                    <tr className={`${theme.primary} text-white`}>
                                        <th className="p-2 font-bold w-1/4">지표</th>
                                        <th className="p-2 font-bold">내 점수</th>
                                        <th className="p-2 font-medium bg-white/10">상위 30%</th>
                                        <th className="p-2 font-medium bg-white/10">평균</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {advancedData.map((item, i) => (
                                        <tr key={i} className="text-center border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                                            <td className="p-2 font-bold text-slate-600 bg-slate-50/50 text-[10px]">{item.subject}</td>
                                            <td className="p-2 font-black text-sm text-slate-800">{item.score}</td>
                                            <td className="p-2 text-slate-500 text-[10px]">{item.top30}</td>
                                            <td className="p-2 text-slate-400 text-[10px]">{item.average}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* AI Analysis Section */}
                <div className={`mb-8 p-6 rounded-2xl ${isElementary ? 'bg-gradient-to-br from-orange-50 to-white' : 'bg-gradient-to-br from-indigo-50 to-white'} border ${theme.border} relative overflow-hidden`}>
                    <Bot size={120} className={`absolute -right-4 -bottom-8 ${theme.text} opacity-5`} />
                    <div className={`flex items-center gap-2 mb-3 ${theme.text}`}>
                        <Bot size={20} />
                        <h2 className="text-lg font-extrabold">AI Comprehensive Analysis</h2>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">
                        {aiComment}
                    </p>
                </div>

                {/* Footer */}
                <div className="mt-auto pt-8 border-t-2 border-slate-100 text-center relative">
                    <p className="text-sm font-bold text-slate-600">위 학생의 학업 성취 결과를 정히 통보합니다.</p>
                    <p className="text-[10px] text-slate-400 mt-1">Generated by Chief Impact7 AI System</p>

                    <div className="mt-6 flex justify-center">
                        <div className="relative inline-block">
                            <p className="text-lg font-black tracking-[8px] text-slate-800 z-10 relative">{student.school}장</p>
                            {/* 도장 효과 */}
                            <div className="absolute -right-8 -top-3 w-14 h-14 border-4 rounded-full flex items-center justify-center border-red-600 opacity-70 rotate-[-15deg] mix-blend-multiply pointer-events-none">
                                <div className="w-12 h-12 border border-red-600 rounded-full flex items-center justify-center">
                                    <span className="text-red-700 text-[10px] font-black transform scale-75">OFFICIAL</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* Print Styles */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    body { background: white !important; padding: 0 !important; }
                    .fixed { position: static !important; overflow: visible !important; background: white !important; }
                    /* 인쇄 시 A4 영역 강제 설정 */
                    @page { size: A4; margin: 0; }
                    button { display: none !important; }
                }
            `}} />
        </div>
    );
};

export default ReportCard;
