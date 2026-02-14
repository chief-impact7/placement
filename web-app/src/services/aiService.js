import { GoogleGenerativeAI } from "@google/generative-ai";

// 보완: 실제 서비스 시에는 환경 변수로 관리하는 것이 좋습니다.
const API_KEY = "AIzaSyBdqfwYemzbuyo_4tXH3rwH5mJit3oHsl8";

// 100단계 초정밀 조합형 로컬 분석 엔진
const generateLocalCommentary = (student, dept) => {
    const scores = student.scores;
    const mySum = parseFloat(scores['SUM'] || 0);
    const avgSum = parseFloat(scores['SUM(av)'] || 0);
    const topSum = parseFloat(scores['SUM(30%)'] || 0);
    const isElementaryOrMiddle = ['초등부', '중등부'].includes(dept);

    const subjects = dept === '고등부'
        ? ['청해', '대의파악', '문법어휘', '세부사항', '빈칸추론', '간접쓰기']
        : ['L/C', 'Voca', 'Gr', 'R/C', 'Syn'];

    const validScores = subjects.map(s => parseFloat(scores[s] || 0));
    const maxScore = Math.max(...validScores);
    const minScore = Math.min(...validScores);
    const scoreGap = maxScore - minScore;
    const maxIdx = validScores.indexOf(maxScore);
    const bestSub = subjects[maxIdx];
    const worstSub = subjects[validScores.indexOf(minScore)];

    // 1. 성적 구간 분석 (10단계)
    let tierText = "";
    let footerBase = "";
    if (mySum >= topSum + 15) { tierText = "압도적인 실력으로 전체 최정상을 유지하고 있는"; footerBase = "압도적 우위의 성취도"; }
    else if (mySum >= topSum) { tierText = "전국 단위 상위권과 어깨를 나란히 할 경쟁력을 입증한"; footerBase = "상위권의 당당한 실력"; }
    else if (mySum >= avgSum + 15) { tierText = "리딩 그룹 진입을 눈앞에 둔 매우 우수한 학습 태도의"; footerBase = "비상하는 상위권"; }
    else if (mySum >= avgSum + 5) { tierText = "평균을 확실히 상회하며 안정적인 성장 궤도에 진입한"; footerBase = "안정적인 우수형"; }
    else if (mySum >= avgSum - 5) { tierText = "평균 수준의 기본기를 잘 갖추고 다음 단계 도약을 준비하는"; footerBase = "잠재력 가득한 중위권"; }
    else if (mySum >= avgSum - 15) { tierText = "기초 체력을 성실히 기르며 성적 향상의 발판을 다지고 있는"; footerBase = "성실한 발전 단계"; }
    else if (mySum >= avgSum - 25) { tierText = "개념의 정확한 확립과 규칙적인 학습 습관 형성이 필요한"; footerBase = "체계적인 관리 필요"; }
    else if (mySum > 40) { tierText = "학습 의지 고취를 통해 새로운 변화의 계기를 마련해야 할"; footerBase = "격려가 필요한 도전"; }
    else if (mySum > 20) { tierText = "영어의 기초 원리를 차근차근 익히며 적응력을 높이고 있는"; footerBase = "한 걸음씩 꾸준하게"; }
    else { tierText = "선생님들의 세밀한 개별 지도가 가장 우선시되는 기초 단계의"; footerBase = "함께 가는 동행 학습"; }

    // 2. 4대 지표 특화 분석 (초/중등 부가 분석)
    let indexText = "";
    if (isElementaryOrMiddle) {
        const indices = [
            { name: 'English Sense', val: parseFloat(scores['EnglishSense(30%)'] || 0) },
            { name: 'English Logic', val: parseFloat(scores['EnglishLogic(30%)'] || 0) },
            { name: 'GPA index', val: parseFloat(scores['GPAindex(30%)'] || 0) },
            { name: 'CSAT index', val: parseFloat(scores['CSATindex(30%)'] || 0) }
        ];
        const bestIdx = indices.reduce((prev, current) => (prev.val > current.val) ? prev : current);
        if (bestIdx.val > 70) {
            indexText = `특히 ${bestIdx.name} 지표에서 강한 면모를 보이고 있어, 이를 전략적 도구로 활용한다면 중장기적으로 매우 유리한 위치를 선점할 수 있습니다. `;
        }
    }

    // 3. 강약점 패턴 분석 (10단계)
    let patternText = "";
    if (scoreGap <= 15 && mySum > avgSum) {
        patternText = "전 영역이 고르게 발달한 상향 평준화된 상태가 인상적입니다. 지금의 완벽한 밸런스를 유지하며 고난도 문항에 대한 변별력을 강화해 봅시다.";
    } else if (scoreGap <= 15 && mySum <= avgSum) {
        patternText = "영역별 편차는 적으나 전체적인 어휘량과 문제 풀이 양을 늘려 정답률의 마지노선을 한 단계 높이는 노력이 병행되어야 합니다.";
    } else if (bestSub === 'Voca' || (dept === '초중등부' && bestSub === 'Voca')) {
        patternText = `${bestSub}에서의 탁월한 성취도가 리포트 활력을 불어넣고 있습니다. 어휘 강점을 문장 해석의 정확도로 연결한다면 성적이 급상승할 것입니다.`;
    } else if (bestSub === 'L/C' || bestSub === '청해') {
        patternText = `${bestSub} 영역의 높은 감각을 보유하고 있습니다. 들리는 내용을 즉각 해석하는 훈련을 통해 독해의 속도감을 함께 잡아낼 수 있는 충분한 재능이 보입니다.`;
    } else if (bestSub === 'Gr' || (dept === '고등부' && bestSub === '문법어휘')) {
        patternText = "문법의 원리를 꿰뚫고 있는 논리적인 해석력이 돋보입니다. 파편화된 규칙들을 실전 독해 지문에 적용하여 의미를 확장하는 연습에 매진합시다.";
    } else if (minScore < 50 && scoreGap > 30) {
        patternText = `${worstSub} 영역의 일시적 정체가 전체 평균을 낮추고 있습니다. 당분간은 취약 파트를 집중 보완하여 하한선을 끌어올리는 전략적 학습이 시급합니다.`;
    } else if (maxScore > 90) {
        patternText = `${bestSub} 영역에서 독보적인 완벽함을 보여주었습니다. 이 성취감을 동력 삼아 다른 영역의 목표치도 상향 조정하여 전 영역 1등급을 노려봅시다.`;
    } else if (dept === '고등부' && (bestSub === '빈칸추론' || bestSub === '간접쓰기')) {
        patternText = "고등학교 최고난도 유형인 추론 영역에서 탁월한 분석력을 보여주었습니다. 논리가 강한 만큼 어휘와 구문의 정교함만 더하면 최상위권 안착이 가능합니다.";
    } else if (mySum < avgSum && maxScore > avgSum) {
        patternText = "전체 점수는 평균보다 낮으나 특정 영역에서 보여준 집중력은 매우 고무적입니다. 이 잠재력을 믿고 기초 단어부터 다시 정복해 나갈 자신감을 가집시다.";
    } else {
        patternText = "영역별 점수 기복이 다소 과한 편입니다. 아는 것을 틀리지 않는 꼼꼼한 오답 분석과 실전 모의고사 훈련을 통해 실전 감각을 안정화시켜야 합니다.";
    }

    return {
        commentary: `${student.name} 학생은 현재 ${tierText} 상태입니다. ${indexText}${patternText} 선생님들의 정성 어린 지도를 통해 한 단계 더 높은 성장을 반드시 이뤄내겠습니다.`,
        footer: `${footerBase}! ${student.name} 학생을 임팩트7이 응원합니다.`
    };
};

