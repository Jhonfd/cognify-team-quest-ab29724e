export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

export interface QuizCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  questions: QuizQuestion[];
}

export const quizCategories: QuizCategory[] = [
  {
    id: 'algebra',
    name: 'Álgebra',
    icon: '📐',
    description: 'Ecuaciones, funciones y expresiones algebraicas',
    questions: [
      { question: '¿Cuál es la derivada de x²?', options: ['x', '2x', '2', 'x²'], correctIndex: 1 },
      { question: '¿Cuánto es √144?', options: ['10', '11', '12', '14'], correctIndex: 2 },
      { question: '¿Cuál es el valor de π redondeado a dos decimales?', options: ['3.12', '3.14', '3.16', '3.18'], correctIndex: 1 },
      { question: '¿Cuánto es 7! (7 factorial)?', options: ['720', '5040', '40320', '362880'], correctIndex: 1 },
      { question: '¿Cuál es la integral de 2x dx?', options: ['x²', 'x² + C', '2x² + C', 'x + C'], correctIndex: 1 },
      { question: 'Si f(x) = 3x + 2, ¿cuánto es f(5)?', options: ['15', '17', '13', '20'], correctIndex: 1 },
      { question: '¿Cuál es la solución de 2x - 6 = 0?', options: ['2', '3', '6', '-3'], correctIndex: 1 },
      { question: '¿Cuánto es log₁₀(1000)?', options: ['2', '3', '4', '10'], correctIndex: 1 },
    ],
  },
  {
    id: 'geometry',
    name: 'Geometría',
    icon: '📏',
    description: 'Figuras, áreas, volúmenes y teoremas',
    questions: [
      { question: '¿Cuántos grados tiene un triángulo?', options: ['90°', '180°', '270°', '360°'], correctIndex: 1 },
      { question: '¿Cuál es el área de un círculo de radio 3?', options: ['6π', '9π', '12π', '3π'], correctIndex: 1 },
      { question: '¿Cuántas caras tiene un cubo?', options: ['4', '6', '8', '12'], correctIndex: 1 },
      { question: '¿Cuál es la fórmula del área de un triángulo?', options: ['a × b', '(b × h) / 2', 'π × r²', '2πr'], correctIndex: 1 },
      { question: 'En un triángulo rectángulo, ¿cómo se llama el lado más largo?', options: ['Cateto', 'Hipotenusa', 'Base', 'Altura'], correctIndex: 1 },
      { question: '¿Cuántos lados tiene un hexágono?', options: ['5', '6', '7', '8'], correctIndex: 1 },
      { question: '¿Cuál es el volumen de un cubo de lado 4?', options: ['16', '48', '64', '256'], correctIndex: 2 },
      { question: '¿Cuántos grados tiene un ángulo recto?', options: ['45°', '60°', '90°', '180°'], correctIndex: 2 },
    ],
  },
  {
    id: 'physics',
    name: 'Física',
    icon: '⚡',
    description: 'Mecánica, energía, fuerzas y movimiento',
    questions: [
      { question: '¿Cuál es la unidad SI de fuerza?', options: ['Joule', 'Watt', 'Newton', 'Pascal'], correctIndex: 2 },
      { question: '¿Cuál es la velocidad de la luz en m/s?', options: ['3×10⁶', '3×10⁸', '3×10¹⁰', '3×10¹²'], correctIndex: 1 },
      { question: '¿Qué ley de Newton dice F = ma?', options: ['Primera', 'Segunda', 'Tercera', 'Cuarta'], correctIndex: 1 },
      { question: '¿Cuál es la aceleración de la gravedad en la Tierra?', options: ['8.9 m/s²', '9.8 m/s²', '10.2 m/s²', '11.0 m/s²'], correctIndex: 1 },
      { question: '¿Qué tipo de energía tiene un objeto en movimiento?', options: ['Potencial', 'Cinética', 'Térmica', 'Nuclear'], correctIndex: 1 },
      { question: '¿En qué unidad se mide la potencia?', options: ['Newton', 'Joule', 'Watt', 'Voltio'], correctIndex: 2 },
      { question: '¿Qué instrumento mide la presión atmosférica?', options: ['Termómetro', 'Barómetro', 'Amperímetro', 'Voltímetro'], correctIndex: 1 },
      { question: '¿Cuál es la fórmula de la energía cinética?', options: ['mgh', '½mv²', 'Fd', 'P×t'], correctIndex: 1 },
    ],
  },
  {
    id: 'chemistry',
    name: 'Química',
    icon: '🧪',
    description: 'Elementos, reacciones y estructura atómica',
    questions: [
      { question: '¿Cuál es el número atómico del carbono?', options: ['4', '6', '8', '12'], correctIndex: 1 },
      { question: '¿Cuál es la fórmula química del agua?', options: ['CO₂', 'H₂O', 'NaCl', 'O₂'], correctIndex: 1 },
      { question: '¿Qué partícula subatómica tiene carga negativa?', options: ['Protón', 'Neutrón', 'Electrón', 'Fotón'], correctIndex: 2 },
      { question: '¿Cuál es el símbolo del oro?', options: ['Ag', 'Au', 'Fe', 'Cu'], correctIndex: 1 },
      { question: '¿Cuántos elementos tiene la tabla periódica actualmente?', options: ['108', '112', '118', '120'], correctIndex: 2 },
      { question: '¿Qué gas es esencial para la respiración?', options: ['Nitrógeno', 'Oxígeno', 'CO₂', 'Hidrógeno'], correctIndex: 1 },
      { question: '¿Cuál es el pH del agua pura?', options: ['5', '7', '9', '14'], correctIndex: 1 },
      { question: '¿Qué tipo de enlace comparten los átomos de NaCl?', options: ['Covalente', 'Iónico', 'Metálico', 'Puente de hidrógeno'], correctIndex: 1 },
    ],
  },
  {
    id: 'biology',
    name: 'Biología',
    icon: '🧬',
    description: 'Células, genética y organismos vivos',
    questions: [
      { question: '¿Qué orgánulo es la "central energética" de la célula?', options: ['Núcleo', 'Ribosoma', 'Mitocondria', 'Lisosoma'], correctIndex: 2 },
      { question: '¿Cuántos cromosomas tiene el ser humano?', options: ['23', '44', '46', '48'], correctIndex: 2 },
      { question: '¿Qué molécula almacena la información genética?', options: ['ARN', 'ADN', 'ATP', 'Proteína'], correctIndex: 1 },
      { question: '¿Cuál es el proceso por el que las plantas producen oxígeno?', options: ['Respiración', 'Fotosíntesis', 'Fermentación', 'Osmosis'], correctIndex: 1 },
      { question: '¿Qué planeta es conocido como el planeta rojo?', options: ['Venus', 'Júpiter', 'Marte', 'Saturno'], correctIndex: 2 },
      { question: '¿Cuál es la unidad básica de la vida?', options: ['Átomo', 'Molécula', 'Célula', 'Tejido'], correctIndex: 2 },
      { question: '¿Qué tipo de célula no tiene núcleo?', options: ['Eucariota', 'Procariota', 'Animal', 'Vegetal'], correctIndex: 1 },
      { question: '¿Qué vitamina produce el cuerpo con la luz solar?', options: ['A', 'B12', 'C', 'D'], correctIndex: 3 },
    ],
  },
  {
    id: 'astronomy',
    name: 'Astronomía',
    icon: '🌌',
    description: 'Planetas, estrellas y el universo',
    questions: [
      { question: '¿Cuál es el planeta más grande del sistema solar?', options: ['Saturno', 'Júpiter', 'Neptuno', 'Urano'], correctIndex: 1 },
      { question: '¿Cuántos planetas tiene el sistema solar?', options: ['7', '8', '9', '10'], correctIndex: 1 },
      { question: '¿Qué estrella está más cerca de la Tierra?', options: ['Sirio', 'Alfa Centauri', 'El Sol', 'Betelgeuse'], correctIndex: 2 },
      { question: '¿Cuánto tarda la Tierra en dar una vuelta al Sol?', options: ['30 días', '180 días', '365 días', '400 días'], correctIndex: 2 },
      { question: '¿Qué planeta tiene anillos más visibles?', options: ['Júpiter', 'Saturno', 'Urano', 'Neptuno'], correctIndex: 1 },
      { question: '¿Cómo se llama nuestra galaxia?', options: ['Andrómeda', 'Vía Láctea', 'Magallanes', 'Sombrero'], correctIndex: 1 },
      { question: '¿Qué es un agujero negro?', options: ['Una estrella fría', 'Un vacío sin gravedad', 'Una región de gravedad extrema', 'Un planeta oscuro'], correctIndex: 2 },
      { question: '¿Cuál es el planeta más cercano al Sol?', options: ['Venus', 'Mercurio', 'Marte', 'Tierra'], correctIndex: 1 },
    ],
  },
  {
    id: 'computing',
    name: 'Sistemas & Computación',
    icon: '💻',
    description: 'Redes, programación, hardware y sistemas operativos',
    questions: [
      { question: '¿Cuántos bits tiene un byte?', options: ['4', '8', '16', '32'], correctIndex: 1 },
      { question: '¿Qué significa CPU?', options: ['Central Processing Unit', 'Computer Personal Unit', 'Central Program Utility', 'Core Processing Unit'], correctIndex: 0 },
      { question: '¿Cuál es el sistema numérico que usa la computadora?', options: ['Decimal', 'Octal', 'Binario', 'Hexadecimal'], correctIndex: 2 },
      { question: '¿Qué protocolo se usa para enviar correos electrónicos?', options: ['HTTP', 'FTP', 'SMTP', 'TCP'], correctIndex: 2 },
      { question: '¿Qué capa del modelo OSI maneja direcciones IP?', options: ['Enlace de datos', 'Red', 'Transporte', 'Aplicación'], correctIndex: 1 },
      { question: '¿Qué tipo de memoria es volátil?', options: ['ROM', 'SSD', 'RAM', 'HDD'], correctIndex: 2 },
      { question: '¿Cuál es la complejidad de una búsqueda binaria?', options: ['O(n)', 'O(log n)', 'O(n²)', 'O(1)'], correctIndex: 1 },
      { question: '¿Qué sistema operativo es de código abierto?', options: ['Windows', 'macOS', 'Linux', 'iOS'], correctIndex: 2 },
    ],
  },
];
