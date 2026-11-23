export const courseContentById = Object.freeze({
  '4KPZIEGZ6lj7hzjf7gLM': {
    description: 'Fundamentos y herramientas modernas de JavaScript para construir aplicaciones web.',
    lessons: [
      { id: 'javascript-fundamentals', title: 'Fundamentos de JavaScript', content: 'Variables, tipos de datos, operadores y control de flujo.' },
      { id: 'javascript-functions-arrays', title: 'Funciones y arreglos', content: 'Funciones, métodos de arreglos y transformación de colecciones.' },
      { id: 'javascript-dom-events', title: 'Interacción con la página', content: 'Eventos del navegador y actualización de contenido de una página.' },
    ],
  },
  S9EVaISnr66gUfJO61mx: {
    description: 'Introducción a React para crear interfaces con componentes y estado.',
    lessons: [
      { id: 'react-components', title: 'Componentes y JSX', content: 'Estructura interfaces con componentes reutilizables y JSX.' },
      { id: 'react-props', title: 'Props y composición', content: 'Comunica componentes mediante props y compón vistas reutilizables.' },
      { id: 'react-state-events', title: 'Estado y eventos', content: 'Usa estado y eventos para responder a las acciones del usuario.' },
    ],
  },
  gVdLhdDDS7Z9fMat6oqK: {
    description: 'Desarrollo de aplicaciones web completas con herramientas de frontend y backend.',
    lessons: [
      { id: 'fullstack-web-foundations', title: 'Fundamentos de aplicaciones web', content: 'Comprende la estructura cliente-servidor y el flujo de una aplicación web.' },
      { id: 'fullstack-apis', title: 'Servicios y APIs', content: 'Organiza endpoints y el intercambio de datos entre cliente y servidor.' },
      { id: 'fullstack-app-integration', title: 'Integración de la aplicación', content: 'Conecta interfaz, servicios y persistencia en un flujo de aplicación.' },
    ],
  },
  SrQqeMtpIr5aOrZieV2V: {
    description: 'Diseño de agentes de IA y flujos de trabajo con LangChain y Python.',
    lessons: [
      { id: 'agents-python-foundations', title: 'Fundamentos con Python', content: 'Prepara los conceptos y estructuras de Python utilizados en flujos de IA.' },
      { id: 'agents-langchain', title: 'Flujos con LangChain', content: 'Organiza componentes y pasos de un flujo de trabajo con LangChain.' },
      { id: 'agents-tool-use', title: 'Agentes y herramientas', content: 'Diseña un agente que coordina instrucciones y herramientas disponibles.' },
    ],
  },
  Bvx7NxtkST5tt3swtRta: {
    description: 'Principios de arquitectura cloud y diseño de sistemas escalables.',
    lessons: [
      { id: 'cloud-architecture-basics', title: 'Fundamentos de arquitectura cloud', content: 'Identifica componentes y responsabilidades de una arquitectura en la nube.' },
      { id: 'cloud-scalability', title: 'Escalabilidad y resiliencia', content: 'Aplica conceptos de escalado, disponibilidad y tolerancia a fallos.' },
      { id: 'cloud-system-design', title: 'Diseño de sistemas', content: 'Evalúa decisiones de arquitectura según las necesidades de un sistema.' },
    ],
  },
  RksdG03mr42P8uwTi6rf: {
    description: 'Introducción al diseño gráfico y herramientas de Adobe Photoshop.',
    lessons: [
      { id: 'photoshop-workspace', title: 'Espacio de trabajo', content: 'Conoce el área de trabajo, herramientas y organización de documentos.' },
      { id: 'photoshop-layers', title: 'Capas y composición', content: 'Organiza elementos visuales y construye composiciones con capas.' },
      { id: 'photoshop-image-editing', title: 'Edición de imágenes', content: 'Aplica ajustes y prepara imágenes para distintos usos.' },
    ],
  },
  ZWk64kAGeSA4TMCB7yIa: {
    description: 'Creación de experiencias web 3D interactivas con Spline y React.',
    lessons: [
      { id: 'spline-3d-scenes', title: 'Escenas 3D con Spline', content: 'Construye y organiza escenas tridimensionales en Spline.' },
      { id: 'spline-interactions', title: 'Interacciones 3D', content: 'Configura interacciones para dar respuesta a las acciones del visitante.' },
      { id: 'spline-react-integration', title: 'Integración con React', content: 'Incorpora una experiencia de Spline en una interfaz React.' },
    ],
  },
  fhNpzoaF9oAzKj0i4UbB: {
    description: 'Conceptos iniciales de programación y resolución de problemas con Python.',
    lessons: [
      { id: 'python-syntax', title: 'Sintaxis y datos', content: 'Trabaja con variables, tipos de datos y expresiones en Python.' },
      { id: 'python-control-flow', title: 'Condiciones y ciclos', content: 'Controla la ejecución con condicionales y estructuras repetitivas.' },
      { id: 'python-functions', title: 'Funciones y colecciones', content: 'Organiza código con funciones y colecciones básicas.' },
    ],
  },
  n6M1VbobalKiz2u7fkcn: {
    description: 'Principios de experiencia e interfaz de usuario para productos digitales.',
    lessons: [
      { id: 'uxui-user-needs', title: 'Necesidades de las personas', content: 'Identifica usuarios, objetivos y necesidades para orientar un diseño.' },
      { id: 'uxui-wireframes', title: 'Flujos y wireframes', content: 'Representa recorridos y estructura pantallas con wireframes.' },
      { id: 'uxui-interface-design', title: 'Diseño de interfaces', content: 'Aplica jerarquía visual y consistencia en interfaces digitales.' },
    ],
  },
});

export const learningPaths = Object.freeze([
  {
    id: 'full-stack',
    title: 'Ruta Full Stack',
    description: 'Avanza desde JavaScript moderno hasta la creación de aplicaciones web completas.',
    courseIds: ['4KPZIEGZ6lj7hzjf7gLM', 'S9EVaISnr66gUfJO61mx', 'gVdLhdDDS7Z9fMat6oqK'],
  },
  {
    id: 'ia-cloud',
    title: 'Ruta IA & Cloud',
    description: 'Combina el desarrollo de agentes de IA con fundamentos de arquitectura cloud escalable.',
    courseIds: ['SrQqeMtpIr5aOrZieV2V', 'Bvx7NxtkST5tt3swtRta'],
  },
]);
