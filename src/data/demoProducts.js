import { courseMetadataById } from './courseMetadata.js';

const stockStorageKey = 'tienda-quiroga-fallback-stock-v2';

export const demoProducts = [
  {
    id: '4KPZIEGZ6lj7hzjf7gLM',
    name: 'Curso de JavaScript Moderno',
    category: 'programming',
    description: 'Domina JavaScript moderno, asincronía y el DOM con proyectos prácticos.',
    price: 149.99,
    stock: 8,
    level: 'Todos los niveles',
    img: 'https://images.unsplash.com/photo-1627398242454-45a1465c2479?auto=format&fit=crop&w=700&q=80',
  },
  {
    id: 'S9EVaISnr66gUfJO61mx',
    name: 'Curso de React para Principiantes',
    category: 'programming',
    description: 'Aprende componentes, hooks y crea una aplicación completa con React.',
    price: 89.99,
    stock: 8,
    level: 'Principiante',
    img: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&w=700&q=80',
  },
  {
    id: 'gVdLhdDDS7Z9fMat6oqK',
    name: 'Curso de Desarrollo Web Full Stack',
    category: 'programming',
    description: 'Construye aplicaciones web completas con frontend, backend y bases de datos.',
    price: 199.99,
    stock: 8,
    level: 'Intermedio',
    img: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=700&q=80',
  },
  {
    id: 'SrQqeMtpIr5aOrZieV2V',
    name: 'Desarrollo de Agentes de IA y Flujos con LangChain y Python',
    category: 'programming',
    description: 'Diseña agentes y flujos de inteligencia artificial con Python y LangChain.',
    price: 179.99,
    stock: 8,
    level: 'Intermedio',
    img: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=700&q=80',
  },
  {
    id: 'Bvx7NxtkST5tt3swtRta',
    name: 'Diseño de Sistemas Escalables y Arquitectura Cloud',
    category: 'programming',
    description: 'Diseña sistemas cloud escalables, resilientes y preparados para crecer.',
    price: 189.99,
    stock: 8,
    level: 'Avanzado',
    img: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=700&q=80',
  },
  {
    id: 'RksdG03mr42P8uwTi6rf',
    name: 'Curso de Diseño Gráfico con Photoshop',
    category: 'design',
    description: 'Crea composiciones visuales y proyectos gráficos con Photoshop.',
    price: 79.99,
    stock: 8,
    level: 'Principiante',
    img: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=700&q=80',
  },
  {
    id: 'ZWk64kAGeSA4TMCB7yIa',
    name: 'Diseño Web 3D Interactivo con Spline y React',
    category: 'design',
    description: 'Integra escenas 3D interactivas y experiencias visuales en proyectos web.',
    price: 119.99,
    stock: 8,
    level: 'Intermedio',
    img: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=700&q=80',
  },
  {
    id: 'fhNpzoaF9oAzKj0i4UbB',
    name: 'Curso de Python para Principiantes',
    category: 'programming',
    description: 'Aprende los fundamentos de Python y crea tus primeros proyectos.',
    price: 89.99,
    stock: 8,
    level: 'Principiante',
    img: 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?auto=format&fit=crop&w=700&q=80',
  },
  {
    id: 'n6M1VbobalKiz2u7fkcn',
    name: 'Curso de UX/UI Design',
    category: 'design',
    description: 'Investiga necesidades, prototipa y diseña interfaces centradas en las personas.',
    price: 99.99,
    stock: 8,
    level: 'Todos los niveles',
    img: 'https://images.unsplash.com/photo-1559028012-481c04fa702d?auto=format&fit=crop&w=700&q=80',
  },
].map((product) => ({ ...product, ...courseMetadataById[product.id] }));

export const getDemoStock = () => {
  const defaultStock = Object.fromEntries(demoProducts.map((product) => [product.id, product.stock]));
  try {
    const saved = JSON.parse(localStorage.getItem(stockStorageKey));
    return saved && typeof saved === 'object' ? { ...defaultStock, ...saved } : defaultStock;
  } catch {
    return defaultStock;
  }
};

export const getDemoProducts = () => {
  const stock = getDemoStock();
  return demoProducts.map((product) => ({ ...product, stock: stock[product.id] ?? 0 }));
};
