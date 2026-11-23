export const courseMetadataById = Object.freeze({
  '4KPZIEGZ6lj7hzjf7gLM': {
    durationHours: 24,
    modulesCount: 12,
    rating: 4.9,
    highlights: ['JavaScript moderno y ES6+', 'DOM y asincronía', 'Proyecto práctico'],
    previewLesson: { title: 'Fundamentos de JavaScript', content: 'Conoce variables, tipos de datos y operadores con ejercicios breves.' },
  },
  S9EVaISnr66gUfJO61mx: {
    durationHours: 18,
    modulesCount: 10,
    rating: 4.8,
    highlights: ['Componentes y props', 'Hooks esenciales', 'Aplicación completa'],
    previewLesson: { title: 'Componentes y JSX', content: 'Estructura interfaces con componentes reutilizables y JSX.' },
  },
  gVdLhdDDS7Z9fMat6oqK: {
    durationHours: 40,
    modulesCount: 18,
    rating: 4.9,
    highlights: ['Frontend y backend', 'APIs y bases de datos', 'Despliegue de proyectos'],
    previewLesson: { title: 'Fundamentos de aplicaciones web', content: 'Comprende la estructura cliente-servidor y el flujo de una aplicación web.' },
  },
  SrQqeMtpIr5aOrZieV2V: {
    durationHours: 32,
    modulesCount: 15,
    rating: 4.9,
    highlights: ['Agentes con Python', 'Flujos con LangChain', 'Integración de modelos de IA'],
    previewLesson: { title: 'Fundamentos con Python', content: 'Explora las estructuras de Python que se usan en flujos de IA.' },
  },
  Bvx7NxtkST5tt3swtRta: {
    durationHours: 28,
    modulesCount: 14,
    rating: 4.8,
    highlights: ['Arquitectura distribuida', 'Escalabilidad y resiliencia', 'Servicios cloud'],
    previewLesson: { title: 'Fundamentos de arquitectura cloud', content: 'Identifica componentes y responsabilidades de una arquitectura en la nube.' },
  },
  RksdG03mr42P8uwTi6rf: {
    durationHours: 16,
    modulesCount: 9,
    rating: 4.7,
    highlights: ['Herramientas de Photoshop', 'Composición y retoque', 'Proyecto visual'],
    previewLesson: { title: 'Espacio de trabajo', content: 'Conoce herramientas y organización de documentos en Photoshop.' },
  },
  ZWk64kAGeSA4TMCB7yIa: {
    durationHours: 20,
    modulesCount: 11,
    rating: 4.8,
    highlights: ['Escenas 3D interactivas', 'Diseño con Spline', 'Integración con React'],
    previewLesson: { title: 'Escenas 3D con Spline', content: 'Construye y organiza escenas tridimensionales para la web.' },
  },
  fhNpzoaF9oAzKj0i4UbB: {
    durationHours: 20,
    modulesCount: 10,
    rating: 4.8,
    highlights: ['Fundamentos de Python', 'Automatización práctica', 'Primeros proyectos'],
    previewLesson: { title: 'Sintaxis y datos', content: 'Trabaja con variables, tipos de datos y expresiones en Python.' },
  },
  n6M1VbobalKiz2u7fkcn: {
    durationHours: 22,
    modulesCount: 12,
    rating: 4.8,
    highlights: ['Investigación UX', 'Prototipado UI', 'Diseño centrado en usuarios'],
    previewLesson: { title: 'Necesidades de las personas', content: 'Identifica usuarios, objetivos y necesidades para orientar un diseño.' },
  },
});

export function withCourseMetadata(course) {
  return { ...course, ...(courseMetadataById[course.id] || {}) };
}
