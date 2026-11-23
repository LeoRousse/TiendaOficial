import learningPaths from './learningPaths.js';

export const diagnosticQuestions = [
  {
    id: 'goal',
    title: '¿Qué querés construir?',
    options: [
      { value: 'web', label: 'Sitios y aplicaciones web' },
      { value: 'ai', label: 'Aplicaciones y agentes de IA' },
      { value: 'cloud', label: 'Sistemas escalables en la nube' },
      { value: 'design', label: 'Interfaces y experiencias visuales' },
    ],
  },
  {
    id: 'time',
    title: '¿Cuánto tiempo tenés por semana?',
    options: [
      { value: '1-3', label: 'Hasta 3 horas' },
      { value: '4-7', label: 'Entre 4 y 7 horas' },
      { value: '8+', label: '8 horas o más' },
    ],
  },
  {
    id: 'level',
    title: '¿Cuál es tu nivel?',
    options: [
      { value: 'beginner', label: 'Estoy empezando' },
      { value: 'intermediate', label: 'Ya tengo algunas bases' },
      { value: 'advanced', label: 'Tengo experiencia' },
    ],
  },
];

const individualRecommendations = {
  web: {
    beginner: '4KPZIEGZ6lj7hzjf7gLM',
    intermediate: 'S9EVaISnr66gUfJO61mx',
    advanced: 'gVdLhdDDS7Z9fMat6oqK',
  },
  ai: {
    beginner: 'fhNpzoaF9oAzKj0i4UbB',
    intermediate: 'SrQqeMtpIr5aOrZieV2V',
    advanced: 'SrQqeMtpIr5aOrZieV2V',
  },
  cloud: {
    beginner: 'Bvx7NxtkST5tt3swtRta',
    intermediate: 'Bvx7NxtkST5tt3swtRta',
    advanced: 'Bvx7NxtkST5tt3swtRta',
  },
  design: {
    beginner: 'n6M1VbobalKiz2u7fkcn',
    intermediate: 'RksdG03mr42P8uwTi6rf',
    advanced: 'ZWk64kAGeSA4TMCB7yIa',
  },
};

const fallbackKeywords = {
  web: ['javascript', 'react', 'full stack'],
  ai: ['agente', 'langchain', 'python', 'inteligencia artificial'],
  cloud: ['cloud', 'arquitectura', 'sistemas escalables'],
  design: ['ux/ui', 'photoshop', 'spline', 'diseño gráfico'],
};

export const bundleDiscountPercent = 15;

export function getDiagnosticResult(answers, products) {
  const productById = new Map(products.map((product) => [product.id, product]));
  const recommendationId = individualRecommendations[answers.goal]?.[answers.level];
  const recommendation = productById.get(recommendationId)
    || products.find((product) => {
      const name = product.name?.toLowerCase() || '';
      return fallbackKeywords[answers.goal]?.some((keyword) => name.includes(keyword));
    })
    || null;

  const eligiblePathId = answers.time === '8+'
    ? answers.goal === 'web'
      ? 'full-stack'
      : ['ai', 'cloud'].includes(answers.goal)
        ? 'ia-cloud'
        : null
    : null;
  const path = learningPaths.find((item) => item.id === eligiblePathId);
  const bundleCourses = path
    ? path.courses.map((course) => productById.get(course.id))
    : [];
  const bundle = bundleCourses.length > 0
    && bundleCourses.every((course) => course && Number(course.stock) > 0)
    ? { ...path, courses: bundleCourses }
    : null;

  return { recommendation, bundle };
}
