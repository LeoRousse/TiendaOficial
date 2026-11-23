const courses = [
  {
    id: '4KPZIEGZ6lj7hzjf7gLM',
    name: 'Curso de JavaScript Moderno',
    priceUsd: 149.99,
  },
  {
    id: 'S9EVaISnr66gUfJO61mx',
    name: 'Curso de React para Principiantes',
    priceUsd: 89.99,
  },
  {
    id: 'gVdLhdDDS7Z9fMat6oqK',
    name: 'Curso de Desarrollo Web Full Stack',
    priceUsd: 199.99,
  },
  {
    id: 'SrQqeMtpIr5aOrZieV2V',
    name: 'Desarrollo de Agentes de IA y Flujos con LangChain y Python',
    priceUsd: 179.99,
  },
  {
    id: 'Bvx7NxtkST5tt3swtRta',
    name: 'Diseño de Sistemas Escalables y Arquitectura Cloud',
    priceUsd: 189.99,
  },
  {
    id: 'RksdG03mr42P8uwTi6rf',
    name: 'Curso de Diseño Gráfico con Photoshop',
    priceUsd: 79.99,
  },
  {
    id: 'ZWk64kAGeSA4TMCB7yIa',
    name: 'Diseño Web 3D Interactivo con Spline y React',
    priceUsd: 119.99,
  },
  {
    id: 'fhNpzoaF9oAzKj0i4UbB',
    name: 'Curso de Python para Principiantes',
    priceUsd: 89.99,
  },
  {
    id: 'n6M1VbobalKiz2u7fkcn',
    name: 'Curso de UX/UI Design',
    priceUsd: 99.99,
  },
];

export const catalog = Object.freeze(courses.map((course) => Object.freeze({
  ...course,
  priceUsd: Number(course.priceUsd),
})));

export const catalogById = new Map(catalog.map((course) => [course.id, course]));
