export interface HandoutCopy {
  title: string;
  whatHeading: string;
  whatBody: string;
  whyHeading: string;
  whyBody: string;
  whereHeading: string;
  whereBody: string;
  costHeading: string;
  costBody: string;
  questions: string[];
  disclaimer: string;
  distance: (miles: number) => string;
}

const COPY: Record<string, HandoutCopy> = {
  en: {
    title: "A clinical study your doctor mentioned",
    whatHeading: "What a clinical study is",
    whatBody:
      "A clinical study is research. It is not a promise that a treatment will help you. Joining is your choice. You can say no, and your usual care can continue.",
    whyHeading: "Why your doctor mentioned this one",
    whyBody:
      "Your doctor searched for studies about {condition}. This page is only a starting point. The study team decides whether you qualify.",
    whereHeading: "Where it is",
    whereBody:
      "The nearest place on this list is in {place}{distance}. Ask how many visits there are and whether a closer place exists.",
    costHeading: "Cost questions",
    costBody:
      "Ask what is paid for and what is not, including travel and parking. Ask for the answer in writing before you decide.",
    questions: [
      "What is this study trying to learn?",
      "What would I have to do, and how often?",
      "What are the risks?",
      "What would this cost me or my family?",
      "Can I leave the study if I want to?",
    ],
    disclaimer:
      "This handout is general information, not medical advice. A clinical trial is research. It may not help you. Joining is voluntary. Talk with your doctor before you decide.",
    distance: (miles) => `, about ${miles} miles away`,
  },
  es: {
    title: "Un estudio clínico que su médico mencionó",
    whatHeading: "Qué es un estudio clínico",
    whatBody:
      "Un estudio clínico es una investigación. No es una promesa de que un tratamiento le va a ayudar. Participar es su decisión. Usted puede decir que no, y su cuidado habitual puede seguir.",
    whyHeading: "Por qué su médico lo mencionó",
    whyBody:
      "Su médico buscó estudios sobre {condition}. Esta página es solo un comienzo. El equipo del estudio decide si usted califica.",
    whereHeading: "Dónde queda",
    whereBody:
      "El lugar más cercano de esta lista está en {place}{distance}. Pregunte cuántas visitas hay y si hay un lugar más cerca.",
    costHeading: "Preguntas sobre el costo",
    costBody:
      "Pregunte qué está pagado y qué no, incluyendo el viaje y el estacionamiento. Pida la respuesta por escrito antes de decidir.",
    questions: [
      "¿Qué trata de aprender este estudio?",
      "¿Qué tendría que hacer, y con qué frecuencia?",
      "¿Qué riesgos hay?",
      "¿Qué me costaría a mí o a mi familia?",
      "¿Puedo salirme si quiero?",
    ],
    disclaimer:
      "Esta información es general. No es un consejo médico. Un estudio clínico es investigación. Puede que no le ayude. Participar es voluntario. Hable con su médico antes de decidir.",
    distance: (miles) => `, a unas ${miles} millas`,
  },
  vi: {
    title: "Một nghiên cứu lâm sàng mà bác sĩ của bạn đã nhắc đến",
    whatHeading: "Nghiên cứu lâm sàng là gì",
    whatBody:
      "Nghiên cứu lâm sàng là một cuộc nghiên cứu. Đây không phải là lời hứa rằng một cách điều trị sẽ giúp bạn. Tham gia là lựa chọn của bạn. Bạn có thể nói không, và việc chăm sóc thường ngày vẫn có thể tiếp tục.",
    whyHeading: "Vì sao bác sĩ nhắc đến nghiên cứu này",
    whyBody:
      "Bác sĩ đã tìm các nghiên cứu về {condition}. Trang này chỉ là điểm bắt đầu. Nhóm nghiên cứu sẽ quyết định bạn có phù hợp hay không.",
    whereHeading: "Nơi thực hiện",
    whereBody:
      "Nơi gần nhất trong danh sách này là ở {place}{distance}. Hãy hỏi có bao nhiêu lần tái khám và có nơi nào gần hơn không.",
    costHeading: "Câu hỏi về chi phí",
    costBody:
      "Hãy hỏi phần nào được trả và phần nào không, kể cả đi lại và chỗ đậu xe. Hãy xin câu trả lời bằng văn bản trước khi quyết định.",
    questions: [
      "Nghiên cứu này muốn tìm hiểu điều gì?",
      "Tôi sẽ phải làm gì, và bao lâu một lần?",
      "Có những rủi ro nào?",
      "Chi phí này với tôi hoặc gia đình tôi là bao nhiêu?",
      "Tôi có thể rời nghiên cứu nếu muốn không?",
    ],
    disclaimer:
      "Thông tin này mang tính chung, không phải lời khuyên y khoa. Nghiên cứu lâm sàng là nghiên cứu. Nó có thể không giúp bạn. Việc tham gia là tự nguyện. Hãy nói chuyện với bác sĩ trước khi quyết định.",
    distance: (miles) => `, cách khoảng ${miles} dặm`,
  },
  ko: {
    title: "담당 의사가 알려 드린 임상 연구",
    whatHeading: "임상 연구란",
    whatBody:
      "임상 연구는 연구입니다. 치료가 도움이 된다고 약속하는 것이 아닙니다. 참여는 본인의 선택입니다. 거절할 수 있고, 지금 받는 진료는 계속될 수 있습니다.",
    whyHeading: "의사가 이 연구를 언급한 이유",
    whyBody:
      "의사가 {condition}에 대한 연구를 찾았습니다. 이 글은 시작점일 뿐입니다. 연구팀이 참여 가능 여부를 결정합니다.",
    whereHeading: "장소",
    whereBody:
      "이 목록에서 가장 가까운 곳은 {place}{distance}입니다. 방문이 몇 번인지, 더 가까운 곳이 있는지 물어보세요.",
    costHeading: "비용에 대해 물어볼 것",
    costBody:
      "교통비와 주차를 포함해 무엇이 지원되고 무엇이 아닌지 물어보세요. 결정하기 전에 답을 글로 받아 두세요.",
    questions: [
      "이 연구는 무엇을 알아보려는 것인가요?",
      "무엇을 해야 하고, 얼마나 자주 가야 하나요?",
      "위험은 무엇인가요?",
      "나와 가족에게 드는 비용은 얼마인가요?",
      "원하면 연구를 그만둘 수 있나요?",
    ],
    disclaimer:
      "이 안내문은 일반적인 정보이며 의학적 조언이 아닙니다. 임상 연구는 연구입니다. 도움이 되지 않을 수 있습니다. 참여는 자발적입니다. 결정하기 전에 의사와 상의하세요.",
    distance: (miles) => `에서 약 ${miles}마일`,
  },
  zh: {
    title: "医生提到的一项临床研究",
    whatHeading: "什么是临床研究",
    whatBody:
      "临床研究是一项研究。它不是承诺某种治疗一定会对你有帮助。参加与否由你决定。你可以说不，平时的治疗也可以继续。",
    whyHeading: "医生为什么提到这项研究",
    whyBody:
      "医生查找了关于{condition}的研究。这一页只是一个起点。研究团队会决定你是否符合条件。",
    whereHeading: "地点",
    whereBody:
      "这份名单上最近的地点在{place}{distance}。请询问需要去几次，以及有没有更近的地方。",
    costHeading: "关于费用",
    costBody: "请询问哪些费用已包含、哪些需要自付，包括交通和停车。决定之前，请让对方把答复写成文字。",
    questions: [
      "这项研究想了解什么？",
      "我需要做什么，多久一次？",
      "有哪些风险？",
      "我和家人需要付多少钱？",
      "如果我想退出，可以吗？",
    ],
    disclaimer:
      "这是一般信息，不是医疗建议。临床研究是研究，不一定对你有帮助。参加是自愿的。决定之前请先和医生谈一谈。",
    distance: (miles) => `，大约 ${miles} 英里`,
  },
  ht: {
    title: "Yon etid klinik doktè ou mansyone",
    whatHeading: "Kisa yon etid klinik ye",
    whatBody:
      "Yon etid klinik se yon rechèch. Li pa yon pwomès ke yon tretman ap ede ou. Patisipe se chwa ou. Ou ka di non, epi swen abityèl ou ka kontinye.",
    whyHeading: "Poukisa doktè ou mansyone etid sa a",
    whyBody:
      "Doktè ou chèche etid sou {condition}. Paj sa a se yon kòmansman sèlman. Ekip etid la deside si ou kalifye.",
    whereHeading: "Ki kote li ye",
    whereBody:
      "Kote ki pi pre sou lis sa a se nan {place}{distance}. Mande konbyen vizit ki genyen epi si gen yon kote ki pi pre.",
    costHeading: "Kesyon sou pri a",
    costBody:
      "Mande kisa ki peye epi kisa ki pa peye, tankou vwayaj ak pakin. Mande repons lan alekri anvan ou deside.",
    questions: [
      "Kisa etid sa a ap eseye aprann?",
      "Kisa mwen ta dwe fè, epi konbyen fwa?",
      "Ki risk ki genyen?",
      "Konbyen sa ta koute mwen oswa fanmi mwen?",
      "Èske mwen ka kite etid la si mwen vle?",
    ],
    disclaimer:
      "Enfòmasyon sa a jeneral. Li pa yon konsèy medikal. Yon etid klinik se yon rechèch. Li ka pa ede ou. Patisipe se volontè. Pale ak doktè ou anvan ou deside.",
    distance: (miles) => `, anviwon ${miles} mil`,
  },
};

export function handoutCopy(language: string): HandoutCopy {
  const code = language.toLowerCase().split("-")[0];
  return COPY[code] ?? COPY.en;
}

export function questionsHeading(language: string): string {
  const code = language.toLowerCase().split("-")[0];
  const headings: Record<string, string> = {
    en: "Questions to ask",
    es: "Preguntas para hacer",
    vi: "Câu hỏi nên hỏi",
    ko: "물어볼 질문",
    zh: "可以问的问题",
    ht: "Kesyon pou poze",
  };
  return headings[code] ?? headings.en;
}