export const generateStudentReportData = async (student, dept, signal) => {
    try {
        if (!API_KEY || API_KEY.includes("YOUR")) return generateLocalCommentary(student, dept);

        const isElementaryOrMiddle = ['초등부', '중등부'].includes(dept);
        const indicatorInstruction = isElementaryOrMiddle
            ? "\n특히 English Sense, English Logic, GPA index, CSAT index 4개 지표의 데이터를 집중 분석하여 이 학생의 잠재력과 학습 방향을 구체적으로 언급해주세요."
            : "";

        // SDK 대신 안정적인 fetch API 사용 (CORS 및 브라우저 호환성 최적화)
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `당신은 영어 교육 전문가입니다. 아래 데이터를 바탕으로 JSON 형식의 응답을 주세요.${indicatorInstruction}
                            
                            학부: ${dept}
                            학생: ${student.name}
                            데이터: ${JSON.stringify(student.scores)}

                            JSON 형식:
                            { "commentary": "상세 분석 (200자 내외)", "footer": "응원 메시지 (30자 내외)" }`
                        }]
                    }]
                }),
                signal
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Gemini API Error Detail:", JSON.stringify(errorData));
            return generateLocalCommentary(student, dept);
        }

        const result = await response.json();
        if (!result.candidates || result.candidates.length === 0) {
            throw new Error("No candidates returned from AI");
        }

        let text = result.candidates[0].content.parts[0].text;
        text = text.replace(/```json|```/g, "").trim();
        const data = JSON.parse(text);

        return {
            commentary: data.commentary,
            footer: data.footer
        };

    } catch (error) {
        if (error.name === 'AbortError') return null;
        console.error("AI 생성 과정 오류:", error);
        return generateLocalCommentary(student, dept);
    }
};

