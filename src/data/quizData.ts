export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  subject: 'math' | 'science';
}

export const quizQuestions: QuizQuestion[] = [
  {
    question: '¿Cuál es la derivada de x²?',
    options: ['x', '2x', '2', 'x²'],
    correctIndex: 1,
    subject: 'math',
  },
  {
    question: '¿Cuál es el número atómico del carbono?',
    options: ['4', '6', '8', '12'],
    correctIndex: 1,
    subject: 'science',
  },
  {
    question: '¿Cuánto es √144?',
    options: ['10', '11', '12', '14'],
    correctIndex: 2,
    subject: 'math',
  },
  {
    question: '¿Qué planeta es conocido como el planeta rojo?',
    options: ['Venus', 'Júpiter', 'Marte', 'Saturno'],
    correctIndex: 2,
    subject: 'science',
  },
  {
    question: '¿Cuál es el valor de π redondeado a dos decimales?',
    options: ['3.12', '3.14', '3.16', '3.18'],
    correctIndex: 1,
    subject: 'math',
  },
  {
    question: '¿Cuál es la fórmula química del agua?',
    options: ['CO₂', 'H₂O', 'NaCl', 'O₂'],
    correctIndex: 1,
    subject: 'science',
  },
  {
    question: '¿Cuánto es 7! (7 factorial)?',
    options: ['720', '5040', '40320', '362880'],
    correctIndex: 1,
    subject: 'math',
  },
  {
    question: '¿Cuál es la unidad SI de fuerza?',
    options: ['Joule', 'Watt', 'Newton', 'Pascal'],
    correctIndex: 2,
    subject: 'science',
  },
  {
    question: '¿Cuál es la integral de 2x dx?',
    options: ['x²', 'x² + C', '2x² + C', 'x + C'],
    correctIndex: 1,
    subject: 'math',
  },
  {
    question: '¿Qué partícula subatómica tiene carga negativa?',
    options: ['Protón', 'Neutrón', 'Electrón', 'Fotón'],
    correctIndex: 2,
    subject: 'science',
  },
];
